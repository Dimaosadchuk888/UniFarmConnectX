import { pgTable, serial, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const authSessions = pgTable('auth_sessions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  session_token: text('session_token').notNull().unique(),
  refresh_token: text('refresh_token'),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  is_active: boolean('is_active').default(true)
});

export const authAttempts = pgTable('auth_attempts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id'),
  ip_address: text('ip_address').notNull(),
  user_agent: text('user_agent'),
  success: boolean('success').notNull(),
  attempt_type: text('attempt_type').notNull(), // 'login', 'register', 'refresh'
  created_at: timestamp('created_at').defaultNow().notNull()
});

export type AuthSession = typeof authSessions.$inferSelect;
export type InsertAuthSession = typeof authSessions.$inferInsert;
export type AuthAttempt = typeof authAttempts.$inferSelect;
export type InsertAuthAttempt = typeof authAttempts.$inferInsert;