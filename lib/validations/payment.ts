import { z } from 'zod';

// ─── Payment ────────────────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE']),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  paidAt: z.string().optional().nullable(),
});

// ─── Types ──────────────────────────────────────────────────────────────────────

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
