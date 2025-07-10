/**
 * Полная проверка всех критических полей UniFarm
 * с учетом реальных названий в БД
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Обновленные критические поля с правильными названиями
const CRITICAL_FIELDS = {
  users: {
    required: [
      'id', 'telegram_id', 'username', 
      'balance_uni', 'balance_ton',  // Исправлено с uni_balance/ton_balance
      'ref_code', 'uni_farming_active', 'ton_boost_package', 'created_at'
    ],
    optional: [
      'first_name', 'last_name', 'referred_by', 'is_admin',
      'uni_farming_amount', 'uni_farming_start_timestamp',
      'ton_boost_active', 'ton_boost_start_timestamp',
      'ton_wallet_address', 'ton_wallet_verified', 'ton_wallet_linked_at'
    ]
  },
  transactions: {
    required: [
      'id', 'user_id', 'type', 'amount', 'currency', 'status', 'created_at'
    ],
    optional: [
      'amount_uni', 'amount_ton', 'description', 'metadata', 'tx_hash'
    ]
  },
  referrals: {
    required: [
      'id', 'referrer_user_id', 'referred_user_id', 'level', 'percentage', 'created_at'
    ],
    optional: []
  },
  farming_sessions: {
    required: [
      'id', 'user_id', 'type', 'amount', 'is_active', 'created_at'
    ],
    optional: [
      'start_timestamp', 'last_claim_timestamp', 'total_earned'
    ]
  },
  user_sessions: {
    required: [
      'id', 'user_id', 'session_token', 'created_at', 'expires_at'
    ],
    optional: ['last_activity', 'ip_address']
  },
  boost_purchases: {
    required: [
      'id', 'user_id', 'package_id', 'amount_ton', 'daily_rate', 'purchase_date'
    ],
    optional: ['is_active', 'expiry_date', 'total_earned']
  },
  missions: {
    required: [
      'id', 'title', 'description', 'mission_type', 'reward_type', 'reward_amount', 'created_at'
    ],
    optional: ['is_active', 'requirements', 'icon']
  },
  user_missions: {
    required: [
      'id', 'user_id', 'mission_id', 'is_completed', 'created_at'
    ],
    optional: ['completed_at', 'reward_claimed', 'progress']
  },
  airdrops: {
    required: [
      'id', 'title', 'description', 'total_amount', 'token_type', 'created_at'
    ],
    optional: ['start_date', 'end_date', 'is_active', 'requirements']
  },
  daily_bonus_logs: {
    required: [
      'id', 'user_id', 'day_number', 'bonus_amount', 'claimed_at'
    ],
    optional: ['streak_count']
  },
  withdraw_requests: {
    required: [
      'id', 'user_id', 'amount_ton', 'ton_wallet', 'status', 'created_at'
    ],
    optional: ['processed_at', 'processed_by', 'tx_hash']
  }
};

async function checkTableStructure(tableName, fields) {
  console.log(`\n📋 Проверяем таблицу: ${tableName}`);
  
  try {
    // Сначала проверяем существование таблицы
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      if (countError.message.includes('does not exist')) {
        console.log(`❌ Таблица НЕ СУЩЕСТВУЕТ`);
        return { 
          table: tableName, 
          status: 'MISSING',
          error: 'Таблица не существует в базе данных'
        };
      }
      throw countError;
    }

    // Получаем образец данных для анализа структуры
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log(`⚠️  Таблица существует, но ПУСТАЯ (0 записей)`);
      console.log(`   Невозможно проверить структуру полей`);
      return { 
        table: tableName, 
        status: 'EMPTY',
        count: 0,
        warning: 'Таблица пустая, структура не может быть проверена'
      };
    }

    // Анализируем структуру
    const actualFields = Object.keys(data[0]);
    const missingRequired = fields.required.filter(f => !actualFields.includes(f));
    const missingOptional = fields.optional.filter(f => !actualFields.includes(f));
    const extraFields = actualFields.filter(f => 
      !fields.required.includes(f) && !fields.optional.includes(f)
    );

    // Выводим результаты
    if (missingRequired.length === 0) {
      console.log(`✅ Все обязательные поля на месте (${count} записей)`);
    } else {
      console.log(`❌ ОТСУТСТВУЮТ обязательные поля: ${missingRequired.join(', ')}`);
    }

    if (missingOptional.length > 0) {
      console.log(`⚠️  Отсутствуют опциональные поля: ${missingOptional.join(', ')}`);
    }

    if (extraFields.length > 0) {
      console.log(`ℹ️  Дополнительные поля в БД: ${extraFields.join(', ')}`);
    }

    // Специальные проверки для важных таблиц
    if (tableName === 'transactions' && data[0].amount !== undefined) {
      const hasAmount = data[0].amount !== null && data[0].amount !== '0';
      console.log(`   ${hasAmount ? '✓' : '✗'} Поле amount: ${data[0].amount || 'пустое'}`);
    }

    if (tableName === 'users' && data[0].balance_uni !== undefined) {
      console.log(`   ✓ balance_uni: ${data[0].balance_uni}`);
      console.log(`   ✓ balance_ton: ${data[0].balance_ton}`);
    }

    return {
      table: tableName,
      status: missingRequired.length > 0 ? 'ERROR' : 'OK',
      count,
      missingRequired,
      missingOptional,
      extraFields,
      actualFields
    };

  } catch (error) {
    console.error(`❌ Ошибка:`, error.message);
    return { 
      table: tableName, 
      status: 'ERROR',
      error: error.message 
    };
  }
}

async function main() {
  console.log('🚀 ПОЛНАЯ ВАЛИДАЦИЯ БАЗЫ ДАННЫХ UniFarm');
  console.log('📅 Дата:', new Date().toLocaleString());
  console.log('='.repeat(60));

  const results = [];
  let criticalIssues = 0;
  let warnings = 0;

  // Проверяем все таблицы
  for (const [table, fields] of Object.entries(CRITICAL_FIELDS)) {
    const result = await checkTableStructure(table, fields);
    results.push(result);

    if (result.status === 'ERROR' || result.status === 'MISSING') {
      criticalIssues++;
    } else if (result.status === 'EMPTY') {
      warnings++;
    }

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

  console.log(`✅ Таблиц полностью готовых: ${okTables}/${Object.keys(CRITICAL_FIELDS).length}`);
  console.log(`❌ Таблиц с критическими ошибками: ${errorTables}`);
  console.log(`🚫 Отсутствующих таблиц: ${missingTables}`);
  console.log(`⚠️  Пустых таблиц: ${emptyTables}`);

  // Детальный отчет о проблемах
  if (criticalIssues > 0) {
    console.log('\n🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ:');
    results.forEach(r => {
      if (r.status === 'ERROR' && r.missingRequired) {
        console.log(`\n❌ ${r.table}:`);
        console.log(`   Отсутствуют обязательные поля: ${r.missingRequired.join(', ')}`);
      }
      if (r.status === 'MISSING') {
        console.log(`\n🚫 ${r.table}: ТАБЛИЦА НЕ СУЩЕСТВУЕТ`);
      }
    });
  }

  // Проблемы с пустыми таблицами
  const emptyTablesList = results.filter(r => r.status === 'EMPTY').map(r => r.table);
  if (emptyTablesList.length > 0) {
    console.log('\n⚠️  ПУСТЫЕ ТАБЛИЦЫ (требуют данных):');
    emptyTablesList.forEach(t => console.log(`   - ${t}`));
  }

  // Рекомендации
  console.log('\n📝 РЕКОМЕНДАЦИИ:');
  
  if (missingTables > 0) {
    console.log('\n1. Создайте отсутствующие таблицы:');
    results.filter(r => r.status === 'MISSING').forEach(r => {
      console.log(`   - CREATE TABLE ${r.table} (...);`);
    });
  }

  if (errorTables > 0) {
    console.log('\n2. Добавьте недостающие поля в существующие таблицы:');
    results.filter(r => r.status === 'ERROR' && r.missingRequired).forEach(r => {
      r.missingRequired.forEach(field => {
        console.log(`   - ALTER TABLE ${r.table} ADD COLUMN ${field} ...;`);
      });
    });
  }

  if (emptyTables > 0) {
    console.log('\n3. Заполните пустые таблицы начальными данными');
  }

  // Финальная оценка
  const isHealthy = criticalIssues === 0;
  console.log(`\n${isHealthy ? '✅ БАЗА ДАННЫХ ГОТОВА К РАБОТЕ!' : '❌ ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ КРИТИЧЕСКИХ ПРОБЛЕМ!'}`);
  
  if (!isHealthy) {
    console.log('\nДля полноценной работы системы UniFarm необходимо:');
    console.log('1. Устранить все критические проблемы');
    console.log('2. Создать недостающие таблицы');
    console.log('3. Добавить обязательные поля');
    console.log('4. Заполнить пустые таблицы базовыми данными');
  }

  process.exit(isHealthy ? 0 : 1);
}

main().catch(console.error);