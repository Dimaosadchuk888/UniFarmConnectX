import { pgTable, serial, text, timestamp, boolean, integer, decimal } from 'drizzle-orm/pg-core';

export const dailyBonuses = pgTable('daily_bonuses', {
  id: serial('id').primaryKey(),
  day_number: integer('day_number').notNull(),
  bonus_amount: decimal('bonus_amount', { precision: 18, scale: 6 }).notNull(),
  bonus_type: text('bonus_type').notNull().default('UNI'), // 'UNI', 'TON', 'MULTIPLIER'
  multiplier: decimal('multiplier', { precision: 3, scale: 2 }),
  description: text('description'),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const userDailyBonuses = pgTable('user_daily_bonuses', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  bonus_id: integer('bonus_id').notNull(),
  day_number: integer('day_number').notNull(),
  claimed_amount: decimal('claimed_amount', { precision: 18, scale: 6 }).notNull(),
  claimed_at: timestamp('claimed_at').defaultNow().notNull(),
  streak_count: integer('streak_count').default(1)
});

export const userStreaks = pgTable('user_streaks', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().unique(),
  current_streak: integer('current_streak').default(0),
  longest_streak: integer('longest_streak').default(0),
  last_claim_date: timestamp('last_claim_date'),
  next_available_claim: timestamp('next_available_claim'),
  total_bonuses_claimed: integer('total_bonuses_claimed').default(0),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

export type DailyBonus = typeof dailyBonuses.$inferSelect;
export type InsertDailyBonus = typeof dailyBonuses.$inferInsert;
export type UserDailyBonus = typeof userDailyBonuses.$inferSelect;
export type InsertUserDailyBonus = typeof userDailyBonuses.$inferInsert;
export type UserStreak = typeof userStreaks.$inferSelect;
export type InsertUserStreak = typeof userStreaks.$inferInsert;