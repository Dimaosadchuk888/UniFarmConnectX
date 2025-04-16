import { pgTable, text, serial, integer, boolean, bigint, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Таблица с аутентификацией по имени пользователя и паролю
export const authUsers = pgTable("auth_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Таблица users по требованиям задачи
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegram_id: bigint("telegram_id", { mode: "number" }).unique(),
  username: text("username"),
  wallet: text("wallet"),
  balance_uni: numeric("balance_uni", { precision: 18, scale: 6 }).default("0"),
  balance_ton: numeric("balance_ton", { precision: 18, scale: 6 }).default("0"),
  // Поля для основного UNI фарминга
  uni_deposit_amount: numeric("uni_deposit_amount", { precision: 18, scale: 6 }).default("0"),
  uni_farming_start_timestamp: timestamp("uni_farming_start_timestamp"),
  uni_farming_balance: numeric("uni_farming_balance", { precision: 18, scale: 6 }).default("0"),
  uni_farming_last_update: timestamp("uni_farming_last_update"),
  created_at: timestamp("created_at").defaultNow(),
  checkin_last_date: timestamp("checkin_last_date"),
  checkin_streak: integer("checkin_streak").default(0)
});

// Таблица farming_deposits по требованиям задачи
export const farmingDeposits = pgTable("farming_deposits", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  amount_uni: numeric("amount_uni", { precision: 18, scale: 6 }),
  rate_uni: numeric("rate_uni", { precision: 5, scale: 2 }),
  rate_ton: numeric("rate_ton", { precision: 5, scale: 2 }),
  created_at: timestamp("created_at").defaultNow(),
  last_claim: timestamp("last_claim"),
  is_boosted: boolean("is_boosted").default(false)
});

// Схемы для аутентификации
export const insertAuthUserSchema = createInsertSchema(authUsers).pick({
  username: true,
  password: true,
});

export type InsertAuthUser = z.infer<typeof insertAuthUserSchema>;
export type AuthUser = typeof authUsers.$inferSelect;

// Схемы для таблицы users
export const insertUserSchema = createInsertSchema(users).pick({
  telegram_id: true,
  username: true,
  wallet: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Схемы для таблицы farming_deposits
export const insertFarmingDepositSchema = createInsertSchema(farmingDeposits).pick({
  user_id: true,
  amount_uni: true,
  rate_uni: true,
  rate_ton: true,
  last_claim: true
});

export type InsertFarmingDeposit = z.infer<typeof insertFarmingDepositSchema>;
export type FarmingDeposit = typeof farmingDeposits.$inferSelect;

// Таблица transactions по требованиям задачи
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  type: text("type"), // deposit / withdraw / reward
  currency: text("currency"), // UNI / TON
  amount: numeric("amount", { precision: 18, scale: 6 }),
  status: text("status"), // pending / confirmed / rejected
  created_at: timestamp("created_at").defaultNow()
});

// Схемы для таблицы transactions
export const insertTransactionSchema = createInsertSchema(transactions).pick({
  user_id: true,
  type: true,
  currency: true,
  amount: true,
  status: true
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Таблица referrals по требованиям задачи
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  inviter_id: integer("inviter_id").references(() => users.id),
  level: integer("level"), // Уровень (1–20)
  reward_uni: numeric("reward_uni", { precision: 18, scale: 6 }),
  created_at: timestamp("created_at").defaultNow()
});

// Схемы для таблицы referrals
export const insertReferralSchema = createInsertSchema(referrals).pick({
  user_id: true,
  inviter_id: true,
  level: true,
  reward_uni: true
});

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

// Таблица missions по требованиям задачи
export const missions = pgTable("missions", {
  id: serial("id").primaryKey(),
  type: text("type"), // Тип миссии: invite / social / check-in / deposit и т.д.
  title: text("title"), // Название миссии
  description: text("description"), // Подробное описание
  reward_uni: numeric("reward_uni", { precision: 18, scale: 6 }), // Награда в UNI
  is_active: boolean("is_active").default(true) // Активна ли миссия
});

// Схемы для таблицы missions
export const insertMissionSchema = createInsertSchema(missions).pick({
  type: true,
  title: true,
  description: true,
  reward_uni: true,
  is_active: true
});

export type InsertMission = z.infer<typeof insertMissionSchema>;
export type Mission = typeof missions.$inferSelect;

// Таблица user_missions для отслеживания выполнения миссий пользователями
export const userMissions = pgTable("user_missions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  mission_id: integer("mission_id").references(() => missions.id),
  completed_at: timestamp("completed_at").defaultNow()
});

// Схемы для таблицы user_missions
export const insertUserMissionSchema = createInsertSchema(userMissions).pick({
  user_id: true,
  mission_id: true,
  completed_at: true
});

export type InsertUserMission = z.infer<typeof insertUserMissionSchema>;
export type UserMission = typeof userMissions.$inferSelect;