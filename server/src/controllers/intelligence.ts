import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services';

class IntelligenceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, IntelligenceError.prototype);
  }
}

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

// Helper to group sales weekly (duplicated locally to prevent circular dependencies)
function groupSalesWeekly(items: { quantity: number; date: Date }[]): { date: string; quantity: number }[] {
  if (items.length === 0) return [];
  const weeklyMap = new Map<string, number>();

  items.forEach(item => {
    const d = new Date(item.date);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
    const dateStr = monday.toISOString().split('T')[0];

    const current = weeklyMap.get(dateStr) || 0;
    weeklyMap.set(dateStr, current + item.quantity);
  });

  const sortedDates = Array.from(weeklyMap.keys()).sort();
  if (sortedDates.length === 0) return [];

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
    current.setUTCDate(current.getUTCDate() + 7);
  }

  return result;
}

// Prediction helper: queries data and requests forecasting from ML service (or Moving Average fallback)
export async function getPredictionsHelper(productId: string, horizon: number): Promise<{
  status: 'FORECASTED' | 'INSUFFICIENT_HISTORY';
  model_type?: string;
  forecast: { date: string; quantity: number }[];
  history: { date: string; quantity: number }[];
}> {
  const salesItems = await prisma.salesChallanItem.findMany({
    where: { productId, challan: { status: 'CONFIRMED' } },
    select: { quantity: true, challan: { select: { createdAt: true } } },
    orderBy: { challan: { createdAt: 'asc' } }
  });

  const history = groupSalesWeekly(
    salesItems.map(i => ({ quantity: i.quantity, date: i.challan.createdAt }))
  );

  const minRequiredWeeks = 4;
  if (history.length < minRequiredWeeks) {
    return { status: 'INSUFFICIENT_HISTORY', forecast: [], history };
  }

  // Request predictions from Python ML Service
  try {
    const mlRes = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, history, horizon })
    });

    if (mlRes.ok) {
      const mlData = (await mlRes.json()) as any;
      return {
        status: 'FORECASTED',
        model_type: mlData.model_type,
        forecast: mlData.forecast || [],
        history
      };
    }
  } catch (err) {}

  // Fallback: Node.js 4-week Moving Average
  const lastObs = history.slice(-4);
  const avg = lastObs.reduce((acc, curr) => acc + curr.quantity, 0) / lastObs.length;
  const roundedAvg = Math.max(0, Number(avg.toFixed(2)));

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

  return {
    status: 'FORECASTED',
    model_type: 'MOVING_AVERAGE_FALLBACK',
    forecast,
    history
  };
}

// Projection and Risk logic evaluator
export function evaluateInventoryRisk(
  product: { id: string; name: string; currentStock: number; minimumStock: number },
  forecast: { date: string; quantity: number }[],
  horizon: number
) {
  let projectedStock = product.currentStock;
  const safetyStock = product.minimumStock;
  let potentialStockoutDate: string | null = null;
  const projectionLogs: { week: number; date: string; demand: number; expectedStock: number }[] = [];
  
  let totalPredictedDemand = 0;
  let safetyViolationWeek: number | null = null;
  let stockoutWeek: number | null = null;

  forecast.forEach((f, idx) => {
    const weekNumber = idx + 1;
    totalPredictedDemand += f.quantity;
    projectedStock -= f.quantity;
    
    // Check stockout trigger
    if (projectedStock <= 0 && stockoutWeek === null) {
      stockoutWeek = weekNumber;
      potentialStockoutDate = f.date;
    }

    // Check safety stock trigger
    if (projectedStock < safetyStock && safetyViolationWeek === null) {
      safetyViolationWeek = weekNumber;
    }

    projectionLogs.push({
      week: weekNumber,
      date: f.date,
      demand: Number(f.quantity.toFixed(2)),
      expectedStock: Number(projectedStock.toFixed(2))
    });
  });

  // Risk Classification Rules
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  
  if (stockoutWeek !== null && stockoutWeek <= 2) {
    riskLevel = 'CRITICAL';
  } else if ((stockoutWeek !== null && stockoutWeek <= 4) || (safetyViolationWeek !== null && safetyViolationWeek <= 2)) {
    riskLevel = 'HIGH';
  } else if (safetyViolationWeek !== null && safetyViolationWeek <= 4) {
    riskLevel = 'MEDIUM';
  }

  // Recommended Reorder calculations
  const requiredStock = totalPredictedDemand + safetyStock;
  const recommendedReorderQuantity = Math.max(0, Math.ceil(requiredStock - product.currentStock));

  // Construct explanation statement
  let explanation = '';
  if (riskLevel === 'CRITICAL') {
    explanation = `CRITICAL RISK: Projected stock is expected to deplete entirely within ${stockoutWeek} weeks (depletion date: ${potentialStockoutDate}). Current inventory (${product.currentStock} units) is severely below forecasted demand of ${totalPredictedDemand.toFixed(1)} units. Immediate reorder of at least ${recommendedReorderQuantity} units is required.`;
  } else if (riskLevel === 'HIGH') {
    explanation = `HIGH RISK: Stock levels are projected to drop below the safety limit (${safetyStock} units) within ${safetyViolationWeek} weeks. The forecasted demand of ${totalPredictedDemand.toFixed(1)} units will exhaust safety margins. Reordering ${recommendedReorderQuantity} units is highly recommended.`;
  } else if (riskLevel === 'MEDIUM') {
    explanation = `MEDIUM RISK: Safety stock limits (${safetyStock} units) will be breached in week ${safetyViolationWeek}. Reorder ${recommendedReorderQuantity} units to replenish safety margins before forecast horizon ends.`;
  } else {
    explanation = `LOW RISK: Inventory levels remain stable. Expected stock (${projectedStock.toFixed(1)} units) is sufficient to fulfill predicted demand of ${totalPredictedDemand.toFixed(1)} units and maintain the safety buffer.`;
  }

  return {
    productId: product.id,
    productName: product.name,
    currentStock: product.currentStock,
    minimumStock: product.minimumStock,
    forecastHorizon: horizon,
    predictedDemand: Number(totalPredictedDemand.toFixed(2)),
    projectedStock: Number(projectedStock.toFixed(2)),
    riskLevel,
    potentialStockoutDate,
    recommendedReorderQuantity,
    projectionLogs,
    explanation
  };
}

