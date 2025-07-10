/**
 * Упрощенный скрипт валидации полей базы данных UniFarm
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: Не найдены переменные окружения SUPABASE_URL и SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Критически важные поля для каждой таблицы
const CRITICAL_FIELDS = {
  users: [
    'id', 'telegram_id', 'username', 'uni_balance', 'ton_balance',
    'ref_code', 'uni_farming_active', 'ton_boost_package', 'created_at'
  ],
  transactions: [
    'id', 'user_id', 'type', 'amount', 'currency', 'status', 'created_at'
  ],
  referrals: [
    'id', 'referrer_user_id', 'referred_user_id', 'level', 'percentage'
  ],
  farming_sessions: [
    'id', 'user_id', 'type', 'amount', 'is_active'
  ],
  missions: [
    'id', 'title', 'mission_type', 'reward_type', 'reward_amount'
  ],
  withdraw_requests: [
    'id', 'user_id', 'amount_ton', 'ton_wallet', 'status'
  ]
};

async function checkTable(tableName, criticalFields) {
  console.log(`\n📋 Проверяем таблицу: ${tableName}`);
  
  try {
    // Получаем одну запись для анализа структуры
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log(`❌ Таблица ${tableName} НЕ СУЩЕСТВУЕТ!`);
        return { table: tableName, status: 'MISSING', fields: [] };
      }
      throw error;
    }

    // Получаем количество записей
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (!data || data.length === 0) {
      console.log(`⚠️  Таблица ${tableName} существует, но пустая (0 записей)`);
      return { table: tableName, status: 'EMPTY', count: 0 };
    }

    // Анализируем поля
    const actualFields = Object.keys(data[0]);
    const missingFields = criticalFields.filter(field => !actualFields.includes(field));
    
    if (missingFields.length > 0) {
      console.log(`❌ Таблица ${tableName}: ОТСУТСТВУЮТ критические поля: ${missingFields.join(', ')}`);
      return { 
        table: tableName, 
        status: 'ERROR', 
        missingFields, 
        actualFields,
        count 
      };
    }

    console.log(`✅ Таблица ${tableName}: ВСЕ критические поля на месте (${count} записей)`);
    
    // Проверяем специфичные поля
    if (tableName === 'transactions' && actualFields.includes('amount')) {
      const amountValue = data[0].amount;
      console.log(`   ✓ Поле amount: ${amountValue !== null ? 'заполнено' : 'пустое'}`);
    }
    
    return { 
      table: tableName, 
      status: 'OK', 
      actualFields,
      count 
    };

  } catch (error) {
    console.error(`❌ Ошибка при проверке ${tableName}:`, error.message);
    return { table: tableName, status: 'ERROR', error: error.message };
  }
}

async function main() {
  console.log('🚀 Валидация структуры базы данных UniFarm');
  console.log('📅 Дата:', new Date().toLocaleString());
  console.log('🔗 Supabase URL:', supabaseUrl);
  
  const results = [];
  let criticalIssues = 0;
  
  // Проверяем каждую таблицу
  for (const [table, fields] of Object.entries(CRITICAL_FIELDS)) {
    const result = await checkTable(table, fields);
    results.push(result);
    
    if (result.status === 'ERROR' || result.status === 'MISSING') {
      criticalIssues++;
    }
    
    // Небольшая пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Итоговая статистика
  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
  console.log('='.repeat(60));
  
  const okTables = results.filter(r => r.status === 'OK').length;
  const errorTables = results.filter(r => r.status === 'ERROR').length;
  const missingTables = results.filter(r => r.status === 'MISSING').length;
  const emptyTables = results.filter(r => r.status === 'EMPTY').length;
  
  console.log(`✅ Таблиц в порядке: ${okTables}/${Object.keys(CRITICAL_FIELDS).length}`);
  console.log(`❌ Таблиц с ошибками: ${errorTables}`);
  console.log(`🚫 Отсутствующих таблиц: ${missingTables}`);
  console.log(`⚠️  Пустых таблиц: ${emptyTables}`);
  
  if (criticalIssues > 0) {
    console.log('\n🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ:');
    results.forEach(r => {
      if (r.status === 'ERROR' && r.missingFields) {
        console.log(`   - ${r.table}: отсутствуют поля ${r.missingFields.join(', ')}`);
      } else if (r.status === 'MISSING') {
        console.log(`   - ${r.table}: таблица не существует`);
      }
    });
    
    console.log('\n❗ РЕКОМЕНДАЦИИ:');
    console.log('1. Создайте отсутствующие таблицы через Supabase Dashboard');
    console.log('2. Добавьте недостающие поля в существующие таблицы');
    console.log('3. Запустите скрипты миграции данных');
  } else {
    console.log('\n✅ БАЗА ДАННЫХ ГОТОВА К РАБОТЕ!');
    console.log('Все критические поля присутствуют.');
  }
  
  // Дополнительные проверки
  console.log('\n📝 ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ:');
  
  // Проверяем поле amount в transactions
  const transResult = results.find(r => r.table === 'transactions');
  if (transResult && transResult.status === 'OK') {
    const { data } = await supabase
      .from('transactions')
      .select('amount, currency')
      .not('amount', 'is', null)
      .limit(5);
    
    if (data && data.length > 0) {
      console.log('✅ Поле amount в transactions заполнено:');
      data.forEach(tx => {
        console.log(`   - ${tx.amount} ${tx.currency}`);
      });
    }
  }
  
  process.exit(criticalIssues > 0 ? 1 : 0);
}

main().catch(console.error);