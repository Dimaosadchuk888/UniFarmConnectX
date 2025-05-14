import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Проверяем наличие URL базы данных
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Устанавливаем SSL только если в URL есть параметр sslmode
  ssl: process.env.DATABASE_URL.includes('sslmode=require') ? {
    rejectUnauthorized: false
  } : undefined
});

export const db = drizzle(pool, { schema });