// 1. GET /api/inventory/intelligence/:productId - Single product detailed risk analysis
export const getProductRisk = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productId } = req.params;
    const horizon = parseInt(req.query.horizon as string, 10) || 4; // defaults to 4 weeks

    if (horizon <= 0 || horizon > 12) {
      throw new IntelligenceError('Forecast horizon parameter must be between 1 and 12 weeks', 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new IntelligenceError('Product not found in the catalog directory', 404);
    }

    // Call predictions helper
    const prediction = await getPredictionsHelper(productId, horizon);

    if (prediction.status === 'INSUFFICIENT_HISTORY') {
      res.status(200).json({
        success: true,
        productId,
        productName: product.name,
        currentStock: product.currentStock,
        minimumStock: product.minimumStock,
        status: 'INSUFFICIENT_HISTORY',
        riskLevel: 'LOW',
        explanation: 'This product has insufficient historical sales data to project risk levels.',
        projectionLogs: [],
        recommendedReorderQuantity: 0
      });
      return;
    }

    // Evaluate risk
    const riskAnalysis = evaluateInventoryRisk(
      {
        id: product.id,
        name: product.name,
        currentStock: product.currentStock,
        minimumStock: product.minimumStock
      },
      prediction.forecast,
      horizon
    );

    res.status(200).json({
      success: true,
      status: 'VALIDATED',
      model_type: prediction.model_type,
      ...riskAnalysis
    });

  } catch (error) {
    next(error);
  }
};

// 2. GET /api/inventory/intelligence - Bulk products risk analysis list
export const getBulkRisk = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const horizon = parseInt(req.query.horizon as string, 10) || 4;

    const products = await prisma.product.findMany({});
    
    // Evaluate risk asynchronously for all products
    const riskPromises = products.map(async (prod) => {
      const pred = await getPredictionsHelper(prod.id, horizon);
      
      if (pred.status === 'INSUFFICIENT_HISTORY') {
        return {
          productId: prod.id,
          productName: prod.name,
          currentStock: prod.currentStock,
          minimumStock: prod.minimumStock,
          status: 'INSUFFICIENT_HISTORY',
          riskLevel: 'LOW' as const,
          recommendedReorderQuantity: 0,
          predictedDemand: 0,
          projectedStock: prod.currentStock,
          explanation: 'Insufficient history to evaluate demand forecast.'
        };
      }

      const risk = evaluateInventoryRisk(
        {
          id: prod.id,
          name: prod.name,
          currentStock: prod.currentStock,
          minimumStock: prod.minimumStock
        },
        pred.forecast,
        horizon
      );

      return {
        productId: prod.id,
        productName: prod.name,
        currentStock: prod.currentStock,
        minimumStock: prod.minimumStock,
        status: 'VALIDATED',
        riskLevel: risk.riskLevel,
        recommendedReorderQuantity: risk.recommendedReorderQuantity,
        predictedDemand: risk.predictedDemand,
        projectedStock: risk.projectedStock,
        explanation: risk.explanation
      };
    });

    const results = await Promise.all(riskPromises);
    res.status(200).json({
      success: true,
      horizon,
      results
    });

  } catch (error) {
    next(error);
  }
};
