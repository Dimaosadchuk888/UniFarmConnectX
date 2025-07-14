#!/usr/bin/env ts-node
import { supabase } from './core/supabase';

/**
 * QA Аудит: Проверка работы накопления депозитов в TON Boost
 * Роль: Технический аудитор / QA инженер
 * Цель: Проверить корректность работы системы после внедрения логики накопления
 */

async function auditTonBoostAccumulation() {
  console.log('🔍 QA АУДИТ TON BOOST: Проверка накопления депозитов\n');
  console.log('Дата проверки:', new Date().toISOString());
  console.log('=' .repeat(70) + '\n');

  const testUserId = 74; // Тестовый пользователь
  const cutoffDate = '2025-01-14T04:30:00'; // После внедрения изменений

  try {
    // 1. ПРОВЕРКА БАЛАНСА farming_balance
    console.log('📊 1. ПРОВЕРКА БАЛАНСА farming_balance\n');
    
    // Получаем данные из ton_farming_data
    const { data: tonData, error: tonError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    let currentFarmingBalance = 0;
    let farmingRate = 0;
    let boostPackageId = null;
    let lastUpdate = null;

    if (tonData) {
      currentFarmingBalance = parseFloat(tonData.farming_balance) || 0;
      farmingRate = parseFloat(tonData.farming_rate) || 0;
      boostPackageId = tonData.boost_package_id;
      lastUpdate = tonData.farming_last_update;
      
      console.log('✅ Данные из ton_farming_data:');
      console.log(`   - farming_balance: ${currentFarmingBalance} TON`);
      console.log(`   - farming_rate: ${farmingRate} (${farmingRate * 100}% в день)`);
      console.log(`   - boost_package_id: ${boostPackageId}`);
      console.log(`   - farming_last_update: ${lastUpdate}`);
      console.log(`   - boost_active: ${tonData.boost_active}`);
    } else {
      // Fallback на таблицу users
      const { data: userData } = await supabase
        .from('users')
        .select('ton_farming_balance, ton_farming_rate, ton_boost_package_id, ton_farming_last_update')
        .eq('id', testUserId)
        .single();
      
      if (userData) {
        currentFarmingBalance = parseFloat(userData.ton_farming_balance) || 0;
        farmingRate = parseFloat(userData.ton_farming_rate) || 0;
        boostPackageId = userData.ton_boost_package_id;
        lastUpdate = userData.ton_farming_last_update;
        
        console.log('⚠️  Используется fallback (таблица users):');
        console.log(`   - ton_farming_balance: ${currentFarmingBalance} TON`);
        console.log(`   - ton_farming_rate: ${farmingRate}`);
        console.log(`   - ton_boost_package_id: ${boostPackageId}`);
      }
    }

    // 2. ПРОВЕРКА ТРАНЗАКЦИЙ BOOST_PURCHASE
    console.log('\n📈 2. ПРОВЕРКА ТРАНЗАКЦИЙ BOOST_PURCHASE\n');
    
    const { data: purchases, error: purchaseError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', testUserId)
      .eq('type', 'BOOST_PURCHASE')
      .gte('created_at', cutoffDate)
      .order('created_at', { ascending: false });

    let totalNewDeposits = 0;
    let hasMetadata = true;
    
    if (purchases && purchases.length > 0) {
      console.log(`✅ Найдено ${purchases.length} новых транзакций BOOST_PURCHASE после ${cutoffDate}:\n`);
      
      purchases.forEach((tx, idx) => {
        const amount = parseFloat(tx.amount) || 0;
        totalNewDeposits += amount;
        
        console.log(`Транзакция #${idx + 1}:`);
        console.log(`   - ID: ${tx.id}`);
        console.log(`   - Дата: ${tx.created_at}`);
        console.log(`   - Сумма: ${amount} TON`);
        console.log(`   - Описание: ${tx.description}`);
        
        if (tx.metadata) {
          const meta = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
          console.log(`   - Metadata:`);
          console.log(`     • original_type: ${meta.original_type || 'НЕТ'}`);
          console.log(`     • boost_package_id: ${meta.boost_package_id || 'НЕТ'}`);
          console.log(`     • package_name: ${meta.package_name || 'НЕТ'}`);
          console.log(`     • daily_rate: ${meta.daily_rate || 'НЕТ'}`);
          
          if (!meta.original_type || meta.original_type !== 'TON_BOOST_PURCHASE') {
            hasMetadata = false;
          }
        } else {
          console.log(`   - Metadata: ❌ ОТСУТСТВУЕТ`);
          hasMetadata = false;
        }
        console.log('');
      });
      
      console.log(`💰 Сумма новых депозитов: ${totalNewDeposits} TON`);
      console.log(`📊 Текущий farming_balance: ${currentFarmingBalance} TON`);
      
      // Проверяем накопление
      if (currentFarmingBalance >= totalNewDeposits) {
        console.log(`✅ Баланс содержит все новые депозиты (может включать старые)`);
      } else {
        console.log(`⚠️  Баланс меньше суммы новых депозитов!`);
      }
      
      if (hasMetadata) {
        console.log(`✅ Все транзакции содержат корректные metadata`);
      } else {
        console.log(`❌ Некоторые транзакции без metadata или с неправильным original_type`);
      }
    } else {
      console.log('❌ Новых транзакций BOOST_PURCHASE не найдено после', cutoffDate);
    }

    // 3. ПРОВЕРКА НАЧИСЛЕНИЙ FARMING_REWARD
    console.log('\n💵 3. ПРОВЕРКА НАЧИСЛЕНИЙ FARMING_REWARD\n');
    
    const { data: rewards, error: rewardError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', testUserId)
      .eq('type', 'FARMING_REWARD')
      .gte('created_at', cutoffDate)
      .order('created_at', { ascending: false })
      .limit(10);

    if (rewards && rewards.length > 0) {
      console.log(`✅ Найдено ${rewards.length} начислений FARMING_REWARD:\n`);
      
      let tonBoostRewards = 0;
      let lastRewardTime = null;
      let firstRewardTime = null;
      
      rewards.forEach((tx, idx) => {
        const amount = parseFloat(tx.amount) || 0;
        const meta = tx.metadata ? (typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata) : {};
        
        if (meta.original_type === 'TON_BOOST_INCOME' || tx.description?.includes('TON Boost')) {
          tonBoostRewards++;
          if (!firstRewardTime) firstRewardTime = new Date(tx.created_at);
          lastRewardTime = new Date(tx.created_at);
          
          console.log(`TON Boost начисление #${tonBoostRewards}:`);
          console.log(`   - Время: ${tx.created_at}`);
          console.log(`   - Сумма: ${amount} TON`);
          console.log(`   - original_type: ${meta.original_type || 'не указан'}`);
          
          // Проверяем расчет
          const expectedPerCycle = (currentFarmingBalance * farmingRate) / (24 * 12); // за 5 минут
          const deviation = Math.abs(amount - expectedPerCycle) / expectedPerCycle * 100;
          
          console.log(`   - Ожидаемая сумма: ${expectedPerCycle.toFixed(9)} TON`);
          console.log(`   - Отклонение: ${deviation.toFixed(2)}%`);
          
          if (deviation < 5) {
            console.log(`   - ✅ Сумма корректна`);
          } else {
            console.log(`   - ⚠️  Большое отклонение от ожидаемой суммы`);
          }
          console.log('');
        }
      });
      
      if (tonBoostRewards > 0) {
        console.log(`📊 Статистика TON Boost начислений:`);
        console.log(`   - Всего начислений: ${tonBoostRewards}`);
        
        if (lastRewardTime && firstRewardTime && tonBoostRewards > 1) {
          const timeDiff = lastRewardTime.getTime() - firstRewardTime.getTime();
          const avgInterval = timeDiff / (tonBoostRewards - 1) / 1000 / 60; // в минутах
          console.log(`   - Средний интервал: ${avgInterval.toFixed(1)} минут`);
          
          if (avgInterval >= 4 && avgInterval <= 6) {
            console.log(`   - ✅ Интервал соответствует ~5 минутам`);
          } else {
            console.log(`   - ⚠️  Интервал отличается от ожидаемых 5 минут`);
          }
        }
      } else {
        console.log('❌ TON Boost начисления не найдены');
      }
    } else {
      console.log('❌ Начисления FARMING_REWARD не найдены после', cutoffDate);
    }

    // 4. ПРОВЕРКА РАБОТЫ ПЛАНИРОВЩИКА
    console.log('\n⏰ 4. ПРОВЕРКА РАБОТЫ ПЛАНИРОВЩИКА (CRON)\n');
    
    // Проверяем последнее начисление
    const { data: lastReward } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', testUserId)
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (lastReward) {
      const lastRewardDate = new Date(lastReward.created_at);
      const now = new Date();
      const minutesAgo = (now.getTime() - lastRewardDate.getTime()) / 1000 / 60;
      
      console.log(`📅 Последнее начисление: ${lastReward.created_at}`);
      console.log(`⏱️  Прошло времени: ${minutesAgo.toFixed(1)} минут`);
      
      if (minutesAgo <= 6) {
        console.log(`✅ Планировщик работает (последнее начисление менее 6 минут назад)`);
      } else if (minutesAgo <= 10) {
        console.log(`⚠️  Возможна задержка планировщика (прошло ${minutesAgo.toFixed(1)} минут)`);
      } else {
        console.log(`❌ Планировщик не работает (прошло ${minutesAgo.toFixed(1)} минут)`);
      }
    }

    // ИТОГОВЫЙ ОТЧЕТ
    console.log('\n' + '=' .repeat(70));
    console.log('📋 ИТОГОВЫЙ ОТЧЕТ\n');
    
    console.log('SQL запросы для проверки:');
    console.log('```sql');
    console.log(`-- 1. Проверка farming_balance`);
    console.log(`SELECT * FROM ton_farming_data WHERE user_id = ${testUserId};`);
    console.log(`\n-- 2. Проверка транзакций BOOST_PURCHASE`);
    console.log(`SELECT * FROM transactions WHERE user_id = ${testUserId} AND type = 'BOOST_PURCHASE' AND created_at >= '${cutoffDate}' ORDER BY created_at DESC;`);
    console.log(`\n-- 3. Проверка начислений`);
    console.log(`SELECT * FROM transactions WHERE user_id = ${testUserId} AND type = 'FARMING_REWARD' AND created_at >= '${cutoffDate}' ORDER BY created_at DESC LIMIT 10;`);
    console.log(`\n-- 4. Сумма всех депозитов`);
    console.log(`SELECT SUM(amount) as total FROM transactions WHERE user_id = ${testUserId} AND type = 'BOOST_PURCHASE';`);
    console.log('```');

  } catch (error) {
    console.error('❌ Критическая ошибка при выполнении аудита:', error);
  }
}

// Запуск аудита
auditTonBoostAccumulation()
  .then(() => {
    console.log('\n✅ Аудит завершен');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка выполнения аудита:', error);
    process.exit(1);
  });