import { z } from 'zod';

export const createTaskSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  assignedToId: z.string().uuid('Invalid user ID'),
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  dueAt: z.string().min(1, 'Due date is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  status: z.enum(['OPEN', 'DONE', 'OVERDUE', 'CANCELED']),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  departmentId: z.string().uuid('Invalid department ID').optional().nullable(),
  slaDeadline: z.string().optional().nullable(),
});

export const updateTaskSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID').optional(),
  assignedToId: z.string().uuid('Invalid user ID').optional(),
  title: z.string().min(2, 'Title must be at least 2 characters').optional(),
  description: z.string().optional(),
  dueAt: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  status: z.enum(['OPEN', 'DONE', 'OVERDUE', 'CANCELED']).optional(),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  departmentId: z.string().uuid('Invalid department ID').optional().nullable(),
  escalationLevel: z.number().int().min(0).max(2).optional(),
  slaDeadline: z.string().optional().nullable(),
});

export const taskCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
  type: z.enum(['COMMENT', 'STATUS_CHANGE', 'REASSIGNMENT', 'ESCALATION', 'SYSTEM']).optional(),
  metadata: z.string().optional(),
});

export const reassignTaskSchema = z.object({
  assignedToId: z.string().uuid('Invalid user ID'),
  reason: z.string().optional(),
});

export const escalateTaskSchema = z.object({
  escalationLevel: z.number().int().min(1).max(2),
  reason: z.string().min(1, 'Escalation reason is required'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskCommentInput = z.infer<typeof taskCommentSchema>;
export type ReassignTaskInput = z.infer<typeof reassignTaskSchema>;
export type EscalateTaskInput = z.infer<typeof escalateTaskSchema>;
