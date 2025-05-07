import { users, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import type { IStorage } from './storage-memory';

// Реализация хранилища с использованием базы данных
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByGuestId(guestId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.guest_id, guestId));
    return user || undefined;
  }

  async getUserByRefCode(refCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.ref_code, refCode));
    return user || undefined;
  }

  async updateUserRefCode(userId: number, refCode: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ref_code: refCode })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  generateRefCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }

  async generateUniqueRefCode(): Promise<string> {
    let refCode = this.generateRefCode();
    let isUnique = await this.isRefCodeUnique(refCode);
    
    // Пробуем до 10 раз сгенерировать уникальный код
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      refCode = this.generateRefCode();
      isUnique = await this.isRefCodeUnique(refCode);
      attempts++;
    }
    
    return refCode;
  }

  async isRefCodeUnique(refCode: string): Promise<boolean> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.ref_code, refCode));
    // Если пользователей с таким ref_code нет, то код уникален
    return result.length === 0;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();