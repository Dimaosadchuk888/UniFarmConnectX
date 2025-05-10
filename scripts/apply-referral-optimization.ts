/**
 * Скрипт для применения оптимизаций реферальной системы
 * 
 * Этот скрипт:
 * 1. Создает новые индексы для оптимизации запросов
 * 2. Создает таблицу reward_distribution_logs для журналирования операций
 * 3. Запускает восстановление прерванных операций из журнала (при наличии)
 * 
 * Запуск: npm run start:ts scripts/apply-referral-optimization.ts
 */

import { db } from '../server/db';
import { referralBonusProcessor } from '../server/services/referralBonusProcessor';
import { sql } from 'drizzle-orm';

/**
 * Выполняет прямые SQL-запросы для создания индексов
 */
async function createIndexes() {
  console.log('Creating database indexes for referral optimization...');
  
  try {
    // Создаем индекс для поиска по реферальным связям пользователя (если его нет)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON referrals(user_id);
    `);
    
    // Создаем индекс для поиска всех приглашенных пользователей
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_referrals_inviter_id ON referrals(inviter_id);
    `);
    
    // Создаем индекс для поиска по уровням
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_referrals_level ON referrals(level);
    `);
    
    // Создаем составной индекс для уникальности и ускорения поиска связей
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_user_inviter ON referrals(user_id, inviter_id);
    `);
    
    // Индексы для reward_distribution_logs
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_reward_logs_source_user ON reward_distribution_logs(source_user_id);
    `);
    
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_logs_batch_id ON reward_distribution_logs(batch_id);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_reward_logs_status ON reward_distribution_logs(status);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_reward_logs_processed_at ON reward_distribution_logs(processed_at);
    `);
    
    console.log('Indexes created successfully.');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

/**
 * Создает таблицу reward_distribution_logs если она не существует
 */
async function createRewardDistributionLogsTable() {
  console.log('Ensuring reward_distribution_logs table exists...');
  
  try {
    // Проверяем существование таблицы
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'reward_distribution_logs'
      );
    `);
    
    const exists = tableExists.rows && tableExists.rows[0] && tableExists.rows[0].exists === true;
    
    if (exists) {
      console.log('Table reward_distribution_logs already exists.');
    } else {
      console.log('Creating reward_distribution_logs table...');
      
      await db.execute(sql`
        CREATE TABLE reward_distribution_logs (
          id SERIAL PRIMARY KEY,
          source_user_id INTEGER NOT NULL,
          batch_id TEXT NOT NULL,
          currency TEXT NOT NULL,
          earned_amount NUMERIC(18, 6) NOT NULL,
          total_distributed NUMERIC(18, 6) DEFAULT '0',
          levels_processed INTEGER DEFAULT 0,
          inviter_count INTEGER DEFAULT 0,
          status TEXT DEFAULT 'pending',
          error_message TEXT,
          processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMP
        );
      `);
      
      console.log('Table reward_distribution_logs created successfully.');
    }
  } catch (error) {
    console.error('Error creating reward_distribution_logs table:', error);
  }
}

/**
 * Анализирует таблицы после создания индексов
 */
async function analyzeAllTables() {
  console.log('Analyzing tables...');
  
  try {
    await db.execute(sql`ANALYZE referrals;`);
    await db.execute(sql`ANALYZE reward_distribution_logs;`);
    await db.execute(sql`ANALYZE users;`);
    await db.execute(sql`ANALYZE transactions;`);
    
    console.log('Tables analyzed successfully.');
  } catch (error) {
    console.error('Error analyzing tables:', error);
  }
}

/**
 * Запускает восстановление прерванных операций
 */
async function recoverFailedOperations() {
  console.log('Recovering any failed operations...');
  
  try {
    const recoveredCount = await referralBonusProcessor.recoverFailedProcessing();
    
    if (recoveredCount > 0) {
      console.log(`Queued ${recoveredCount} failed operations for recovery.`);
    } else {
      console.log('No failed operations to recover.');
    }
  } catch (error) {
    console.error('Error recovering failed operations:', error);
  }
}

/**
 * Главная функция скрипта
 */
async function main() {
  console.log('Starting referral optimization application...');
  
  try {
    // Шаг 1: Создаем таблицу для журналирования
    await createRewardDistributionLogsTable();
    
    // Шаг 2: Создаем индексы для оптимизации
    await createIndexes();
    
    // Шаг 3: Анализируем таблицы
    await analyzeAllTables();
    
    // Шаг 4: Восстанавливаем прерванные операции
    await recoverFailedOperations();
    
    console.log('Referral optimization applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error applying referral optimization:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
main().catch(error => {
  console.error('Unhandled error in main function:', error);
  process.exit(1);
});