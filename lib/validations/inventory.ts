import { z } from 'zod';

const phoneSchema = z
  .string()
  .optional()
  .nullable()
  .refine(
    (v) => !v || /^\+?[\d\s\-().]{7,20}$/.test(v.trim()),
    { message: 'Invalid phone number (digits, spaces, +, -, () allowed; 7–20 chars)' }
  );

// ─── Product Category ────────────────────────────────────────────────────────

export const createProductCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  nameAr: z.string().optional().nullable(),
  color: z.string().optional(),
  parentId: z.string().uuid('Invalid category ID').optional().nullable(),
});

export const updateProductCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  nameAr: z.string().optional().nullable(),
  color: z.string().optional(),
  parentId: z.string().uuid('Invalid category ID').optional().nullable(),
});

// ─── Product ─────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  nameAr: z.string().optional().nullable(),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  unitOfMeasure: z.enum(['PIECE', 'KG', 'METER', 'LITER', 'BOX', 'CARTON', 'PALLET']),
  minStockLevel: z.number().int().min(0).optional(),
  maxStockLevel: z.number().int().min(0).optional().nullable(),
  currentStock: z.number().int().min(0).optional(),
  costPrice: z.number().min(0).optional().nullable(),
  sellingPrice: z.number().min(0).optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED']).optional(),
  notes: z.string().optional().nullable(),
});

export const updateProductSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  nameAr: z.string().optional().nullable(),
  sku: z.string().min(1, 'SKU is required').optional(),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  unitOfMeasure: z.enum(['PIECE', 'KG', 'METER', 'LITER', 'BOX', 'CARTON', 'PALLET']).optional(),
  minStockLevel: z.number().int().min(0).optional(),
  maxStockLevel: z.number().int().min(0).optional().nullable(),
  costPrice: z.number().min(0).optional().nullable(),
  sellingPrice: z.number().min(0).optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED']).optional(),
  notes: z.string().optional().nullable(),
});

// ─── Stock Movement ──────────────────────────────────────────────────────────

export const createStockMovementSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'TRANSFER']),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  reason: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
});

// ─── Supplier ────────────────────────────────────────────────────────────────

export const createSupplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  nameAr: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  phone: phoneSchema,
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  nameAr: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  phone: phoneSchema,
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// ─── Product Supplier Link ───────────────────────────────────────────────────

export const linkProductSupplierSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID'),
  supplierSku: z.string().optional().nullable(),
  unitCost: z.number().min(0).optional().nullable(),
  leadTimeDays: z.number().int().min(0).optional().nullable(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateProductCategoryInput = z.infer<typeof createProductCategorySchema>;
export type UpdateProductCategoryInput = z.infer<typeof updateProductCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type LinkProductSupplierInput = z.infer<typeof linkProductSupplierSchema>;
