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
  ton_wallet_address: text("ton_wallet_address"), // Новое поле для хранения TON-адреса кошелька
  ref_code: text("ref_code").unique(), // Уникальный реферальный код для пользователя
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
  is_boosted: boolean("is_boosted").default(false),
  deposit_type: text("deposit_type").default("regular"), // regular, boost_1, boost_5, boost_15, boost_25
  boost_id: integer("boost_id"), // ID буст-пакета (1, 2, 3, 4)
  expires_at: timestamp("expires_at") // Для буст-пакетов (срок 365 дней)
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
  ton_wallet_address: true,
  ref_code: true, // Добавляем поле ref_code в схему вставки
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Схемы для таблицы farming_deposits
export const insertFarmingDepositSchema = createInsertSchema(farmingDeposits).pick({
  user_id: true,
  amount_uni: true,
  rate_uni: true,
  rate_ton: true,
  last_claim: true,
  is_boosted: true,
  deposit_type: true,
  boost_id: true,
  expires_at: true
});

export type InsertFarmingDeposit = z.infer<typeof insertFarmingDepositSchema>;
export type FarmingDeposit = typeof farmingDeposits.$inferSelect;

// Таблица transactions по требованиям задачи
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  type: text("type"), // deposit / withdraw / reward / boost_bonus
  currency: text("currency"), // UNI / TON
  amount: numeric("amount", { precision: 18, scale: 6 }),
  status: text("status"), // pending / confirmed / rejected
  source: text("source"), // источник транзакции (например, "TON Boost")
  category: text("category"), // категория транзакции (например, "bonus")
  tx_hash: text("tx_hash"), // хеш транзакции для блокчейн-операций
  created_at: timestamp("created_at").defaultNow()
});

// Схемы для таблицы transactions
export const insertTransactionSchema = createInsertSchema(transactions).pick({
  user_id: true,
  type: true,
  currency: true,
  amount: true,
  status: true,
  source: true,
  category: true,
  tx_hash: true
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
  reward_uni: true,
  created_at: true
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

// Таблица для хранения UNI фарминг-депозитов
export const uniFarmingDeposits = pgTable("uni_farming_deposits", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(), // Сумма UNI в депозите
  created_at: timestamp("created_at").defaultNow().notNull(), // Дата открытия
  rate_per_second: numeric("rate_per_second", { precision: 20, scale: 18 }).notNull(), // Расчетная скорость фарминга
  last_updated_at: timestamp("last_updated_at").defaultNow().notNull(), // Время последнего начисления
  is_active: boolean("is_active").default(true), // Активен ли депозит
});

// Схемы для таблицы uni_farming_deposits
export const insertUniFarmingDepositSchema = createInsertSchema(uniFarmingDeposits).pick({
  user_id: true,
  amount: true,
  rate_per_second: true,
  is_active: true
});

export type InsertUniFarmingDeposit = z.infer<typeof insertUniFarmingDepositSchema>;
export type UniFarmingDeposit = typeof uniFarmingDeposits.$inferSelect;

// Таблица для хранения TON Boost-депозитов
export const tonBoostDeposits = pgTable("ton_boost_deposits", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  ton_amount: numeric("ton_amount", { precision: 18, scale: 5 }).notNull(), // Сумма TON в депозите
  bonus_uni: numeric("bonus_uni", { precision: 18, scale: 6 }).notNull(), // Единоразовый бонус UNI
  rate_ton_per_second: numeric("rate_ton_per_second", { precision: 20, scale: 18 }).notNull(), // Скорость фарминга TON
  rate_uni_per_second: numeric("rate_uni_per_second", { precision: 20, scale: 18 }).notNull(), // Скорость фарминга UNI
  accumulated_ton: numeric("accumulated_ton", { precision: 18, scale: 10 }).default("0"), // Накопленный TON, ожидающий начисления
  created_at: timestamp("created_at").defaultNow().notNull(), // Дата открытия
  last_updated_at: timestamp("last_updated_at").defaultNow().notNull(), // Время последнего начисления
  is_active: boolean("is_active").default(true) // Активен ли буст
});

// Схемы для таблицы ton_boost_deposits
export const insertTonBoostDepositSchema = createInsertSchema(tonBoostDeposits).pick({
  user_id: true,
  ton_amount: true,
  bonus_uni: true,
  rate_ton_per_second: true,
  rate_uni_per_second: true,
  accumulated_ton: true,
  is_active: true
});

export type InsertTonBoostDeposit = z.infer<typeof insertTonBoostDepositSchema>;
export type TonBoostDeposit = typeof tonBoostDeposits.$inferSelect;