import { z } from 'zod';

// Lead/Customer status values with their default probabilities
export const LEAD_STATUSES = [
  'NEW_INQUIRY',
  'QUOTATION_SENT',
  'TECHNICAL_DISCUSSION',
  'NEGOTIATION',
  'FINAL_OFFER',
  'VERBAL_APPROVAL',
  'WON',
  'LOST',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

// Probability mapping for each status stage
export const STATUS_PROBABILITY_MAP: Record<LeadStatus, number> = {
  NEW_INQUIRY: 10,
  QUOTATION_SENT: 30,
  TECHNICAL_DISCUSSION: 50,
  NEGOTIATION: 70,
  FINAL_OFFER: 85,
  VERBAL_APPROVAL: 95,
  WON: 100,
  LOST: 0,
};

// Calculate weighted value
export function calculateWeightedValue(estimatedValue: number | null | undefined, probability: number | null | undefined): number {
  if (!estimatedValue || !probability) return 0;
  return Math.round(estimatedValue * probability / 100);
}

// Get probability from status
export function getProbabilityFromStatus(status: LeadStatus): number {
  return STATUS_PROBABILITY_MAP[status] ?? 10;
}

// Emirates options
export const EMIRATES = [
  'ABU_DHABI',
  'DUBAI',
  'SHARJAH',
  'AJMAN',
  'UMM_AL_QUWAIN',
  'RAS_AL_KHAIMAH',
  'FUJAIRAH',
  'AL_AIN',
] as const;

// Project type options
export const PROJECT_TYPES = [
  'VILLA',
  'ANNEX',
  'GUARD_ROOM',
  'WAREHOUSE',
  'OFFICE',
  'COMMERCIAL',
  'RESIDENTIAL',
  'OTHER',
] as const;

// Product type options
export const PRODUCT_TYPES = [
  'FRAMIX_LGSF',
  'OTHER',
] as const;

// Lead source options
export const LEAD_SOURCES = [
  'INSTAGRAM',
  'FACEBOOK',
  'WEBSITE',
  'CONSULTANT',
  'REFERRAL',
  'EXHIBITION',
  'COLD_CALL',
  'OTHER',
] as const;

export const createCustomerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  fullNameAr: z.string().optional(),
  nationalId: z.string().optional().refine(
    val => !val || /^\d{3}-\d{4}-\d{7}-\d{1}$/.test(val),
    { message: 'Emirates ID must be in format 784-XXXX-XXXXXXX-X' }
  ),
  phone: z.string().min(1, 'Phone is required').refine(
    val => /^\+971[1-9]\d{7,8}$/.test(val),
    { message: 'Phone must be a valid UAE number (+971XXXXXXXXX)' }
  ),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  company: z.string().optional(),
  contactPerson: z.string().optional(),
  customerType: z.enum(['NEW', 'EXISTING'], {
    message: 'Customer type is required',
  }),
  status: z.enum(LEAD_STATUSES),
  emirate: z.string().optional(),
  projectType: z.string().optional(),
  productType: z.string().optional(),
  leadSource: z.string().optional(),
  estimatedValue: z.number().min(0).optional().nullable(),
  probability: z.number().min(0).max(100).optional().nullable(),
  consultant: z.string().optional(),
  paymentTerms: z.string().optional(),
  projectSize: z.number().min(0).optional().nullable(),
  notes: z.string().optional(),
  lastFollowUp: z.string().optional().nullable(),
  nextFollowUp: z.string().optional().nullable(),
  ownerId: z.string().uuid('Invalid owner ID').optional(),
});

export const updateCustomerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  fullNameAr: z.string().optional(),
  nationalId: z.string().optional().refine(
    val => !val || /^\d{3}-\d{4}-\d{7}-\d{1}$/.test(val),
    { message: 'Emirates ID must be in format 784-XXXX-XXXXXXX-X' }
  ),
  phone: z.string().min(1, 'Phone is required').refine(
    val => !val || /^\+971[1-9]\d{7,8}$/.test(val),
    { message: 'Phone must be a valid UAE number (+971XXXXXXXXX)' }
  ).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  company: z.string().optional(),
  contactPerson: z.string().optional(),
  customerType: z.enum(['NEW', 'EXISTING']).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  emirate: z.string().optional(),
  projectType: z.string().optional(),
  productType: z.string().optional(),
  leadSource: z.string().optional(),
  estimatedValue: z.number().min(0).optional().nullable(),
  probability: z.number().min(0).max(100).optional().nullable(),
  consultant: z.string().optional(),
  paymentTerms: z.string().optional(),
  projectSize: z.number().min(0).optional().nullable(),
  notes: z.string().optional(),
  lastFollowUp: z.string().optional().nullable(),
  nextFollowUp: z.string().optional().nullable(),
});

export const assignOwnerSchema = z.object({
  ownerId: z.string().uuid('Invalid owner ID'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type AssignOwnerInput = z.infer<typeof assignOwnerSchema>;
