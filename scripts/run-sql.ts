#!/usr/bin/env tsx

/**
 * УТИЛИТА ДЛЯ ВЫПОЛНЕНИЯ SQL СКРИПТОВ
 * Выполняет SQL файлы через Supabase
 */

import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('❌ SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY не найдены');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSQLFile(filename: string) {
  try {
    console.log(`🚀 Выполняем SQL скрипт: ${filename}`);
    
    const sqlContent = readFileSync(filename, 'utf8');
    console.log(`📄 Содержимое файла (${sqlContent.length} символов):`);
    console.log(sqlContent.substring(0, 500) + (sqlContent.length > 500 ? '...' : ''));
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
    
    if (error) {
      console.log('❌ Ошибка выполнения SQL:', error.message);
      console.log('   Код:', error.code);
      console.log('   Детали:', error.details);
    } else {
      console.log('✅ SQL скрипт выполнен успешно');
      if (data) {
        console.log('📊 Результат:', data);
      }
    }
  } catch (error) {
    console.log('❌ Критическая ошибка:', error instanceof Error ? error.message : String(error));
  }
}

const filename = process.argv[2];
if (!filename) {
  console.log('❌ Укажите имя SQL файла: tsx scripts/run-sql.ts filename.sql');
  process.exit(1);
}

runSQLFile(filename);