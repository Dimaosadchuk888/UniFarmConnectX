/**
 * Скрипт синхронизации таблиц Supabase для UniFarm
 * Создает недостающие таблицы и заполняет пустые данными
 * 
 * ВАЖНО: Этот скрипт требует выполнения SQL команд напрямую в Supabase Dashboard
 * так как Supabase API не поддерживает DDL операции (CREATE TABLE, ALTER TABLE)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: Не найдены переменные окружения VITE_SUPABASE_URL или SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createMissingTables() {
  console.log('🔨 Создание недостающих таблиц...\n');

  // 1. Создание таблицы user_sessions
  const createUserSessions = `
    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
  `;

  // 2. Создание таблицы user_missions
  const createUserMissions = `
    CREATE TABLE IF NOT EXISTS user_missions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mission_id INTEGER NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      progress INTEGER DEFAULT 0,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, mission_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_user_missions_user ON user_missions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_missions_mission ON user_missions(mission_id);
  `;

  // 3. Создание таблицы daily_bonus_logs
  const createDailyBonusLogs = `
    CREATE TABLE IF NOT EXISTS daily_bonus_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bonus_amount DECIMAL(20,6) NOT NULL,
      day_number INTEGER NOT NULL,
      streak_bonus DECIMAL(20,6) DEFAULT 0,
      claimed_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_daily_bonus_user_date ON daily_bonus_logs(user_id, claimed_at);
  `;

  // 4. Создание таблицы airdrops
  const createAirdrops = `
    CREATE TABLE IF NOT EXISTS airdrops (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      total_amount DECIMAL(20,6) NOT NULL,
      participants_count INTEGER DEFAULT 0,
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const tables = [
    { name: 'user_sessions', sql: createUserSessions },
    { name: 'user_missions', sql: createUserMissions },
    { name: 'daily_bonus_logs', sql: createDailyBonusLogs },
    { name: 'airdrops', sql: createAirdrops }
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: table.sql });
      if (error) {
        console.error(`❌ Ошибка создания таблицы ${table.name}:`, error.message);
      } else {
        console.log(`✅ Таблица ${table.name} создана успешно`);
      }
    } catch (err) {
      console.error(`❌ Ошибка при создании ${table.name}:`, err);
    }
  }
}

async function fillEmptyTables() {
  console.log('\n📥 Заполнение пустых таблиц базовыми данными...\n');

  // Заполнение таблицы missions
  const missions = [
    {
      id: 1,
      title: 'Первый депозит',
      description: 'Сделайте первый депозит UNI в фарминг',
      reward_uni: 10,
      reward_ton: 0,
      type: 'one_time',
      status: 'active'
    },
    {
      id: 2,
      title: 'Пригласи друга',
      description: 'Пригласите минимум 1 друга в UniFarm',
      reward_uni: 5,
      reward_ton: 0,
      type: 'one_time',
      status: 'active'
    },
    {
      id: 3,
      title: 'Активный фармер',
      description: 'Фармите 7 дней подряд без перерыва',
      reward_uni: 20,
      reward_ton: 0,
      type: 'streak',
      status: 'active'
    },
    {
      id: 4,
      title: 'TON Boost активация',
      description: 'Активируйте любой TON Boost пакет',
      reward_uni: 0,
      reward_ton: 0.1,
      type: 'one_time',
      status: 'active'
    },
    {
      id: 5,
      title: 'Социальная активность',
      description: 'Подпишитесь на наш Telegram канал',
      reward_uni: 2,
      reward_ton: 0,
      type: 'social',
      status: 'active'
    }
  ];

  // Проверяем, пустая ли таблица missions
  const { data: existingMissions, error: checkError } = await supabase
    .from('missions')
    .select('id')
    .limit(1);

  if (!checkError && (!existingMissions || existingMissions.length === 0)) {
    const { error: insertError } = await supabase
      .from('missions')
      .insert(missions);

    if (insertError) {
      console.error('❌ Ошибка заполнения таблицы missions:', insertError.message);
    } else {
      console.log('✅ Таблица missions заполнена базовыми данными');
    }
  } else {
    console.log('ℹ️  Таблица missions уже содержит данные');
  }

  // Заполнение таблицы referrals из users
  const migrateReferrals = `
    INSERT INTO referrals (referrer_id, referred_id, level, created_at)
    SELECT 
      referred_by::integer as referrer_id,
      id as referred_id,
      1 as level,
      created_at
    FROM users 
    WHERE referred_by IS NOT NULL 
      AND referred_by != 'null'
      AND referred_by ~ '^[0-9]+$'
    ON CONFLICT DO NOTHING;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: migrateReferrals });
    if (error) {
      console.error('❌ Ошибка миграции рефералов:', error.message);
    } else {
      console.log('✅ Реферальные связи перенесены в таблицу referrals');
    }
  } catch (err) {
    console.error('❌ Ошибка при миграции рефералов:', err);
  }
}

async function fixDataTypes() {
  console.log('\n🔧 Исправление типов данных...\n');

  // Добавление поля referrer_id если его нет
  const addReferrerId = `
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS referrer_id INTEGER REFERENCES users(id);
  `;

  // Миграция данных из referred_by в referrer_id
  const migrateReferrerData = `
    UPDATE users 
    SET referrer_id = referred_by::integer
    WHERE referred_by IS NOT NULL 
      AND referred_by != 'null'
      AND referred_by ~ '^[0-9]+$';
  `;

  // Исправление типов timestamp полей
  const fixTimestamps = `
    ALTER TABLE users
    ALTER COLUMN uni_farming_start_timestamp TYPE TIMESTAMP USING 
      CASE 
        WHEN uni_farming_start_timestamp IS NOT NULL 
        THEN to_timestamp(uni_farming_start_timestamp::text, 'YYYY-MM-DD"T"HH24:MI:SS.MS')
        ELSE NULL 
      END,
    ALTER COLUMN uni_farming_last_update TYPE TIMESTAMP USING 
      CASE 
        WHEN uni_farming_last_update IS NOT NULL 
        THEN to_timestamp(uni_farming_last_update::text, 'YYYY-MM-DD"T"HH24:MI:SS.MS')
        ELSE NULL 
      END,
    ALTER COLUMN ton_farming_start_timestamp TYPE TIMESTAMP USING 
      CASE 
        WHEN ton_farming_start_timestamp IS NOT NULL 
        THEN to_timestamp(ton_farming_start_timestamp::text, 'YYYY-MM-DD"T"HH24:MI:SS.MS')
        ELSE NULL 
      END;
  `;

  const fixes = [
    { name: 'referrer_id поле', sql: addReferrerId },
    { name: 'миграция referrer данных', sql: migrateReferrerData },
    { name: 'timestamp поля', sql: fixTimestamps }
  ];

  for (const fix of fixes) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: fix.sql });
      if (error) {
        console.error(`❌ Ошибка исправления ${fix.name}:`, error.message);
      } else {
        console.log(`✅ Исправлено: ${fix.name}`);
      }
    } catch (err) {
      console.error(`❌ Ошибка при исправлении ${fix.name}:`, err);
    }
  }
}

async function verifyTablesStructure() {
  console.log('\n🔍 Проверка структуры таблиц...\n');

  const tablesToCheck = [
    'users',
    'user_sessions',
    'transactions',
    'referrals',
    'farming_sessions',
    'boost_purchases',
    'missions',
    'user_missions',
    'airdrops',
    'daily_bonus_logs',
    'withdraw_requests'
  ];

  const results = [];
  
  for (const tableName of tablesToCheck) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);

    if (error) {
      results.push(`❌ ${tableName}: Отсутствует или ошибка`);
    } else {
      const { count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      results.push(`✅ ${tableName}: Существует (${count || 0} записей)`);
    }
  }

  console.log(results.join('\n'));
}

// Запуск всех операций
async function main() {
  console.log('🚀 Запуск синхронизации Supabase для UniFarm...\n');
  
  try {
    await createMissingTables();
    await fillEmptyTables();
    await fixDataTypes();
    await verifyTablesStructure();
    
    console.log('\n✨ Синхронизация завершена успешно!');
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

main();