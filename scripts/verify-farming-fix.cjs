#!/usr/bin/env node

/**
 * Проверка исправления системы farming
 */

const dotenv = require('dotenv');
const path = require('path');

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');

// Инициализация Supabase клиента
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function verifyFarmingFix() {
  console.log('=== ПРОВЕРКА ИСПРАВЛЕНИЯ СИСТЕМЫ FARMING ===');
  console.log(new Date().toLocaleString('ru-RU'));
  console.log('');

  try {
    // 1. Проверяем активные депозиты
    const { data: activeDeposits, error: depositsError } = await supabase
      .from('users')
      .select('id, uni_farming_active, uni_deposit_amount, uni_farming_rate, uni_farming_start_timestamp')
      .eq('uni_farming_active', true)
      .gt('uni_deposit_amount', 0);

    if (depositsError) {
      console.error('❌ Ошибка получения депозитов:', depositsError);
      return;
    }

    console.log(`📊 Активные UNI farming депозиты: ${activeDeposits?.length || 0}`);

    // 2. Проверяем транзакции за последние 10 минут для каждого активного депозита
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

    let usersWithTransactions = 0;
    let usersWithoutTransactions = 0;
    const problemUsers = [];

    for (const user of activeDeposits || []) {
      const { data: userTransactions, error: txError } = await supabase
        .from('transactions')
        .select('id, created_at, amount_uni')
        .eq('user_id', user.id)
        .eq('type', 'FARMING_REWARD')
        .gte('created_at', tenMinutesAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (!txError && userTransactions && userTransactions.length > 0) {
        usersWithTransactions++;
      } else {
        usersWithoutTransactions++;
        problemUsers.push({
          userId: user.id,
          deposit: user.uni_deposit_amount,
          rate: user.uni_farming_rate,
          startDate: user.uni_farming_start_timestamp
        });
      }
    }

    console.log('\n📈 Результаты проверки:');
    console.log(`   ✅ Пользователей с транзакциями за последние 10 минут: ${usersWithTransactions}`);
    console.log(`   ❌ Пользователей БЕЗ транзакций за последние 10 минут: ${usersWithoutTransactions}`);
    
    const successRate = activeDeposits?.length > 0 
      ? ((usersWithTransactions / activeDeposits.length) * 100).toFixed(1)
      : 0;
    
    console.log(`   📊 Процент успешных начислений: ${successRate}%`);

    if (problemUsers.length > 0) {
      console.log('\n⚠️  Пользователи без начислений:');
      problemUsers.slice(0, 5).forEach(user => {
        console.log(`   - User ID ${user.userId}: депозит ${user.deposit} UNI, ставка ${user.rate}`);
      });
      if (problemUsers.length > 5) {
        console.log(`   ... и еще ${problemUsers.length - 5} пользователей`);
      }
    }

    // 3. Проверяем общую статистику транзакций
    const { data: hourStats, error: statsError } = await supabase
      .from('transactions')
      .select('type, amount_uni, amount_ton')
      .eq('type', 'FARMING_REWARD')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (!statsError && hourStats) {
      const uniTransactions = hourStats.filter(tx => parseFloat(tx.amount_uni || '0') > 0);
      const tonTransactions = hourStats.filter(tx => parseFloat(tx.amount_ton || '0') > 0);
      
      const totalUni = uniTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount_uni || '0'), 0);
      const totalTon = tonTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || '0'), 0);

      console.log('\n💰 Начислено за последний час:');
      console.log(`   UNI: ${totalUni.toFixed(6)} UNI (${uniTransactions.length} транзакций)`);
      console.log(`   TON: ${totalTon.toFixed(6)} TON (${tonTransactions.length} транзакций)`);
    }

    // 4. Финальный вердикт
    console.log('\n=====================================');
    if (successRate >= 90) {
      console.log('✅ СИСТЕМА FARMING РАБОТАЕТ ОТЛИЧНО!');
      console.log(`   ${successRate}% пользователей получают доход`);
    } else if (successRate >= 50) {
      console.log('⚠️  СИСТЕМА FARMING РАБОТАЕТ ЧАСТИЧНО');
      console.log(`   Только ${successRate}% пользователей получают доход`);
    } else {
      console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА С FARMING!');
      console.log(`   Только ${successRate}% пользователей получают доход`);
    }

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

// Запуск проверки
verifyFarmingFix().catch(console.error);