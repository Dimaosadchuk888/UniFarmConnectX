#!/usr/bin/env npx tsx

/**
 * ДИАГНОСТИКА TONEBOOST ROLLBACK ПРОБЛЕМЫ
 * Проверяет почему при покупке ToneBoost TON возвращается на кошелек
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseToneBoostRollback() {
  console.log('\n🎯 ДИАГНОСТИКА TONEBOOST ROLLBACK ПРОБЛЕМЫ');
  console.log('='.repeat(60));
  console.log(`📅 Время: ${new Date().toLocaleString('ru-RU')}`);
  console.log('🔍 Проблема: 1 покупка → 2 пакета → бонус → возврат TON\n');

  try {
    // 1. Проверяем доступные ToneBoost пакеты
    console.log('1️⃣ ПРОВЕРКА TONEBOOST ПАКЕТОВ:');
    
    const { data: packages, error: packagesError } = await supabase
      .from('toneboost_packages')
      .select('*')
      .eq('is_active', true)
      .order('min_amount');

    if (!packagesError && packages) {
      console.log(`📦 Найдено ${packages.length} активных пакетов:`);
      packages.forEach(pkg => {
        console.log(`   ID: ${pkg.id}, Name: ${pkg.name}, Min: ${pkg.min_amount} TON, Rate: ${pkg.daily_rate}%, Duration: ${pkg.duration_days} дней`);
      });
    } else {
      console.log('❌ Не удалось получить пакеты ToneBoost');
    }

    // 2. Проверяем записи в ton_farming_data
    console.log('\n2️⃣ ПРОВЕРКА АКТИВНЫХ TON FARMING ЗАПИСЕЙ:');
    
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('user_id, boost_active, boost_package_id, farming_rate, farming_balance, updated_at')
      .eq('boost_active', true)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (!farmingError && farmingData) {
      console.log(`🌾 Найдено ${farmingData.length} активных farming записей:`);
      farmingData.forEach(data => {
        console.log(`   User ${data.user_id}: Package ${data.boost_package_id}, Rate: ${data.farming_rate}, Balance: ${data.farming_balance}, Update: ${new Date(data.updated_at).toLocaleString('ru-RU')}`);
      });
    } else {
      console.log('❌ Активные farming записи не найдены');
    }

    // 3. Проверяем пользователей с ton_boost_package в users
    console.log('\n3️⃣ ПРОВЕРКА ПОЛЬЗОВАТЕЛЕЙ С TON_BOOST_PACKAGE:');
    
    const { data: boostUsers, error: boostUsersError } = await supabase
      .from('users')
      .select('id, username, ton_boost_package, ton_boost_rate, balance_ton, updated_at')
      .not('ton_boost_package', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (!boostUsersError && boostUsers) {
      console.log(`👥 Найдено ${boostUsers.length} пользователей с TON Boost:`);
      boostUsers.forEach(user => {
        console.log(`   User ${user.id} (@${user.username}): Package ${user.ton_boost_package}, Rate: ${user.ton_boost_rate}, Balance: ${user.balance_ton} TON, Update: ${new Date(user.updated_at).toLocaleString('ru-RU')}`);
      });
    } else {
      console.log('❌ Пользователи с TON Boost не найдены');
    }

    // 4. Ищем недавние покупки ToneBoost (отрицательные транзакции)
    console.log('\n4️⃣ ПОИСК НЕДАВНИХ ПОКУПОК TONEBOOST:');
    
    const { data: purchases, error: purchasesError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_ton, description, metadata, created_at, status')
      .lt('amount_ton', 0) // Отрицательные (списания)
      .or('description.ilike.%boost%,description.ilike.%пакет%')
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Последние 24 часа
      .order('created_at', { ascending: false });

    if (!purchasesError && purchases && purchases.length > 0) {
      console.log(`💳 Найдено ${purchases.length} покупок ToneBoost за последние 24 часа:`);
      purchases.forEach(tx => {
        const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
        console.log(`   ID: ${tx.id}, User: ${tx.user_id}, Amount: ${tx.amount_ton} TON, Description: ${tx.description}, Status: ${tx.status}, Time: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        if (metadata) {
          console.log(`      Metadata: ${JSON.stringify(metadata).substring(0, 100)}...`);
        }
      });
    } else {
      console.log('💰 Покупки ToneBoost за последние 24 часа не найдены');
    }

    // 5. Ищем соответствующие возвраты (положительные транзакции после покупок)
    console.log('\n5️⃣ ПОИСК ВОЗВРАТОВ TON (после покупок):');
    
    const { data: refunds, error: refundsError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_ton, description, created_at, status')
      .gt('amount_ton', 0) // Положительные (возвраты)
      .or('description.ilike.%возврат%,description.ilike.%refund%,type.eq.REFUND')
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (!refundsError && refunds && refunds.length > 0) {
      console.log(`🔄 Найдено ${refunds.length} возвратов TON за последние 24 часа:`);
      refunds.forEach(tx => {
        console.log(`   ID: ${tx.id}, User: ${tx.user_id}, Amount: +${tx.amount_ton} TON, Description: ${tx.description}, Time: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
      });
    } else {
      console.log('✅ Явные возвраты TON не найдены');
    }

    // 6. Проверяем последние ToneBoost income транзакции
    console.log('\n6️⃣ ПРОВЕРКА TONEBOOST INCOME ТРАНЗАКЦИЙ:');
    
    const { data: incomeTransactions, error: incomeError } = await supabase
      .from('transactions')
      .select('id, user_id, amount_ton, description, created_at')
      .or('description.ilike.%boost доход%,description.ilike.%boost income%')
      .gt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Последний час
      .order('created_at', { ascending: false })
      .limit(10);

    if (!incomeError && incomeTransactions && incomeTransactions.length > 0) {
      console.log(`📈 Найдено ${incomeTransactions.length} ToneBoost income за последний час:`);
      incomeTransactions.forEach(tx => {
        console.log(`   User ${tx.user_id}: +${tx.amount_ton} TON, Description: ${tx.description}, Time: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
      });
    } else {
      console.log('⏰ ToneBoost income транзакции за последний час не найдены');
    }

    console.log('\n🏁 ДИАГНОСТИКА TONEBOOST ЗАВЕРШЕНА');
    console.log('📊 Анализ покажет где происходит rollback TON при покупке пакетов');

  } catch (error) {
    console.error('❌ Ошибка диагностики ToneBoost:', error);
  }
}

diagnoseToneBoostRollback();