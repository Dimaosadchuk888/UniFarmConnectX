/**
 * {{MODULE_NAME}} Validation Schemas
 * Zod schemas for request validation
 */

import { z } from 'zod';

// Query parameters validation
export const {{MODULE_NAME_LOWER}}QuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  // TODO: Add module-specific query parameters
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

// Create {{MODULE_NAME}} validation
export const create{{MODULE_NAME}}Schema = z.object({
  // TODO: Add required fields for creation
  // Examples:
  /*
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.enum(['UNI', 'TON']),
  type: z.string(),
  metadata: z.record(z.any()).optional()
  */
});

// Update {{MODULE_NAME}} validation
export const update{{MODULE_NAME}}Schema = z.object({
  // TODO: Add fields that can be updated
  // Usually partial of create schema
  /*
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'completed']).optional(),
  metadata: z.record(z.any()).optional()
  */
});

// Module-specific validations
// TODO: Add custom validation schemas based on module needs

/*
// Example: Process {{MODULE_NAME}} validation
export const process{{MODULE_NAME}}Schema = z.object({
  action: z.enum(['approve', 'reject', 'cancel']),
  reason: z.string().optional(),
  notify: z.boolean().default(true)
});

// Example: Bulk create validation
export const bulkCreate{{MODULE_NAME}}Schema = z.object({
  items: z.array(create{{MODULE_NAME}}Schema).min(1).max(100)
});

// Example: Filter validation
export const {{MODULE_NAME_LOWER}}FilterSchema = z.object({
  userId: z.string().optional(),
  status: z.array(z.string()).optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  tags: z.array(z.string()).optional()
});
*/

// Custom validators
export const validators = {
  // TODO: Add custom validation functions
  
  /**
   * Validate {{MODULE_NAME}} amount
   */
  validateAmount: (amount: number): boolean => {
    return amount > 0 && amount <= 1000000;
  },

  /**
   * Validate {{MODULE_NAME}} date range
   */
  validateDateRange: (startDate: Date, endDate: Date): boolean => {
    return startDate < endDate && endDate > new Date();
  },

  // Add more custom validators as needed
};

// Type exports for use in other files
export type {{MODULE_NAME}}Query = z.infer<typeof {{MODULE_NAME_LOWER}}QuerySchema>;
export type Create{{MODULE_NAME}}Input = z.infer<typeof create{{MODULE_NAME}}Schema>;
export type Update{{MODULE_NAME}}Input = z.infer<typeof update{{MODULE_NAME}}Schema>;