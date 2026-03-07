import { z } from 'zod';

// ─── Invoice ────────────────────────────────────────────────────────────────────

const invoiceItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  discount: z.number().min(0).max(100).optional(),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  quotationId: z.string().uuid().optional().nullable(),
  subject: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
});

export const updateInvoiceSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID').optional(),
  subject: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required').optional(),
});

// ─── Types ──────────────────────────────────────────────────────────────────────

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
