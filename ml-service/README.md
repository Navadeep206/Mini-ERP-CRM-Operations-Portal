# Mini ERM ML Service (Demand Forecasting & Inventory Risk Prediction)

This service handles machine learning operations (demand forecasting and inventory risk prediction) for the AI-Powered Mini ERM system.

## 🚀 Setup & Execution

### 1. Environment Setup
The service uses Python 3.10+ and a virtual environment.

```bash
# Activate the virtual environment
source venv/bin/activate

# Install dependencies (to be run during Phase 2)
pip install -r requirements.txt
```

### 2. Run the Service (FastAPI)
To run the server in development mode:
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## 🛠 Planned API Endpoints

### 1. Forecast Demand
* **Path**: `POST /forecast`
* **Purpose**: Generates dynamic sales demand forecasts for a product.
* **Payload**:
  ```json
  {
    "productId": "uuid-string-here",
    "daysToForecast": 30
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "productId": "uuid-string-here",
    "forecast": [
      { "date": "2026-08-23", "forecastedQuantityed": 12.5 },
      { "date": "2026-08-24", "forecastedQuantityed": 14.1 }
    ]
  }
  ```

### 2. Inventory Risk Analysis
* **Path**: `POST /inventory-risk`
* **Purpose**: Classifies inventory runout and stockout risks based on current stock, minimum stock safety threshold, and forecasted demand.
* **Payload**:
  ```json
  {
    "productId": "uuid-string-here"
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "productId": "uuid-string-here",
    "riskLevel": "HIGH", // HIGH, MEDIUM, LOW
    "daysToStockout": 5,
    "currentStock": 10,
    "minimumStockSafety": 15
  }
  ```
