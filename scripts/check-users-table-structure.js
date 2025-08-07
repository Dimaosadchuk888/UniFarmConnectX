/**
 * Проверка структуры таблицы users
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsersTable() {
  console.log('🔍 Анализ структуры таблицы users...\n');
  
  try {
    // Получаем одну запись для анализа полей
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Ошибка:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  Таблица users пустая');
      return;
    }

    const fields = Object.keys(data[0]);
    console.log('📋 Все поля в таблице users:');
    fields.forEach(field => {
      const value = data[0][field];
      const type = value === null ? 'null' : typeof value;
      console.log(`   - ${field}: ${type} (пример: ${value})`);
    });

    // Проверяем наличие критических полей для балансов
    console.log('\n🔍 Проверка полей балансов:');
    const balanceFields = ['uni_balance', 'ton_balance', 'balance_uni', 'balance_ton', 'balance'];
    
    balanceFields.forEach(field => {
      if (fields.includes(field)) {
        console.log(`✅ ${field} - найдено`);
      } else {
        console.log(`❌ ${field} - НЕ найдено`);
      }
    });

    // Ищем любые поля, связанные с балансом
    console.log('\n🔍 Поля, возможно связанные с балансами:');
    fields.filter(field => 
      field.includes('balance') || 
      field.includes('uni') || 
      field.includes('ton') ||
      field.includes('amount')
    ).forEach(field => {
      console.log(`   - ${field}: ${data[0][field]}`);
    });

  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
  }
}

checkUsersTable();