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
  created_at: timestamp("created_at").defaultNow()
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