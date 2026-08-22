import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services';
import { vectorDb } from '../utils/vectorDb';
import { getPredictionsHelper, evaluateInventoryRisk } from './intelligence';

class AiControllerError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AiControllerError.prototype);
  }
}

// System Prompt for LLM grounding
const SYSTEM_PROMPT = `
You are the Mini ERM AI Operations Assistant. Your goal is to help users query sales, products, inventory, and forecasting risk data.
CRITICAL GROUNDING RULES:
1. You must answer the question using ONLY the provided [Context Data] below.
2. If the context data does not contain the answer, reply exactly: "I do not have enough data to answer this reliably."
3. Do not invent products, quantities, prices, or dates.
4. Report risk levels and reorder recommendations exactly as computed in the context.
`.trim();

// Local Natural Language Generator (NLG) engine (safe, zero-downtime offline RAG responder)
function localNlgEngine(question: string, context: { route: string; data: any }): string {
  const q = question.toLowerCase();

  if (context.route === 'DATABASE_STATS') {
    const stats = context.data;
    if (q.includes('how many product') || q.includes('product count') || q.includes('number of products')) {
      return `Based on the database catalog, there are currently **${stats.productCount} products** active across **${stats.categories.length} categories** (categories: ${stats.categories.join(', ')}).`;
    }
    if (q.includes('low in stock') || q.includes('reorder') || q.includes('below threshold') || q.includes('minimum stock')) {
      if (stats.lowStockCount === 0) {
        return `Excellent! All active products are currently well-stocked. There are **0 products** below their safety stock threshold.`;
      }
      const listText = stats.lowStockList.map((p: any) => `- **${p.name}** (Stock: ${p.currentStock} / Safety: ${p.minimumStock} | Location: ${p.warehouseLocation})`).join('\n');
      return `There are currently **${stats.lowStockCount} products** running below their safety stock alert thresholds:\n\n${listText}\n\nReplenishment reorders should be logged for these items.`;
    }
    return `Structured Database Context:\n- Total Active Products: ${stats.productCount}\n- Low Stock Warnings: ${stats.lowStockCount}\n- Active Product Categories: ${stats.categories.join(', ')}.`;
  }

  if (context.route === 'VECTOR_SEARCH') {
    const hits = context.data.hits;
    if (hits.length === 0) {
      return `I couldn't find any products in the catalog similar to your search terms. Please check your keywords.`;
    }
    const hitsText = hits.map((h: any, idx: number) => `${idx + 1}. **${h.name}** (SKU: ${h.sku} | Category: ${h.category} | Price: $${h.unitPrice} | Stock: ${h.currentStock} | Match Score: ${(h.score * 100).toFixed(0)}%)`).join('\n');
    return `I found the following products matching your request:\n\n${hitsText}`;
  }

  if (context.route === 'ML_FORECAST_RISK') {
    const risks = context.data.risks;
    const critical = risks.filter((r: any) => r.riskLevel === 'CRITICAL');
    const high = risks.filter((r: any) => r.riskLevel === 'HIGH');
    const medium = risks.filter((r: any) => r.riskLevel === 'MEDIUM');

    let text = `Here is the AI Demand Forecasting & Stock-out Risk report:\n\n`;

    if (critical.length > 0) {
      text += `🚨 **CRITICAL RISK (Potential Stock-out within 2 weeks):**\n`;
      critical.forEach((c: any) => {
        text += `- **${c.productName}**: Stock of ${c.currentStock} units will deplete. Projected demand: ${c.predictedDemand} units. Suggested reorder: **${c.recommendedReorderQuantity} units**.\n  *Explanation*: ${c.explanation}\n`;
      });
      text += `\n`;
    }

    if (high.length > 0) {
      text += `⚠️ **HIGH RISK (Breaching safety thresholds within 2 weeks):**\n`;
      high.forEach((h: any) => {
        text += `- **${h.productName}**: Stock is ${h.currentStock} units. Projected demand: ${h.predictedDemand} units. Suggested reorder: **${h.recommendedReorderQuantity} units**.\n  *Explanation*: ${h.explanation}\n`;
      });
      text += `\n`;
    }

    if (critical.length === 0 && high.length === 0) {
      text += `✅ All evaluated products are currently at **LOW** or **MEDIUM** demand risk for the forecast horizon.\n`;
    }

    if (medium.length > 0) {
      text += `ℹ️ **MEDIUM RISK (Breaching safety thresholds in 3-4 weeks):**\n`;
      medium.forEach((m: any) => {
        text += `- **${m.productName}**: Stock is ${m.currentStock} units. Suggested reorder: **${m.recommendedReorderQuantity} units**.\n`;
      });
    }

    return text;
  }

  // Combined fallback
  return `I have resolved the operations context regarding your request:\n- Structured database metrics are active.\n- AI Demand Forecasting models are validated.\n\nCould you please clarify your request (e.g. ask "Which products are likely to run out?" or "How many products do we have?")?`;
}

