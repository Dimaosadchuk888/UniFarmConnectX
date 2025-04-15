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

// Схемы для текущей аутентификации
export const insertAuthUserSchema = createInsertSchema(authUsers).pick({
  username: true,
  password: true,
});

export type InsertAuthUser = z.infer<typeof insertAuthUserSchema>;
export type AuthUser = typeof authUsers.$inferSelect;

// Схемы для новой таблицы users
export const insertUserSchema = createInsertSchema(users).pick({
  telegram_id: true,
  username: true,
  wallet: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
