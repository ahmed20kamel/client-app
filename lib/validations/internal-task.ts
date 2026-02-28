import { z } from 'zod';

export const createInternalTaskSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  assignedToId: z.string().uuid('Invalid user ID'),
  departmentId: z.string().uuid('Invalid department ID').optional().nullable(),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dueAt: z.string().optional().nullable(),
});

export const updateInternalTaskSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').optional(),
  description: z.string().optional(),
  assignedToId: z.string().uuid('Invalid user ID').optional(),
  departmentId: z.string().uuid('Invalid department ID').optional().nullable(),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueAt: z.string().optional().nullable(),
});

export const approveTaskSchema = z.object({
  comment: z.string().optional(),
});

export const rejectTaskSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
});

export const rateTaskSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export const internalTaskCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
});

export const createPerformanceReviewSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  period: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']),
  periodStart: z.string().min(1, 'Period start is required'),
  periodEnd: z.string().min(1, 'Period end is required'),
  overallRating: z.number().int().min(1).max(5),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  notes: z.string().optional(),
});

export const updatePerformanceReviewSchema = z.object({
  overallRating: z.number().int().min(1).max(5).optional(),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export type CreateInternalTaskInput = z.infer<typeof createInternalTaskSchema>;
export type UpdateInternalTaskInput = z.infer<typeof updateInternalTaskSchema>;
export type ApproveTaskInput = z.infer<typeof approveTaskSchema>;
export type RejectTaskInput = z.infer<typeof rejectTaskSchema>;
export type RateTaskInput = z.infer<typeof rateTaskSchema>;
export type InternalTaskCommentInput = z.infer<typeof internalTaskCommentSchema>;
export type CreatePerformanceReviewInput = z.infer<typeof createPerformanceReviewSchema>;
export type UpdatePerformanceReviewInput = z.infer<typeof updatePerformanceReviewSchema>;
