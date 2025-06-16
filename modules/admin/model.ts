/**
 * Admin Model - Supabase Integration
 * Константы и типы для административных операций
 */

// Supabase table constants
export const ADMIN_TABLES = {
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  FARMING_SESSIONS: 'farming_sessions',
  USER_SESSIONS: 'user_sessions'
} as const;

// Admin action types
export const ADMIN_ACTIONS = {
  USER_MODERATE: 'user_moderate',
  USER_BAN: 'user_ban',
  USER_UNBAN: 'user_unban',
  SYSTEM_STATS: 'system_stats',
  MISSION_MANAGE: 'mission_manage'
} as const;

// Admin roles
export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  MODERATOR: 'moderator',
  VIEWER: 'viewer'
} as const;

// Default pagination
export const ADMIN_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
} as const;