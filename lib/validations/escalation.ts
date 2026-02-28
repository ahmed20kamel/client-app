import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  nameAr: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  parentId: z.string().uuid('Invalid parent department ID').optional().nullable(),
  managerId: z.string().uuid('Invalid manager ID').optional().nullable(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const createTaskCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  nameAr: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  icon: z.string().optional().nullable(),
});

export const updateTaskCategorySchema = createTaskCategorySchema.partial();

export const createEscalationRuleSchema = z.object({
  departmentId: z.string().uuid('Invalid department ID').optional().nullable(),
  name: z.string().min(2, 'Rule name must be at least 2 characters'),
  description: z.string().optional().nullable(),
  triggerType: z.enum(['OVERDUE_HOURS', 'OVERDUE_DAYS']),
  triggerValue: z.number().int().positive('Trigger value must be positive'),
  action: z.enum(['NOTIFY_MANAGER', 'ESCALATE_PRIORITY', 'REASSIGN', 'NOTIFY_TEAM']),
  targetPriority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateEscalationRuleSchema = createEscalationRuleSchema.partial();

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type CreateTaskCategoryInput = z.infer<typeof createTaskCategorySchema>;
export type UpdateTaskCategoryInput = z.infer<typeof updateTaskCategorySchema>;
export type CreateEscalationRuleInput = z.infer<typeof createEscalationRuleSchema>;
export type UpdateEscalationRuleInput = z.infer<typeof updateEscalationRuleSchema>;
