import { z } from 'zod';
import { ChallanStatus } from '@prisma/client';

export const getChallansQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).refine((val) => Number(val) <= 100, {
      message: 'Limit cannot exceed 100',
    }).optional(),
    search: z.string().optional(),
    status: z.nativeEnum(ChallanStatus).optional(),
    customerId: z.string().uuid('Invalid Customer ID format').optional(),
  }).strict('Unknown search/filter query parameters'),
});

export const challanIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Challan ID format'),
  }).strict('Unknown path parameters'),
});

export const createChallanSchema = z.object({
  body: z.object({
    customerId: z.string({ required_error: 'Customer ID is required' }).uuid('Invalid Customer ID format'),
    items: z
      .array(
        z.object({
          productId: z.string({ required_error: 'Product ID is required' }).uuid('Invalid Product ID format'),
          quantity: z.number({ required_error: 'Quantity is required' }).int().gt(0, 'Quantity must be a positive integer'),
        }),
        { required_error: 'Challan must contain at least one product item' }
      )
      .min(1, 'Challan must contain at least one product item'),
    status: z.nativeEnum(ChallanStatus, {
      errorMap: () => ({ message: 'Invalid status. Must be DRAFT or CONFIRMED' }),
    }).default(ChallanStatus.DRAFT),
  }).strict('Unknown properties submitted in sales challan creation body'),
});

export const updateChallanSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Challan ID format'),
  }).strict('Unknown path parameters'),
  body: z.object({
    customerId: z.string().uuid('Invalid Customer ID format').optional(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Invalid Product ID format'),
          quantity: z.number().int().gt(0, 'Quantity must be a positive integer'),
        })
      )
      .min(1, 'Challan must contain at least one product item')
      .optional(),
  }).strict('Unknown properties submitted in sales challan update body'),
});
