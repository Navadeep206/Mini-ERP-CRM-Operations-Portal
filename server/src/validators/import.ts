import { z } from 'zod';
import { Role } from '@prisma/client';

// 1. Validation Schema for a single Product import row
export const importProductRowSchema = z.object({
  name: z.string({ required_error: 'Product Name is required' }).trim().min(1, 'Product Name cannot be empty'),
  sku: z.string({ required_error: 'SKU is required' }).trim().toUpperCase().min(1, 'SKU cannot be empty'),
  category: z.string({ required_error: 'Category is required' }).trim().min(1, 'Category cannot be empty'),
  unitPrice: z.coerce.number({ required_error: 'Unit Price is required' }).min(0, 'Unit Price must be non-negative'),
  currentStock: z.coerce.number().int().min(0, 'Stock count cannot be negative').default(0),
  minimumStock: z.coerce.number().int().min(0, 'Safety margin cannot be negative').default(0),
  warehouseLocation: z.string({ required_error: 'Warehouse Location is required' }).trim().min(1, 'Warehouse Location cannot be empty'),
});

// 2. Validation Schema for a single User import row
export const importUserRowSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name cannot be empty'),
  email: z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Invalid email address format'),
  role: z.nativeEnum(Role, {
    errorMap: () => ({ message: `Invalid Role. Must be: ${Object.keys(Role).join(', ')}` }),
  }),
});

// 3. Validation Schema for final import confirmation payloads
export const importConfirmSchema = z.object({
  body: z.object({
    entity: z.enum(['USERS', 'PRODUCTS'], {
      required_error: 'Entity type is required (USERS or PRODUCTS)',
    }),
    rows: z.array(z.record(z.any())).min(1, 'Rows array cannot be empty'),
  }).strict('Unknown properties submitted in confirmation body'),
});
