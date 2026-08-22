import { prisma } from '../services';

export interface VectorDocument {
  id: string;
  entityType: string;
  entityId: string;
  text: string;
  metadata: any;
}

// Stop words to filter out during tokenization
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into', 'is', 'it',
  'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there', 'these',
  'they', 'this', 'to', 'was', 'will', 'with', 'we', 'show', 'find', 'list', 'me', 'get', 'give'
]);

// Normalise and tokenise text into clean word tokens
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ') // replace special characters with spaces
    .split(/[\s_-]+/)              // split by spaces, hyphens, underscores
    .map(t => t.trim())
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

// Compute term frequency vector (frequency map)
function getTermFrequencies(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  tokens.forEach(token => {
    tf.set(token, (tf.get(token) || 0) + 1);
  });
  return tf;
}

// Compute Cosine Similarity between query term frequencies and document term frequencies
function cosineSimilarity(queryTf: Map<string, number>, docTf: Map<string, number>): number {
  let dotProduct = 0;
  let queryNormSq = 0;
  let docNormSq = 0;

  // Query magnitude squared
  for (const val of queryTf.values()) {
    queryNormSq += val * val;
  }

  // Document magnitude squared
  for (const val of docTf.values()) {
    docNormSq += val * val;
  }

  if (queryNormSq === 0 || docNormSq === 0) return 0;

  // Dot product
  for (const [term, queryVal] of queryTf.entries()) {
    const docVal = docTf.get(term);
    if (docVal !== undefined) {
      dotProduct += queryVal * docVal;
    }
  }

  return dotProduct / (Math.sqrt(queryNormSq) * Math.sqrt(docNormSq));
}

export class LocalVectorDb {
  private documents: VectorDocument[] = [];
  private static instance: LocalVectorDb;

  private constructor() {}

  public static getInstance(): LocalVectorDb {
    if (!LocalVectorDb.instance) {
      LocalVectorDb.instance = new LocalVectorDb();
    }
    return LocalVectorDb.instance;
  }

  // Clear memory index
  public clear(): void {
    this.documents = [];
  }

  // Index single document record
  public addDocument(entityType: string, entityId: string, text: string, metadata: any): void {
    // Prevent duplicate keys
    this.removeDocument(entityType, entityId);
    
    this.documents.push({
      id: `${entityType}_${entityId}`,
      entityType,
      entityId,
      text,
      metadata
    });
  }

  // Remove document from memory index
  public removeDocument(entityType: string, entityId: string): void {
    this.documents = this.documents.filter(
      d => !(d.entityType === entityType && d.entityId === entityId)
    );
  }

  // Execute cosine similarity search
  public search(query: string, limit: number = 5): { document: VectorDocument; score: number }[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const queryTf = getTermFrequencies(queryTokens);
    const results = this.documents.map(doc => {
      const docTokens = tokenize(doc.text);
      const docTf = getTermFrequencies(docTokens);
      const score = cosineSimilarity(queryTf, docTf);
      return { document: doc, score };
    });

    // Sort by score descending and filter positive matches
    return results
      .filter(r => r.score > 0.05) // score threshold filter
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Synchronise products from database catalog
  public async syncProducts(): Promise<number> {
    try {
      const products = await prisma.product.findMany({});
      
      let indexedCount = 0;
      products.forEach(p => {
        const text = `Product: ${p.name}, SKU: ${p.sku}, Category: ${p.category}, Location: ${p.warehouseLocation}, Price: $${Number(p.unitPrice)}, Stock: ${p.currentStock} units, Minimum Stock Alert Threshold: ${p.minimumStock} units.`;
        
        this.addDocument('PRODUCT', p.id, text, {
          name: p.name,
          sku: p.sku,
          category: p.category,
          unitPrice: Number(p.unitPrice),
          currentStock: p.currentStock,
          minimumStock: p.minimumStock,
          warehouseLocation: p.warehouseLocation
        });
        indexedCount++;
      });

      console.log(`[VectorDB] Indexed ${indexedCount} products successfully from database.`);
      return indexedCount;
    } catch (err: any) {
      console.error('[VectorDB] Database synchronization failed:', err.message);
      return 0;
    }
  }
}

export const vectorDb = LocalVectorDb.getInstance();
