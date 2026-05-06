import { z } from 'zod';

// ─── Shared ───────────────────────────────────────────────────────────────────

/** UAE / international mobile — optional, but if provided must be valid */
const mobileSchema = z
  .string()
  .optional()
  .nullable()
  .refine(
    (v) => !v || /^\+?[\d\s\-().]{7,20}$/.test(v.trim()),
    { message: 'Invalid phone number (digits, spaces, +, -, () allowed; 7–20 chars)' }
  );

// ─── Quotation Item ──────────────────────────────────────────────────────────────

const quotationItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  length: z.number().min(0.01).optional().nullable(),      // for LitBeam LM calc
  linearMeters: z.number().min(0).optional().nullable(),   // qty * length
  size: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),                  // LM or Nos
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  // max 99 to prevent zero or negative line totals after discount
  discount: z.number().min(0).max(99, 'Discount cannot exceed 99%').optional(),
}).superRefine((item, ctx) => {
  // LM items must have a length so linear meters can be calculated correctly
  if (item.unit === 'LM' && !item.linearMeters && !item.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Length (cm) is required for LM items',
      path: ['length'],
    });
  }
});

// ─── Create Quotation ──────────────────────────────────────────────────────────

export const createQuotationSchema = z.object({
  customerId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  engineerId: z.string().optional().nullable(),
  engineerName: z.string().optional().nullable(),
  mobileNumber: mobileSchema,
  projectName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).optional(),
  deliveryCharges: z.number().min(0).optional(),
  items: z.array(quotationItemSchema).min(1, 'At least one item is required'),
});

// ─── Update Quotation ──────────────────────────────────────────────────────────

export const updateQuotationSchema = z.object({
  customerId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  engineerId: z.string().optional().nullable(),
  engineerName: z.string().optional().nullable(),
  mobileNumber: mobileSchema,
  projectName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).optional(),
  deliveryCharges: z.number().min(0).optional(),
  items: z.array(quotationItemSchema).min(1, 'At least one item is required').optional(),
});

// ─── Approval ─────────────────────────────────────────────────────────────────

export const approveQuotationSchema = z.object({
  lpoNumber: z.string().min(1, 'LPO Number is required'),
  paymentTerms: z.enum(['Cash', 'Cheque', 'Bank Transfer', 'Cash / Cheque / Bank Transfer']),
});

export const rejectQuotationSchema = z.object({
  rejectionReason: z.string().optional().nullable(),
});

// ─── Tax Invoice ───────────────────────────────────────────────────────────────

const taxInvoiceItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0.01),
  length: z.number().min(0).optional().nullable(),
  linearMeters: z.number().min(0).optional().nullable(),
  size: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
  sortOrder: z.number().optional(),
});

export const createTaxInvoiceSchema = z.object({
  quotationId: z.string().uuid('Invalid quotation ID'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  customerId: z.string().uuid('Invalid customer ID').optional().nullable(),
  customerTrn: z.string().optional().nullable(),
  ourVatReg: z.string().optional().nullable(),
  dnNumber: z.string().optional().nullable(),
  engineerName: z.string().optional().nullable(),
  mobileNumber: mobileSchema,
  projectName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  taxPercent: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  deliveryCharges: z.number().min(0).optional(),
  lpoNumber: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  items: z.array(taxInvoiceItemSchema).min(1, 'At least one item is required'),
});

export const updateTaxInvoiceSchema = z.object({
  customerTrn: z.string().optional().nullable(),
  ourVatReg: z.string().optional().nullable(),
  dnNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  // Only CANCELLED is allowed manually — UNPAID/PARTIAL/PAID are derived from paidAmount
  status: z.enum(['CANCELLED']).optional(),
  lpoNumber: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  discount: z.number().min(0).optional().nullable(),
});

// ─── Delivery Note ─────────────────────────────────────────────────────────────

const deliveryNoteItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0.01),
  length: z.number().min(0).optional().nullable(),
  linearMeters: z.number().min(0).optional().nullable(),
  size: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
  sortOrder: z.number().optional(),
});

export const createDeliveryNoteSchema = z.object({
  quotationId: z.string().uuid().optional().nullable(),
  taxInvoiceId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  engineerName: z.string().optional().nullable(),
  mobileNumber: mobileSchema,
  projectName: z.string().optional().nullable(),
  salesmanSign: z.string().optional().nullable(),
  receiverName: z.string().optional().nullable(),
  receiverSign: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(deliveryNoteItemSchema).min(1, 'At least one item is required'),
});

export const updateDeliveryNoteSchema = z.object({
  salesmanSign: z.string().optional().nullable(),
  receiverName: z.string().optional().nullable(),
  receiverSign: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'DELIVERED', 'RETURNED']).optional(),
  deliveredAt: z.string().optional().nullable(),
});

// ─── Types ──────────────────────────────────────────────────────────────────────

export type QuotationItemInput = z.infer<typeof quotationItemSchema>;
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;
export type ApproveQuotationInput = z.infer<typeof approveQuotationSchema>;
export type RejectQuotationInput = z.infer<typeof rejectQuotationSchema>;
export type CreateTaxInvoiceInput = z.infer<typeof createTaxInvoiceSchema>;
export type UpdateTaxInvoiceInput = z.infer<typeof updateTaxInvoiceSchema>;
export type CreateDeliveryNoteInput = z.infer<typeof createDeliveryNoteSchema>;
export type UpdateDeliveryNoteInput = z.infer<typeof updateDeliveryNoteSchema>;
