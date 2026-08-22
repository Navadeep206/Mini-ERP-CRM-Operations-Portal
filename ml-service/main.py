import os
import json
import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
import joblib
from xgboost import XGBRegressor

app = FastAPI(title="Mini ERM ML Demand Forecasting Service")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)
METADATA_PATH = os.path.join(MODELS_DIR, "model_metadata.json")

# Pydantic Schemas
class SaleTransaction(BaseModel):
    productId: str
    quantity: int
    date: str

class TrainRequest(BaseModel):
    sales: List[SaleTransaction]

class PredictRequest(BaseModel):
    productId: str
    history: List[Dict[str, Any]]  # List of {"date": "YYYY-MM-DD", "quantity": float}
    horizon: int  # Number of weeks to forecast

# Helper to load model metadata
def load_metadata() -> Dict[str, Any]:
    if os.path.exists(METADATA_PATH):
        try:
            with open(METADATA_PATH, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

# Helper to save model metadata
def save_metadata(metadata: Dict[str, Any]):
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

# Helper to prepare weekly aggregated time-series data for a product
def prepare_time_series(df_product: pd.DataFrame) -> pd.DataFrame:
    # Set date as index and aggregate weekly
    df_product = df_product.copy()
    df_product['date'] = pd.to_datetime(df_product['date'])
    df_product = df_product.set_index('date')
    
    # Resample to weekly start (e.g. Monday-based 'W-MON' or standard 'W')
    df_weekly = df_product['quantity'].resample('W-MON').sum().to_frame()
    df_weekly = df_weekly.rename(columns={'quantity': 'quantity_sold'})
    df_weekly = df_weekly.sort_index()
    
    return df_weekly

# Feature engineering helper: constructs lag and rolling values without future leakage
def build_features(df_weekly: pd.DataFrame) -> pd.DataFrame:
    df = df_weekly.copy()
    
    # Lags (in weeks)
    df['lag_1'] = df['quantity_sold'].shift(1)
    df['lag_2'] = df['quantity_sold'].shift(2)
    df['lag_3'] = df['quantity_sold'].shift(3)
    df['lag_4'] = df['quantity_sold'].shift(4)
    
    # Rolling averages (using lag_1 as baseline to prevent current-observation leakage)
    df['rolling_mean_2'] = df['lag_1'].rolling(window=2).mean()
    df['rolling_mean_4'] = df['lag_1'].rolling(window=4).mean()
    
    # Temporal features
    df['week_of_year'] = df.index.map(lambda x: x.isocalendar().week)
    df['month'] = df.index.month
    
    # Drop rows with NaN due to shift/rolling windows
    df = df.dropna()
    
    return df

# Evaluate forecasts using MAE and RMSE
def compute_metrics(y_true, y_pred) -> Dict[str, float]:
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    mae = float(np.mean(np.abs(y_true - y_pred)))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
    return {"mae": mae, "rmse": rmse}

@app.post("/train")
async def train_models(payload: TrainRequest):
    if not payload.sales:
        raise HTTPException(status_code=400, detail="Sales history transaction list is empty")
    
    # Load into pandas DataFrame
    df = pd.DataFrame([s.model_dump() for s in payload.sales])
    df['date'] = pd.to_datetime(df['date'])
    
    unique_products = df['productId'].unique()
    results = {}
    metadata = load_metadata()

    for pid in unique_products:
        df_prod = df[df['productId'] == pid]
        
        # Aggregate weekly
        df_weekly = prepare_time_series(df_prod)
        
        # Enforce minimum data length (need at least 8 weeks of history to compute lags and rolling windows)
        if len(df_weekly) < 8:
            results[pid] = {
                "status": "INSUFFICIENT_HISTORY",
                "weeks_available": len(df_weekly),
                "reason": "Needs at least 8 weeks of historical transaction logs to train forecasting model"
            }
            metadata[pid] = {
                "status": "INSUFFICIENT_HISTORY",
                "last_trained": datetime.datetime.now().isoformat(),
            }
            continue

        # Build feature dataset
        df_features = build_features(df_weekly)
        if len(df_features) < 4:
            results[pid] = {
                "status": "INSUFFICIENT_HISTORY",
                "weeks_available": len(df_weekly),
                "reason": "Not enough feature rows left after shift windowing"
            }
            continue

        # Chronological train/test split (75% Train, 25% Test)
        split_idx = int(len(df_features) * 0.75)
        train_df = df_features.iloc[:split_idx]
        test_df = df_features.iloc[split_idx:]
        
        if len(test_df) == 0:
            # Fallback to last row if data is extremely tight
            train_df = df_features.iloc[:-1]
            test_df = df_features.iloc[-1:]

        feature_cols = ['lag_1', 'lag_2', 'lag_3', 'lag_4', 'rolling_mean_2', 'rolling_mean_4', 'week_of_year', 'month']
        
        X_train, y_train = train_df[feature_cols], train_df['quantity_sold']
        X_test, y_test = test_df[feature_cols], test_df['quantity_sold']

        # 1. Evaluate Baselines on Test Set
        # Baseline A: Naive (prediction = lag_1)
        naive_preds = X_test['lag_1'].values
        naive_metrics = compute_metrics(y_test, naive_preds)

        # Baseline B: Moving Average (prediction = rolling_mean_4)
        ma_preds = X_test['rolling_mean_4'].values
        ma_metrics = compute_metrics(y_test, ma_preds)

        # 2. Train XGBoost Regressor
        model = XGBRegressor(n_estimators=50, max_depth=3, learning_rate=0.1, random_state=42)
        model.fit(X_train, y_train)
        
        xgb_preds = model.predict(X_test)
        xgb_metrics = compute_metrics(y_test, xgb_preds)

        # 3. Model Selection: Choose the model with lowest MAE
        # Compare XGBoost MAE with Moving Average MAE
        selected_model_type = "XGBOOST"
        selected_metrics = xgb_metrics
        
        if ma_metrics['mae'] < xgb_metrics['mae']:
            selected_model_type = "MOVING_AVERAGE_BASELINE"
            selected_metrics = ma_metrics
        
        # Save model if XGBoost was selected
        model_filename = f"model_{pid}.joblib"
        model_path = os.path.join(MODELS_DIR, model_filename)
        
        if selected_model_type == "XGBOOST":
            joblib.dump(model, model_path)
            model_saved = True
        else:
            # Delete old binary if it exists
            if os.path.exists(model_path):
                os.remove(model_path)
            model_saved = False

        # Store product metadata
        product_meta = {
            "status": "VALIDATED",
            "model_type": selected_model_type,
            "saved_binary": model_saved,
            "last_trained": datetime.datetime.now().isoformat(),
            "data_range": {
                "start": df_weekly.index.min().isoformat(),
                "end": df_weekly.index.max().isoformat()
            },
            "weeks_count": len(df_weekly),
            "features": feature_cols,
            "metrics": {
                "xgb": xgb_metrics,
                "moving_average": ma_metrics,
                "naive": naive_metrics
            },
            "best_metrics": selected_metrics
        }
        
        metadata[pid] = product_meta
        results[pid] = {
            "status": "VALIDATED",
            "model_type": selected_model_type,
            "metrics": selected_metrics
        }

    save_metadata(metadata)
    return {
        "success": True,
        "message": "Model training completed",
        "results": results
    }

@app.post("/predict")
async def predict_demand(payload: PredictRequest):
    pid = payload.productId
    horizon = payload.horizon

    if horizon <= 0 or horizon > 12:
        raise HTTPException(status_code=400, detail="Forecast horizon must be between 1 and 12 weeks")

    # Load metadata
    metadata = load_metadata()
    prod_meta = metadata.get(pid)

    if not prod_meta or prod_meta.get("status") == "INSUFFICIENT_HISTORY":
        return {
            "productId": pid,
            "status": "INSUFFICIENT_HISTORY",
            "forecast": [],
            "message": "Product has insufficient history to generate a forecast."
        }

    model_type = prod_meta.get("model_type", "MOVING_AVERAGE_BASELINE")
    
    # Parse incoming history
    if not payload.history:
        raise HTTPException(status_code=400, detail="Recent history array is empty")

    df_hist = pd.DataFrame(payload.history)
    df_hist['date'] = pd.to_datetime(df_hist['date'])
    df_hist = df_hist.sort_values('date')
    
    # Aggregate weekly to guarantee week boundaries
    df_weekly = df_hist.set_index('date').resample('W-MON').sum() if 'date' in df_hist.columns else df_hist
    df_weekly = df_weekly.rename(columns={'quantity': 'quantity_sold'})
    
    # We need at least the last 4 weeks of observations to calculate lags and rolling averages
    if len(df_weekly) < 4:
        raise HTTPException(status_code=400, detail="Predict history must contain at least 4 contiguous weeks of sales data")

    # Set up prediction loop recursively
    forecast_results = []
    
    # Extract last dates and sales values
    current_series = df_weekly['quantity_sold'].tolist()
    last_date = df_weekly.index.max()

    # Load model if XGBoost
    model = None
    if model_type == "XGBOOST":
        model_path = os.path.join(MODELS_DIR, f"model_{pid}.joblib")
        if os.path.exists(model_path):
            try:
                model = joblib.load(model_path)
            except Exception:
                model_type = "MOVING_AVERAGE_BASELINE"  # fallback to baseline on load error
        else:
            model_type = "MOVING_AVERAGE_BASELINE"

    # Recursive prediction loop
    for step in range(1, horizon + 1):
        next_date = last_date + datetime.timedelta(weeks=step)
        
        # Calculate lag features from current_series (which holds actuals + predicted values)
        lag_1 = current_series[-1]
        lag_2 = current_series[-2]
        lag_3 = current_series[-3]
        lag_4 = current_series[-4]
        
        rolling_mean_2 = (lag_1 + lag_2) / 2.0
        rolling_mean_4 = (lag_1 + lag_2 + lag_3 + lag_4) / 4.0
        
        week_of_year = next_date.isocalendar().week
        month = next_date.month

        if model_type == "XGBOOST" and model is not None:
            # Construct features DataFrame matching training column order
            feat_df = pd.DataFrame([{
                'lag_1': lag_1,
                'lag_2': lag_2,
                'lag_3': lag_3,
                'lag_4': lag_4,
                'rolling_mean_2': rolling_mean_2,
                'rolling_mean_4': rolling_mean_4,
                'week_of_year': week_of_year,
                'month': month
            }])
            # Predict
            pred_val = float(model.predict(feat_df)[0])
            pred_val = max(0.0, pred_val)  # clamp to non-negative demand
        else:
            # Fallback to Moving Average baseline
            pred_val = float(rolling_mean_4)
            pred_val = max(0.0, pred_val)

        # Append prediction recursively to current_series for next step features
        current_series.append(pred_val)
        
        forecast_results.append({
            "date": next_date.strftime("%Y-%m-%d"),
            "quantity": float(round(pred_val, 2))
        })

    return {
        "productId": pid,
        "status": "FORECASTED",
        "model_type": model_type,
        "horizon": horizon,
        "forecast": forecast_results,
        "best_metrics": prod_meta.get("best_metrics"),
        "model_version": "1.0.0",
        "generated_at": datetime.datetime.now().isoformat()
    }
