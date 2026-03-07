import { z } from 'zod';

// ─── Quotation ──────────────────────────────────────────────────────────────────

const quotationItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  discount: z.number().min(0).max(100).optional(),
});

export const createQuotationSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  subject: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).optional(),
  items: z.array(quotationItemSchema).min(1, 'At least one item is required'),
});

export const updateQuotationSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID').optional(),
  subject: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).optional(),
  items: z.array(quotationItemSchema).min(1, 'At least one item is required').optional(),
});

// ─── Types ──────────────────────────────────────────────────────────────────────

export type QuotationItemInput = z.infer<typeof quotationItemSchema>;
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;
