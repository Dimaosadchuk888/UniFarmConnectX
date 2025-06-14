import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

// Production database URL для ep-lucky-boat-a463bggt
const PRODUCTION_DATABASE_URL = 'postgresql://neondb_owner:npg_SpgdNBV70WKl@ep-lucky-boat-a463bggt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Используем production базу вместо environment переменной
const DATABASE_URL = PRODUCTION_DATABASE_URL;

console.log('🔗 Database connection:', DATABASE_URL.substring(0, 50) + '...');

export const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle({ client: pool, schema });