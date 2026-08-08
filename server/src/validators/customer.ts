import { z } from 'zod';
import { CustomerType, CustomerStatus } from '@prisma/client';

export const getCustomersQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).refine((val) => val <= 100, {
      message: 'Limit cannot exceed 100',
    }).optional(),
    search: z.string().optional(),
    status: z.nativeEnum(CustomerStatus).optional(),
    customerType: z.nativeEnum(CustomerType).optional(),
    sortBy: z.enum(['name', 'email', 'businessName', 'createdAt', 'updatedAt', 'followUpDate']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }).strict('Unknown search/filter query parameters'),
});

export const getCustomerDetailSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Customer ID format'),
  }).strict('Unknown path parameters'),
});

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }).min(1, 'Name cannot be empty'),
    mobile: z.string({ required_error: 'Mobile is required' }).min(1, 'Mobile cannot be empty'),
    email: z.string({ required_error: 'Email is required' }).email('Invalid email format'),
    businessName: z.string({ required_error: 'Business name is required' }).min(1, 'Business name cannot be empty'),
    gstNumber: z.string().max(15, 'GST number cannot exceed 15 characters').optional().nullable(),
    customerType: z.nativeEnum(CustomerType, {
      errorMap: () => ({ message: 'Invalid customer type. Must be RETAIL, WHOLESALE, or DISTRIBUTOR' }),
    }),
    address: z.string({ required_error: 'Address is required' }).min(1, 'Address cannot be empty'),
    status: z.nativeEnum(CustomerStatus, {
      errorMap: () => ({ message: 'Invalid status. Must be LEAD, ACTIVE, or INACTIVE' }),
    }),
    followUpDate: z.string().transform((val) => (val ? new Date(val) : null)).optional().nullable(),
    notes: z.string().optional().nullable(),
  }).strict('Unknown properties submitted in customer profile creation body'),
});

export const updateCustomerSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Customer ID format'),
  }).strict('Unknown path parameters'),
  body: z.object({
    name: z.string().min(1, 'Name cannot be empty').optional(),
    mobile: z.string().min(1, 'Mobile cannot be empty').optional(),
    email: z.string().email('Invalid email format').optional(),
    businessName: z.string().min(1, 'Business name cannot be empty').optional(),
    gstNumber: z.string().max(15, 'GST number cannot exceed 15 characters').optional().nullable(),
    customerType: z.nativeEnum(CustomerType).optional(),
    address: z.string().min(1, 'Address cannot be empty').optional(),
    status: z.nativeEnum(CustomerStatus).optional(),
    followUpDate: z.string().transform((val) => (val ? new Date(val) : null)).optional().nullable(),
    notes: z.string().optional().nullable(),
  }).strict('Unknown properties submitted in customer profile update body'),
});

export const createFollowUpSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Customer ID format'),
  }).strict('Unknown path parameters'),
  body: z.object({
    note: z.string({ required_error: 'Note is required' }).min(1, 'Note cannot be empty'),
    followUpDate: z.string({ required_error: 'Follow-up date is required' }).transform((val) => new Date(val)),
  }).strict('Unknown properties submitted in follow-up creation body'),
});
