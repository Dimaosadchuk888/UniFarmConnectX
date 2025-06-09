/**
 * Database schema for UniFarm application
 * Using Drizzle ORM with PostgreSQL
 */

import { pgTable, serial, text, integer, numeric, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enums
export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  FARMING_REWARD = 'farming_reward',
  REFERRAL_REWARD = 'referral_reward',
  DAILY_BONUS = 'daily_bonus',
  MISSION_REWARD = 'mission_reward',
  BOOST_PURCHASE = 'boost_purchase',
  ADMIN_ADJUSTMENT = 'admin_adjustment'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum FarmingType {
  UNI_FARMING = 'uni_farming',
  TON_FARMING = 'ton_farming',
  BOOST_FARMING = 'boost_farming'
}

export enum FarmingStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  HARVESTED = 'harvested',
  CANCELLED = 'cancelled'
}

export enum RewardType {
  BASE_REWARD = 'base_reward',
  BOOST_REWARD = 'boost_reward',
  REFERRAL_BONUS = 'referral_bonus',
  LEVEL_BONUS = 'level_bonus'
}

export enum ReferralStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMPLETED = 'completed'
}

export enum ReferralEarningType {
  SIGNUP_BONUS = 'signup_bonus',
  FARMING_COMMISSION = 'farming_commission',
  TRANSACTION_COMMISSION = 'transaction_commission',
  LEVEL_BONUS = 'level_bonus'
}

// Tables
export const authUsers = pgTable("auth_users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegram_id: text("telegram_id").unique(),
  guest_id: text("guest_id").unique(),
  username: text("username"),
  wallet: text("wallet"),
  ton_wallet_address: text("ton_wallet_address"),
  ref_code: text("ref_code").unique(),
  parent_ref_code: text("parent_ref_code"),
  balance_uni: numeric("balance_uni", { precision: 18, scale: 6 }).default('0'),
  balance_ton: numeric("balance_ton", { precision: 18, scale: 6 }).default('0'),
  // Farming fields
  uni_farming_last_update: timestamp("uni_farming_last_update"),
  uni_farming_start_timestamp: timestamp("uni_farming_start_timestamp"),
  uni_farming_balance: numeric("uni_farming_balance", { precision: 18, scale: 6 }).default('0'),
  uni_deposit_amount: numeric("uni_deposit_amount", { precision: 18, scale: 6 }).default('0'),
  uni_farming_rate: numeric("uni_farming_rate", { precision: 18, scale: 6 }).default('0'),
  // Daily bonus fields
  checkin_last_date: text("checkin_last_date"),
  checkin_streak: integer("checkin_streak").default(0),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

export const farmingDeposits = pgTable("farming_deposits", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  amount_uni: numeric("amount_uni", { precision: 18, scale: 6 }).notNull(),
  rate_uni: numeric("rate_uni", { precision: 18, scale: 6 }).notNull(),
  rate_ton: numeric("rate_ton", { precision: 18, scale: 6 }).notNull(),
  last_claim: timestamp("last_claim"),
  is_boosted: boolean("is_boosted").default(false),
  deposit_type: text("deposit_type"),
  boost_id: integer("boost_id"),
  expires_at: timestamp("expires_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  transaction_type: text("transaction_type").notNull(),
  currency: text("currency").notNull(),
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),
  status: text("status").default('pending'),
  source: text("source"),
  category: text("category"),
  tx_hash: text("tx_hash"),
  description: text("description"),
  source_user_id: integer("source_user_id"),
  wallet_address: text("wallet_address"),
  data: text("data"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  inviter_id: integer("inviter_id").references(() => users.id),
  level: integer("level").default(1),
  reward_uni: numeric("reward_uni", { precision: 18, scale: 6 }).default('0'),
  ref_path: text("ref_path"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

export const missions = pgTable("missions", {
  id: serial("id").primaryKey(),
  type: text("type"),
  title: text("title"),
  description: text("description"),
  reward_uni: numeric("reward_uni", { precision: 18, scale: 6 }),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

export const userMissions = pgTable("user_missions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  mission_id: integer("mission_id").references(() => missions.id).notNull(),
  completed_at: timestamp("completed_at").defaultNow()
});

// Schema exports using proper createInsertSchema approach
export const insertAuthUserSchema = createInsertSchema(authUsers);
export const insertUserSchema = createInsertSchema(users);
export const insertFarmingDepositSchema = createInsertSchema(farmingDeposits);
export const insertTransactionSchema = createInsertSchema(transactions);
export const insertReferralSchema = createInsertSchema(referrals);
export const insertMissionSchema = createInsertSchema(missions);
export const insertUserMissionSchema = createInsertSchema(userMissions);

// Type exports
export type InsertAuthUser = z.infer<typeof insertAuthUserSchema>;
export type AuthUser = typeof authUsers.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertFarmingDeposit = z.infer<typeof insertFarmingDepositSchema>;
export type FarmingDeposit = typeof farmingDeposits.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

export type InsertMission = z.infer<typeof insertMissionSchema>;
export type Mission = typeof missions.$inferSelect;

export type InsertUserMission = z.infer<typeof insertUserMissionSchema>;
export type UserMission = typeof userMissions.$inferSelect;