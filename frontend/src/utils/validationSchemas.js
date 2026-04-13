import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z
  .string({ message: 'Email is required' })
  .email('Please enter a valid email address');

/**
 * Password validation schema
 * Requires at least 8 characters
 */
export const passwordSchema = z
  .string({ message: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Forgot password form validation schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Reset password form validation schema
 */
export const resetPasswordSchema = z.object({
  token: z
    .string({ message: 'Reset token is required' })
    .min(1, 'Reset token cannot be empty'),
  newPassword: passwordSchema,
  confirmPassword: z
    .string({ message: 'Password confirmation is required' })
    .min(1, 'Password confirmation cannot be empty'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
