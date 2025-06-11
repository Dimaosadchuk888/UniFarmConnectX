import { pgTable, serial, text, timestamp, boolean, integer, decimal } from 'drizzle-orm/pg-core';

export const missions = pgTable('missions', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  mission_type: text('mission_type').notNull(), // 'daily', 'weekly', 'one_time', 'referral'
  target_value: integer('target_value'), // количество для выполнения
  reward_amount: decimal('reward_amount', { precision: 18, scale: 6 }).notNull(),
  reward_type: text('reward_type').notNull().default('UNI'), // 'UNI', 'TON', 'BOOST'
  requirements: text('requirements'), // JSON строка с требованиями
  start_date: timestamp('start_date'),
  end_date: timestamp('end_date'),
  is_active: boolean('is_active').default(true),
  is_repeatable: boolean('is_repeatable').default(false),
  sort_order: integer('sort_order').default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

export const userMissions = pgTable('user_missions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  mission_id: integer('mission_id').notNull(),
  status: text('status').notNull().default('active'), // 'active', 'completed', 'claimed'
  progress: integer('progress').default(0),
  completed_at: timestamp('completed_at'),
  claimed_at: timestamp('claimed_at'),
  reward_claimed: decimal('reward_claimed', { precision: 18, scale: 6 }),
  started_at: timestamp('started_at').defaultNow().notNull()
});

export type Mission = typeof missions.$inferSelect;
export type InsertMission = typeof missions.$inferInsert;
export type UserMission = typeof userMissions.$inferSelect;
export type InsertUserMission = typeof userMissions.$inferInsert;