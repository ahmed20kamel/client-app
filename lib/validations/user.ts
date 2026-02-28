import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  roleId: z.string().uuid('Invalid role ID'),
  status: z.enum(['ACTIVE', 'DISABLED']),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number, and special character'
    )
    .optional(),
  roleId: z.string().uuid('Invalid role ID').optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