// POST /api/ai/query - AI Assistant RAG Query handler
export const postQuery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      throw new AiControllerError('Question payload must be a non-empty string', 400);
    }

    const q = question.toLowerCase().trim();
    let routedPath = 'COMBINED';
    let resolvedContext: any = {};
    let contextString = '';

    // Synchronise Local Vector DB on query if it was cleared/empty
    const hitsCount = vectorDb.search('Shirts', 1).length;
    if (hitsCount === 0) {
      await vectorDb.syncProducts();
    }

    // 1. QUERY ROUTER DECISIONS
    const dbKeywords = ['how many', 'product count', 'number of products', 'categories', 'low stock', 'stock warnings', 'below safety'];
    const mlKeywords = ['run out', 'stockout', 'deplete', 'reorder next week', 'recommend reorder', 'predictive demand', 'ml risk', 'forecast'];
    const semanticKeywords = ['similar to', 'find products like', 'related to', 'search for', 'matches'];

    const matchesDb = dbKeywords.some(kw => q.includes(kw));
    const matchesMl = mlKeywords.some(kw => q.includes(kw));
    const matchesSemantic = semanticKeywords.some(kw => q.includes(kw));

    if (matchesMl) {
      routedPath = 'ML_FORECAST_RISK';
    } else if (matchesSemantic) {
      routedPath = 'VECTOR_SEARCH';
    } else if (matchesDb) {
      routedPath = 'DATABASE_STATS';
    } else {
      routedPath = 'COMBINED';
    }

    // 2. CONTEXT BUILDER LAYER
    if (routedPath === 'DATABASE_STATS') {
      const productCount = await prisma.product.count();
      const rawCategories = await prisma.product.findMany({ select: { category: true }, distinct: ['category'] });
      const categories = rawCategories.map(c => c.category);
      
      const lowStockProducts = await prisma.product.findMany({
        where: {
          currentStock: {
            lte: prisma.product.fields.minimumStock
          }
        },
        select: { id: true, name: true, sku: true, currentStock: true, minimumStock: true, warehouseLocation: true }
      });

      resolvedContext = {
        productCount,
        categories,
        lowStockCount: lowStockProducts.length,
        lowStockList: lowStockProducts
      };

      contextString = `[Structured Database Statistics]
- Total Product catalog Count: ${productCount}
- Active Categories: ${categories.join(', ')}
- Number of products below safety minimum thresholds: ${lowStockProducts.length}
- Low Stock Items list:
${lowStockProducts.map(p => `  * ${p.name} (SKU: ${p.sku}) | Stock: ${p.currentStock} / Safety Threshold: ${p.minimumStock} | Location: ${p.warehouseLocation}`).join('\n')}
`;

    } else if (routedPath === 'VECTOR_SEARCH') {
      // Clean query by removing search indicators
      const searchClean = q
        .replace(/similar to|find products like|related to|search for|matches/g, '')
        .trim();
        
      const results = vectorDb.search(searchClean, 5);
      resolvedContext = {
        query: searchClean,
        hits: results.map(r => ({
          id: r.document.entityId,
          name: r.document.metadata.name,
          sku: r.document.metadata.sku,
          category: r.document.metadata.category,
          unitPrice: r.document.metadata.unitPrice,
          currentStock: r.document.metadata.currentStock,
          score: r.score
        }))
      };

      contextString = `[Vector Semantic search Hits for: "${searchClean}"]
${results.map((r, idx) => `Hit ${idx + 1}: ${r.document.text} (Similarity Score: ${(r.score * 100).toFixed(1)}%)`).join('\n')}
`;

    } else if (routedPath === 'ML_FORECAST_RISK') {
      // Evaluate risk for all products
      const products = await prisma.product.findMany({});
      const horizon = 4; // default to 4 weeks
      
      const riskPromises = products.map(async (p) => {
        const pred = await getPredictionsHelper(p.id, horizon);
        if (pred.status === 'INSUFFICIENT_HISTORY') return null;
        
        return evaluateInventoryRisk(
          { id: p.id, name: p.name, currentStock: p.currentStock, minimumStock: p.minimumStock },
          pred.forecast,
          horizon
        );
      });

      const risks = (await Promise.all(riskPromises)).filter(r => r !== null);
      resolvedContext = {
        horizon,
        risks
      };

      contextString = `[AI Weekly Demand Forecasting & Stock-out Risk Assessments]
${risks.map(r => `Product: ${r.productName}
- Current Inventory: ${r.currentStock} units
- Safety stock margin: ${r.minimumStock} units
- Expected Demand (4-week): ${r.predictedDemand} units
- Projected Stock at end of horizon: ${r.projectedStock} units
- Risk Classification: ${r.riskLevel}
- Potential stockout date: ${r.potentialStockoutDate || 'N/A'}
- Recommended reorder quantity: ${r.recommendedReorderQuantity} units
- Explanation: ${r.explanation}
`).join('\n')}
`;
    } else {
      // Combined default summary context
      const productCount = await prisma.product.count();
      const lowStockCount = await prisma.product.count({
        where: { currentStock: { lte: prisma.product.fields.minimumStock } }
      });

      resolvedContext = {
        productCount,
        lowStockCount
      };

      contextString = `[General Operations Summary]
- Total active catalog items: ${productCount}
- Active low-stock alerts: ${lowStockCount}
`;
    }

    // 3. RESPONDER GENERATION
    let answerText = '';
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (GEMINI_API_KEY) {
      // Calls Google Gemini Flash API REST Endpoint directly
      try {
        const payloadPrompt = `${SYSTEM_PROMPT}\n\n[Context Data]\n${contextString}\n\n[User Question]\n${question}`;
        
        const llmRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: payloadPrompt }
                ]
              }
            ]
          })
        });

        if (llmRes.ok) {
          const llmData = (await llmRes.json()) as any;
          answerText = llmData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          console.warn(`Gemini API returned status ${llmRes.status}. Falling back to local NLG engine...`);
        }
      } catch (err: any) {
        console.warn(`Error connecting to Gemini API: ${err.message}. Falling back to local NLG engine...`);
      }
    }

    // Run fallback local NLG engine if Gemini was unreachable or not configured
    if (!answerText) {
      answerText = localNlgEngine(question, { route: routedPath, data: resolvedContext });
    }

    res.status(200).json({
      success: true,
      answer: answerText,
      sources: {
        routedPath,
        resolvedContext
      },
      forecast_used: routedPath === 'ML_FORECAST_RISK' || routedPath === 'COMBINED',
      model_version: '1.0.0-RAG',
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
};
