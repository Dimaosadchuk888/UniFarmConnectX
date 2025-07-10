/**
 * {{MODULE_NAME}} Types and Interfaces
 * Type definitions for {{MODULE_NAME}} module
 */

// Database entity type (matches database schema)
export interface {{MODULE_NAME}} {
  id: string;
  user_id: string;
  // TODO: Add fields based on database schema
  created_at: Date;
  updated_at?: Date;
}

// Request types for API endpoints
export interface Create{{MODULE_NAME}}Request {
  // TODO: Add required fields for creation
}

export interface Update{{MODULE_NAME}}Request {
  // TODO: Add fields that can be updated
}

// Internal data types (used by service/repository)
export interface Create{{MODULE_NAME}}Data extends Create{{MODULE_NAME}}Request {
  user_id: string;
  created_at: Date;
}

export interface Update{{MODULE_NAME}}Data extends Partial<Update{{MODULE_NAME}}Request> {
  updated_at?: Date;
}

// Response types for API
export interface {{MODULE_NAME}}Response extends {{MODULE_NAME}} {
  // Additional computed fields for API response
}

export interface {{MODULE_NAME}}ListResponse {
  {{MODULE_NAME_LOWER}}s: {{MODULE_NAME}}Response[];
  total: number;
  page: number;
  limit: number;
}

// Filter and query types
export interface {{MODULE_NAME}}Filter {
  user_id?: string;
  status?: string;
  // TODO: Add more filter fields
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: keyof {{MODULE_NAME}};
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Statistics and aggregation types
export interface {{MODULE_NAME}}Stats {
  total: number;
  active: number;
  // TODO: Add more statistics fields
}

// Validation types
export interface {{MODULE_NAME}}ValidationResult {
  valid: boolean;
  error?: string;
  details?: Record<string, string>;
}

// Event types (if module emits events)
export interface {{MODULE_NAME}}Event {
  type: {{MODULE_NAME}}EventType;
  {{MODULE_NAME_LOWER}}Id: string;
  userId: string;
  data: any;
  timestamp: Date;
}

export enum {{MODULE_NAME}}EventType {
  CREATED = '{{MODULE_NAME_LOWER}}.created',
  UPDATED = '{{MODULE_NAME_LOWER}}.updated',
  DELETED = '{{MODULE_NAME_LOWER}}.deleted',
  // TODO: Add more event types
}

// Status enums (if applicable)
export enum {{MODULE_NAME}}Status {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  // TODO: Adjust status values based on module needs
}

// Error types
export class {{MODULE_NAME}}Error extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = '{{MODULE_NAME}}Error';
  }
}

export enum {{MODULE_NAME}}ErrorCode {
  NOT_FOUND = '{{MODULE_NAME_UPPER}}_NOT_FOUND',
  INVALID_DATA = '{{MODULE_NAME_UPPER}}_INVALID_DATA',
  UNAUTHORIZED = '{{MODULE_NAME_UPPER}}_UNAUTHORIZED',
  ALREADY_EXISTS = '{{MODULE_NAME_UPPER}}_ALREADY_EXISTS',
  // TODO: Add more error codes
}

// Helper type utilities
export type {{MODULE_NAME}}ID = string;
export type {{MODULE_NAME}}CreateInput = Omit<{{MODULE_NAME}}, 'id' | 'created_at' | 'updated_at'>;
export type {{MODULE_NAME}}UpdateInput = Partial<{{MODULE_NAME}}CreateInput>;

// Type guards
export function is{{MODULE_NAME}}(obj: any): obj is {{MODULE_NAME}} {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'user_id' in obj
    // TODO: Add more type guard checks
  );
}

export function is{{MODULE_NAME}}Status(status: any): status is {{MODULE_NAME}}Status {
  return Object.values({{MODULE_NAME}}Status).includes(status);
}

// Zod schemas for validation (if using zod)
/*
import { z } from 'zod';

export const {{MODULE_NAME}}Schema = z.object({
  id: z.string(),
  user_id: z.string(),
  // TODO: Add zod schema fields
  created_at: z.date(),
  updated_at: z.date().optional(),
});

export const Create{{MODULE_NAME}}Schema = {{MODULE_NAME}}Schema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const Update{{MODULE_NAME}}Schema = Create{{MODULE_NAME}}Schema.partial();
*/