import { pgTable, serial, text, timestamp, boolean, integer, bigint } from 'drizzle-orm/pg-core';

export const telegramUsers = pgTable('telegram_users', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  telegram_id: bigint('telegram_id', { mode: 'number' }).notNull().unique(),
  username: text('username'),
  first_name: text('first_name'),
  last_name: text('last_name'),
  language_code: text('language_code'),
  is_bot: boolean('is_bot').default(false),
  is_premium: boolean('is_premium').default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

export const telegramSessions = pgTable('telegram_sessions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  init_data: text('init_data').notNull(),
  hash: text('hash').notNull(),
  query_id: text('query_id'),
  auth_date: timestamp('auth_date').notNull(),
  expires_at: timestamp('expires_at').notNull(),
  is_valid: boolean('is_valid').default(true),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const telegramWebhooks = pgTable('telegram_webhooks', {
  id: serial('id').primaryKey(),
  update_id: bigint('update_id', { mode: 'number' }).notNull(),
  update_type: text('update_type').notNull(),
  user_id: integer('user_id'),
  telegram_id: bigint('telegram_id', { mode: 'number' }),
  payload: text('payload').notNull(),
  processed: boolean('processed').default(false),
  processed_at: timestamp('processed_at'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export type TelegramUser = typeof telegramUsers.$inferSelect;
export type InsertTelegramUser = typeof telegramUsers.$inferInsert;
export type TelegramSession = typeof telegramSessions.$inferSelect;
export type InsertTelegramSession = typeof telegramSessions.$inferInsert;
export type TelegramWebhook = typeof telegramWebhooks.$inferSelect;
export type InsertTelegramWebhook = typeof telegramWebhooks.$inferInsert;