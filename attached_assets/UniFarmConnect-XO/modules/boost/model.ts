import { pgTable, serial, text, timestamp, boolean, integer, decimal } from 'drizzle-orm/pg-core';

export const boostPackages = pgTable('boost_packages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  daily_rate: decimal('daily_rate', { precision: 5, scale: 4 }).notNull(),
  min_amount: decimal('min_amount', { precision: 18, scale: 6 }).notNull(),
  max_amount: decimal('max_amount', { precision: 18, scale: 6 }),
  duration_days: integer('duration_days').notNull(),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

export const userBoosts = pgTable('user_boosts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  package_id: integer('package_id').notNull(),
  amount: decimal('amount', { precision: 18, scale: 6 }).notNull(),
  daily_rate: decimal('daily_rate', { precision: 5, scale: 4 }).notNull(),
  start_date: timestamp('start_date').defaultNow().notNull(),
  end_date: timestamp('end_date').notNull(),
  last_claim: timestamp('last_claim'),
  total_earned: decimal('total_earned', { precision: 18, scale: 6 }).default('0'),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export type BoostPackage = typeof boostPackages.$inferSelect;
export type InsertBoostPackage = typeof boostPackages.$inferInsert;
export type UserBoost = typeof userBoosts.$inferSelect;
export type InsertUserBoost = typeof userBoosts.$inferInsert;