import { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import bcrypt from 'bcrypt';
import { prisma } from '../services';
import { importProductRowSchema, importUserRowSchema } from '../validators/import';
import { getSimilarityScore, getConfidenceLevel } from '../utils/similarity';
import { Role } from '@prisma/client';

class ImportControllerError extends Error {
  statusCode: number;
  errors?: any[];

  constructor(message: string, statusCode: number, errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, ImportControllerError.prototype);
  }
}

// Map database fields to their known search aliases
const PRODUCT_ALIASES: Record<string, string[]> = {
  name: ['product name', 'item name', 'name', 'item', 'title', 'label'],
  sku: ['sku', 'sku code', 'product code', 'code', 'stock keeping unit', 'article number'],
  category: ['category', 'product category', 'type', 'group', 'class'],
  unitPrice: ['price', 'unit price', 'selling price', 'rate', 'cost', 'mrp', 'value'],
  currentStock: ['stock', 'current stock', 'quantity', 'available stock', 'qty', 'units', 'count'],
  minimumStock: ['minimum stock', 'safety stock', 'alert quantity', 'reorder level', 'min stock', 'safety level'],
  warehouseLocation: ['location', 'warehouse location', 'aisle', 'shelf', 'warehouse', 'rack', 'bin'],
};

const USER_ALIASES: Record<string, string[]> = {
  name: ['name', 'full name', 'user name', 'employee name', 'fullname', 'staff name'],
  email: ['email', 'email address', 'mail', 'mail address', 'login email'],
  role: ['role', 'user role', 'permission', 'type', 'access role', 'privilege'],
};

// Helper function to dynamically detect column mappings based on headers
function detectColumnMappings(headers: string[], entity: 'USERS' | 'PRODUCTS'): Record<string, string> {
  const mappings: Record<string, string> = {};
  const schemaAliases = entity === 'PRODUCTS' ? PRODUCT_ALIASES : USER_ALIASES;

  for (const schemaKey of Object.keys(schemaAliases)) {
    const aliases = schemaAliases[schemaKey];
    
    // 1. Try exact or lowercase matches first
    const matchedHeader = headers.find(h => {
      const normalizedHeader = h.toLowerCase().trim();
      return normalizedHeader === schemaKey.toLowerCase() || aliases.includes(normalizedHeader);
    });

    if (matchedHeader) {
      mappings[schemaKey] = matchedHeader;
      continue;
    }

    // 2. Try fuzzy string matching with Sørensen-Dice coefficient
    let bestMatchHeader = '';
    let highestScore = 0;

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      // Calculate similarity score between schemaKey (and its aliases) and the header
      const scores = [
        getSimilarityScore(schemaKey, normalizedHeader),
        ...aliases.map(alias => getSimilarityScore(alias, normalizedHeader))
      ];
      const maxScore = Math.max(...scores);

      if (maxScore > highestScore && maxScore >= 0.60) {
        highestScore = maxScore;
        bestMatchHeader = header;
      }
    }

    if (bestMatchHeader) {
      mappings[schemaKey] = bestMatchHeader;
    }
  }

  return mappings;
}

// Clean and convert cell values to numeric or clean strings
function cleanCellValue(val: any): any {
  if (val === undefined || val === null) return undefined;
  
  // If it's a cell object (formula, rich text, etc.), extract text value
  if (typeof val === 'object') {
    if (val.result !== undefined) val = val.result;
    else if (val.text !== undefined) val = val.text;
    else if (Array.isArray(val.richText)) {
      val = val.richText.map((t: any) => t.text || '').join('');
    } else {
      val = val.toString();
    }
  }

  if (typeof val === 'string') {
    val = val.trim();
    // Check if it looks like currency/number formatted with symbols
    if (/^[₹\$\,\-\s\d\.]+$/.test(val)) {
      const numericString = val.replace(/[₹\$\,\s]/g, '');
      const parsedNum = Number(numericString);
      if (!isNaN(parsedNum)) {
        return parsedNum;
      }
    }
  }
  return val;
}

