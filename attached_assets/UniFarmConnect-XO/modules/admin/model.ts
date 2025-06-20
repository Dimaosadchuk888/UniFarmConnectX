import { pgTable, serial, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const adminLogs = pgTable('admin_logs', {
  id: serial('id').primaryKey(),
  admin_id: integer('admin_id').notNull(),
  action: text('action').notNull(),
  details: text('details'),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  role: text('role').notNull().default('moderator'),
  permissions: text('permissions').array(),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = typeof adminLogs.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;