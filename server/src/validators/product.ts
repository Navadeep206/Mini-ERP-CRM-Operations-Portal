import { z } from 'zod';
import { MovementType } from '@prisma/client';

export const getProductsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).refine((val) => val <= 100, {
      message: 'Limit cannot exceed 100',
    }).optional(),
    search: z.string().optional(),
    category: z.string().optional(),
    warehouseLocation: z.string().optional(),
    stockStatus: z.enum(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).optional(),
    sortBy: z.enum(['name', 'sku', 'category', 'unitPrice', 'currentStock', 'createdAt', 'updatedAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }).strict('Unknown product search/filter query parameters'),
});

export const getProductDetailSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Product ID format'),
  }).strict('Unknown path parameters'),
});

export const createProductSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Product name is required' }).min(1, 'Product name cannot be empty'),
    sku: z.string({ required_error: 'SKU code is required' }).min(1, 'SKU cannot be empty'),
    category: z.string({ required_error: 'Category is required' }).min(1, 'Category cannot be empty'),
    unitPrice: z.number({ required_error: 'Unit price is required' }).min(0, 'Unit price must be non-negative'),
    currentStock: z.number().int().min(0, 'Stock cannot be negative').default(0),
    minimumStock: z.number().int().min(0, 'Minimum stock alert quantity must be non-negative').default(0),
    warehouseLocation: z.string({ required_error: 'Warehouse location is required' }).min(1, 'Warehouse location cannot be empty'),
  }).strict('Unknown properties submitted in product catalog creation body'),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Product ID format'),
  }).strict('Unknown path parameters'),
  body: z.object({
    name: z.string().min(1, 'Product name cannot be empty').optional(),
    sku: z.string().min(1, 'SKU cannot be empty').optional(),
    category: z.string().min(1, 'Category cannot be empty').optional(),
    unitPrice: z.number().min(0, 'Unit price must be non-negative').optional(),
    minimumStock: z.number().int().min(0, 'Minimum stock alert quantity must be non-negative').optional(),
    warehouseLocation: z.string().min(1, 'Warehouse location cannot be empty').optional(),
  }).strict('Unknown properties submitted in product catalog update body'),
});

export const getStockMovementsQuerySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Product ID format'),
  }).strict('Unknown path parameters'),
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).refine((val) => val <= 100, {
      message: 'Limit cannot exceed 100',
    }).optional(),
  }).strict('Unknown query parameters'),
});

export const createStockMovementSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Product ID format'),
  }).strict('Unknown path parameters'),
  body: z.object({
    quantityChanged: z.number({ required_error: 'Quantity changed is required' }).int().gt(0, 'Quantity must be positive'),
    movementType: z.nativeEnum(MovementType, {
      errorMap: () => ({ message: 'Invalid movement type. Must be IN or OUT' }),
    }),
    reason: z.string({ required_error: 'Reason is required' }).min(1, 'Reason cannot be empty'),
  }).strict('Unknown properties submitted in stock movement creation body'),
});
