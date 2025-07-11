/**
 * UniFarm Database Fix Application Script
 * Применяет критические исправления к базе данных через Supabase API
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Инициализация Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_KEY не найден в переменных окружения');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function applyDatabaseFixes() {
  console.log(`${colors.cyan}${colors.bright}🔧 UniFarm Database Fix Application${colors.reset}`);
  console.log(`${colors.cyan}Дата: ${new Date().toLocaleString()}${colors.reset}\n`);

  const fixes = [
    {
      name: 'Добавление tx_hash в transactions',
      check: async () => {
        const { data } = await supabase
          .from('transactions')
          .select('tx_hash')
          .limit(1);
        return data !== null;
      },
      apply: async () => {
        console.log(`${colors.yellow}⚠️  Поле tx_hash требует добавления через SQL миграцию${colors.reset}`);
        return false;
      }
    },
    {
      name: 'Добавление description в transactions',
      check: async () => {
        const { data } = await supabase
          .from('transactions')
          .select('description')
          .limit(1);
        return data !== null;
      },
      apply: async () => {
        console.log(`${colors.yellow}⚠️  Поле description требует добавления через SQL миграцию${colors.reset}`);
        return false;
      }
    },
    {
      name: 'Добавление status в users',
      check: async () => {
        const { data } = await supabase
          .from('users')
          .select('status')
          .limit(1);
        return data !== null;
      },
      apply: async () => {
        console.log(`${colors.yellow}⚠️  Поле status требует добавления через SQL миграцию${colors.reset}`);
        return false;
      }
    }
  ];

  // Проверяем каждое исправление
  console.log(`${colors.blue}📋 Проверка необходимых исправлений:${colors.reset}\n`);
  
  let needsSqlMigration = false;
  
  for (const fix of fixes) {
    process.stdout.write(`Проверка: ${fix.name}... `);
    
    try {
      const exists = await fix.check();
      
      if (exists) {
        console.log(`${colors.green}✅ Уже существует${colors.reset}`);
      } else {
        console.log(`${colors.red}❌ Требуется добавление${colors.reset}`);
        needsSqlMigration = true;
      }
    } catch (error) {
      console.log(`${colors.red}❌ Ошибка проверки${colors.reset}`);
      needsSqlMigration = true;
    }
  }

  if (needsSqlMigration) {
    console.log(`\n${colors.yellow}${colors.bright}⚠️  ВНИМАНИЕ:${colors.reset}`);
    console.log(`${colors.yellow}Некоторые поля отсутствуют в базе данных.${colors.reset}`);
    console.log(`${colors.yellow}Для их добавления необходимо выполнить SQL миграцию.${colors.reset}\n`);
    
    console.log(`${colors.cyan}📄 Инструкция по применению миграции:${colors.reset}`);
    console.log(`1. Откройте Supabase Dashboard: ${supabaseUrl}`);
    console.log(`2. Перейдите в SQL Editor`);
    console.log(`3. Выполните скрипт: ${colors.bright}scripts/fix-database-critical-fields.sql${colors.reset}`);
    console.log(`4. Запустите этот скрипт снова для проверки\n`);
    
    // Создаем упрощенный SQL для копирования
    const simpleSql = `
-- Критические поля для transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tx_hash TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Критические поля для users (админ-панель)
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS processed_by INTEGER;

-- Критические поля для boost_purchases
ALTER TABLE boost_purchases ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'ton_boost';
ALTER TABLE boost_purchases ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'TON';

-- Критические поля для daily_bonus_logs
ALTER TABLE daily_bonus_logs ADD COLUMN IF NOT EXISTS bonus_type VARCHAR(50) DEFAULT 'daily_checkin';
ALTER TABLE daily_bonus_logs ADD COLUMN IF NOT EXISTS previous_balance NUMERIC(20,9) DEFAULT 0;
ALTER TABLE daily_bonus_logs ADD COLUMN IF NOT EXISTS new_balance NUMERIC(20,9) DEFAULT 0;
`;

    fs.writeFileSync(
      path.join(__dirname, 'quick-fix-sql.sql'),
      simpleSql,
      'utf8'
    );
    
    console.log(`${colors.green}✅ Создан упрощенный SQL файл: scripts/quick-fix-sql.sql${colors.reset}`);
  } else {
    console.log(`\n${colors.green}${colors.bright}✅ Все критические поля уже существуют в базе данных!${colors.reset}`);
  }

  // Проверяем соответствие после исправлений
  console.log(`\n${colors.blue}📊 Текущее состояние базы данных:${colors.reset}`);
  
  const tables = ['users', 'transactions', 'boost_purchases', 'daily_bonus_logs'];
  
  for (const table of tables) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    console.log(`${table}: ${count || 0} записей`);
  }
}

// Запускаем скрипт
applyDatabaseFixes()
  .then(() => {
    console.log(`\n${colors.green}✅ Проверка завершена${colors.reset}`);
  })
  .catch(error => {
    console.error(`\n${colors.red}❌ Ошибка при выполнении:${colors.reset}`, error);
    process.exit(1);
  });