// 1. Analyze and Preview Endpoint
export const analyzeImport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      throw new ImportControllerError('No file uploaded', 400);
    }

    const entityType = (req.body.entity || req.query.entity || '').toUpperCase();
    if (entityType !== 'USERS' && entityType !== 'PRODUCTS') {
      throw new ImportControllerError('Invalid or missing entity type. Must be USERS or PRODUCTS', 400);
    }

    // Process file buffers using exceljs
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount <= 1) {
      throw new ImportControllerError('The uploaded Excel sheet is empty or contains no data rows', 400);
    }

    // Extract headers (Row 1)
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      const val = cell.value;
      if (val && typeof val === 'string') {
        headers.push(val.trim());
      } else if (val) {
        headers.push(val.toString().trim());
      }
    });

    if (headers.length === 0) {
      throw new ImportControllerError('No valid columns/headers detected in the first row', 400);
    }

    // Auto-detect column mapping
    const detectedMappings = detectColumnMappings(headers, entityType as 'USERS' | 'PRODUCTS');

    // Extract rows mapping
    const rowsData: any[] = [];
    const maxRowsLimit = 1000;
    
    // Read existing DB data for in-memory duplicate validation
    const dbProducts = entityType === 'PRODUCTS' ? await prisma.product.findMany() : [];
    const dbUsers = entityType === 'USERS' ? await prisma.user.findMany() : [];

    // Tracks intra-file duplicates to avoid double warnings inside the same sheet
    const seenSkus = new Set<string>();
    const seenEmails = new Set<string>();

    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    let newRecordsCount = 0;

    // Read worksheets row by row starting from Row 2
    const totalRows = Math.min(worksheet.rowCount, maxRowsLimit + 1);
    for (let r = 2; r <= totalRows; r++) {
      const row = worksheet.getRow(r);
      
      // Check if row is completely blank
      let isRowBlank = true;
      row.eachCell({ includeEmpty: false }, () => {
        isRowBlank = false;
      });
      if (isRowBlank) continue;

      const rawRowObj: Record<string, any> = {};
      const parsedRowObj: Record<string, any> = {};
      const errors: { field: string; message: string; value: any }[] = [];

      // Extract raw cell values based on mapped headers
      const schemaKeys = entityType === 'PRODUCTS' ? Object.keys(PRODUCT_ALIASES) : Object.keys(USER_ALIASES);
      
      for (const key of schemaKeys) {
        const mappedHeader = detectedMappings[key];
        if (mappedHeader) {
          // Find cell index by header value
          const cellIndex = headers.indexOf(mappedHeader) + 1;
          const cellVal = row.getCell(cellIndex).value;
          rawRowObj[key] = cellVal;
          parsedRowObj[key] = cleanCellValue(cellVal);
        } else {
          rawRowObj[key] = undefined;
          parsedRowObj[key] = undefined;
        }
      }

      // Perform validation using corresponding Zod schemas
      let validationSuccess = true;
      if (entityType === 'PRODUCTS') {
        const validationResult = importProductRowSchema.safeParse(parsedRowObj);
        if (!validationResult.success) {
          validationSuccess = false;
          validationResult.error.errors.forEach((err) => {
            errors.push({
              field: err.path.join('.'),
              message: err.message,
              value: parsedRowObj[err.path[0]],
            });
          });
        }
      } else {
        const validationResult = importUserRowSchema.safeParse(parsedRowObj);
        if (!validationResult.success) {
          validationSuccess = false;
          validationResult.error.errors.forEach((err) => {
            errors.push({
              field: err.path.join('.'),
              message: err.message,
              value: parsedRowObj[err.path[0]],
            });
          });
        }
      }

      // Check duplicates only if basic structural validation passes
      let duplicateDetails: any = null;
      let rowStatus: 'VALID' | 'INVALID' | 'DUPLICATE' = validationSuccess ? 'VALID' : 'INVALID';

      if (validationSuccess) {
        if (entityType === 'PRODUCTS') {
          const sku = parsedRowObj.sku.toUpperCase();

          // 1. Check intra-file duplicate
          if (seenSkus.has(sku)) {
            rowStatus = 'DUPLICATE';
            duplicateDetails = {
              confidence: 'HIGH',
              similarity: 1.0,
              reason: 'Duplicate SKU code present multiple times in this Excel file',
            };
          } else {
            seenSkus.add(sku);

            // 2. Check exact match in database
            const dbMatch = dbProducts.find(p => p.sku.toUpperCase() === sku);
            if (dbMatch) {
              rowStatus = 'DUPLICATE';
              duplicateDetails = {
                confidence: 'HIGH',
                similarity: 1.0,
                existingRecord: { id: dbMatch.id, name: dbMatch.name, sku: dbMatch.sku },
                reason: 'A product with this exact SKU already exists in the catalog',
              };
            } else {
              // 3. Check fuzzy/semantic matches on Product Name
              const nameSimilarityThreshold = 0.65;
              let highestFuzzyScore = 0;
              let bestFuzzyMatch: any = null;

              for (const dbProd of dbProducts) {
                const score = getSimilarityScore(parsedRowObj.name, dbProd.name);
                if (score > highestFuzzyScore) {
                  highestFuzzyScore = score;
                  bestFuzzyMatch = dbProd;
                }
              }

              if (highestFuzzyScore >= nameSimilarityThreshold) {
                rowStatus = 'DUPLICATE';
                const confidence = getConfidenceLevel(highestFuzzyScore);
                duplicateDetails = {
                  confidence,
                  similarity: Number(highestFuzzyScore.toFixed(2)),
                  existingRecord: { id: bestFuzzyMatch.id, name: bestFuzzyMatch.name, sku: bestFuzzyMatch.sku },
                  reason: `Fuzzy duplicate candidate detected based on name similarity (${Math.round(highestFuzzyScore * 100)}%)`,
                };
              }
            }
          }
        } else {
          // Users duplicate checks
          const email = parsedRowObj.email.toLowerCase();

          // 1. Check intra-file duplicate
          if (seenEmails.has(email)) {
            rowStatus = 'DUPLICATE';
            duplicateDetails = {
              confidence: 'HIGH',
              similarity: 1.0,
              reason: 'Duplicate Email address present multiple times in this Excel file',
            };
          } else {
            seenEmails.add(email);

            // 2. Check exact email in database
            const dbMatch = dbUsers.find(u => u.email.toLowerCase() === email);
            if (dbMatch) {
              rowStatus = 'DUPLICATE';
              duplicateDetails = {
                confidence: 'HIGH',
                similarity: 1.0,
                existingRecord: { id: dbMatch.id, name: dbMatch.name, email: dbMatch.email },
                reason: 'A user with this exact Email address already exists in the system',
              };
            }
          }
        }
      }

      // Count states
      if (rowStatus === 'INVALID') invalidCount++;
      else if (rowStatus === 'DUPLICATE') duplicateCount++;
      else {
        validCount++;
        newRecordsCount++;
      }

      rowsData.push({
        rowNumber: r,
        status: rowStatus,
        data: parsedRowObj,
        errors: errors.length > 0 ? errors : undefined,
        duplicateDetails: duplicateDetails || undefined,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Excel sheet analyzed successfully',
      data: {
        summary: {
          totalRows: rowsData.length,
          valid: validCount,
          invalid: invalidCount,
          duplicates: duplicateCount,
          newRecords: newRecordsCount,
          skipped: 0,
        },
        mappings: detectedMappings,
        rows: rowsData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. Confirm and Ingest Endpoint
export const confirmImport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { entity, rows } = req.body;

    if (entity !== 'USERS' && entity !== 'PRODUCTS') {
      throw new ImportControllerError('Invalid entity type. Must be USERS or PRODUCTS', 400);
    }

    // Role safety validation inside controller logic
    if (entity === 'USERS' && req.user?.role !== Role.ADMIN) {
      throw new ImportControllerError('Forbidden: Only Administrators can bulk import User profiles', 403);
    }

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Execute atomic imports wrapping in a Prisma transaction
    await prisma.$transaction(async (tx) => {
      if (entity === 'PRODUCTS') {
        for (const row of rows) {
          // Re-validate fields inside transaction to ensure integrity
          const validation = importProductRowSchema.safeParse(row);
          if (!validation.success) {
            errorCount++;
            continue;
          }

          const { sku, name, category, unitPrice, currentStock, minimumStock, warehouseLocation } = validation.data;
          const upperSku = sku.toUpperCase();

          // Check if SKU exists to avoid duplicate DB insertion errors
          const existing = await tx.product.findUnique({
            where: { sku: upperSku }
          });

          if (existing) {
            // Update existing stock counts and details or skip (Phase 2 behavior is to UPSERT or SKIP based on confirmation)
            // We upsert product values to merge gracefully
            await tx.product.update({
              where: { sku: upperSku },
              data: {
                name,
                category,
                unitPrice,
                currentStock: existing.currentStock + currentStock, // Aggregate stock counts
                minimumStock,
                warehouseLocation,
              }
            });
            importedCount++;
          } else {
            // Create new product record
            const newProduct = await tx.product.create({
              data: {
                sku: upperSku,
                name,
                category,
                unitPrice,
                currentStock,
                minimumStock,
                warehouseLocation
              }
            });

            // Log initial stock movement if currentStock > 0
            if (currentStock > 0) {
              await tx.stockMovement.create({
                data: {
                  productId: newProduct.id,
                  quantityChanged: currentStock,
                  movementType: 'IN',
                  reason: 'Initial stock load via bulk Excel import',
                  createdBy: req.user?.id || 'fa8eb891-b3b3-4638-95d6-ec269c2dfca8', // fallback to default Admin UUID if not logged in (e.g. testing)
                }
              });
            }
            importedCount++;
          }
        }
      } else {
        // Import Users
        const defaultSaltRounds = 10;
        const passwordHash = await bcrypt.hash('DevPassword123!', defaultSaltRounds);

        for (const row of rows) {
          const validation = importUserRowSchema.safeParse(row);
          if (!validation.success) {
            errorCount++;
            continue;
          }

          const { email, name, role } = validation.data;
          const lowerEmail = email.toLowerCase();

          const existing = await tx.user.findUnique({
            where: { email: lowerEmail }
          });

          if (existing) {
            // Skip duplicates for users (security precaution: do not overwrite existing credentials/roles)
            skippedCount++;
          } else {
            await tx.user.create({
              data: {
                email: lowerEmail,
                name,
                role,
                passwordHash
              }
            });
            importedCount++;
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: `${entity} bulk data ingestion completed successfully`,
      data: {
        imported: importedCount,
        skipped: skippedCount,
        errors: errorCount,
        total: rows.length,
      }
    });
  } catch (error) {
    next(error);
  }
};
