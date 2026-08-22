import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services';

class ForecastControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ForecastControllerError.prototype);
  }
}

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

// Helper to group historical sales items weekly in JS/TS for predictions and fallback
function groupSalesWeekly(items: { quantity: number; date: Date }[]): { date: string; quantity: number }[] {
  if (items.length === 0) return [];

  // Group by week starting on Monday
  const weeklyMap = new Map<string, number>();

  items.forEach(item => {
    const d = new Date(item.date);
    // Find the Monday of the week
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
    const dateStr = monday.toISOString().split('T')[0];

    const current = weeklyMap.get(dateStr) || 0;
    weeklyMap.set(dateStr, current + item.quantity);
  });

  // Sort chronologically
  const sortedDates = Array.from(weeklyMap.keys()).sort();
  if (sortedDates.length === 0) return [];

  // Fill in any gaps between dates with 0.0 sales (correct business/data semantics)
  const result: { date: string; quantity: number }[] = [];
  const start = new Date(sortedDates[0]);
  const end = new Date(sortedDates[sortedDates.length - 1]);

  let current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      quantity: weeklyMap.get(dateStr) || 0,
    });
    current.setUTCDate(current.getUTCDate() + 7); // Increment by 1 week
  }

  return result;
}

// 1. POST /api/forecast/train - Trigger model training pipeline (ADMIN only)
export const triggerTrain = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Fetch confirmed sales challan items
    const salesItems = await prisma.salesChallanItem.findMany({
      where: {
        challan: {
          status: 'CONFIRMED'
        }
      },
      select: {
        productId: true,
        quantity: true,
        challan: {
          select: {
            createdAt: true
          }
        }
      }
    });

    if (salesItems.length === 0) {
      throw new ForecastControllerError('No confirmed sales challan records found to train the model', 400);
    }

    // Format for Python FastAPI service
    const payload = {
      sales: salesItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        date: item.challan.createdAt.toISOString()
      }))
    };

    // 2. Call ML microservice
    try {
      const mlRes = await fetch(`${ML_SERVICE_URL}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!mlRes.ok) {
        const errorText = await mlRes.text();
        throw new ForecastControllerError(`ML service training failed: ${errorText}`, mlRes.status);
      }

      const mlData = await mlRes.json();
      res.status(200).json(mlData);
    } catch (err: any) {
      // Return 502 Bad Gateway if ML service is unreachable
      return next(new ForecastControllerError(`Forecasting ML service is unreachable at ${ML_SERVICE_URL}. Technical cause: ${err.message}`, 502));
    }
  } catch (error) {
    next(error);
  }
};

// 2. GET /api/forecast/:productId - Fetch forecast predictions
export const getProductForecast = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productId } = req.params;
    const horizon = parseInt(req.query.horizon as string, 10) || 4; // defaults to 4 weeks

    if (horizon <= 0 || horizon > 12) {
      throw new ForecastControllerError('Forecast horizon parameter must be between 1 and 12 weeks', 400);
    }

    // Verify product exists in database
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new ForecastControllerError('Product not found in the catalog directory', 404);
    }

    // Fetch confirmed sales items chronologically
    const salesItems = await prisma.salesChallanItem.findMany({
      where: {
        productId,
        challan: {
          status: 'CONFIRMED'
        }
      },
      select: {
        quantity: true,
        challan: {
          select: {
            createdAt: true
          }
        }
      },
      orderBy: {
        challan: {
          createdAt: 'asc'
        }
      }
    });

    // Group weekly
    const history = groupSalesWeekly(
      salesItems.map(i => ({ quantity: i.quantity, date: i.challan.createdAt }))
    );

    // Enforce safety limits: if weekly observations are insufficient, flag status early
    const minRequiredWeeks = 4;
    if (history.length < minRequiredWeeks) {
      res.status(200).json({
        success: true,
        productId,
        status: 'INSUFFICIENT_HISTORY',
        forecast: [],
        message: 'This product does not have enough historical sales data to generate a reliable forecast (needs at least 4 weeks of sales logs).'
      });
      return;
    }

    // Call ML service predict API
    try {
      const mlRes = await fetch(`${ML_SERVICE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          history,
          horizon
        })
      });

      if (mlRes.ok) {
        const mlData = (await mlRes.json()) as any;
        res.status(200).json({
          success: true,
          history,
          ...mlData
        });
        return;
      }
      
      // If ML service fails with HTTP error, log it and fall back
      console.warn(`ML service predict returned status ${mlRes.status}. Triggering local fallback...`);
    } catch (err: any) {
      console.warn(`ML service predict unreachable at ${ML_SERVICE_URL}. Triggering local fallback... Technical error: ${err.message}`);
    }

    // LOCAL FALLBACK STRATEGY: Moving Average of last 4 weeks
    const lastObs = history.slice(-4);
    const avg = lastObs.reduce((acc, curr) => acc + curr.quantity, 0) / lastObs.length;
    const roundedAvg = Math.max(0, Number(avg.toFixed(2)));

    // Generate forecast dates
    const lastDate = new Date(history[history.length - 1].date);
    const forecast = [];

    for (let step = 1; step <= horizon; step++) {
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + (step * 7));
      forecast.push({
        date: nextDate.toISOString().split('T')[0],
        quantity: roundedAvg
      });
    }

    res.status(200).json({
      success: true,
      productId,
      status: 'FORECASTED',
      model_type: 'MOVING_AVERAGE_FALLBACK',
      horizon,
      history,
      forecast,
      best_metrics: { mae: 0, rmse: 0 },
      model_version: '1.0.0-fallback',
      generated_at: new Date().toISOString(),
      message: 'Predictions generated via local moving average fallback due to forecasting service offline.'
    });

  } catch (error) {
    next(error);
  }
};
