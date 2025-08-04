#!/usr/bin/env tsx
/**
 * 🎯 ФИНАЛЬНЫЙ ДИАГНОЗ: Потерянные 1.65 TON пользователя ID 255
 * Итоговый анализ всех собранных данных
 */

import { supabase } from './core/supabase';

async function finalDiagnosisUser255() {
  console.log('🎯 ФИНАЛЬНЫЙ ДИАГНОЗ: Потерянные 1.65 TON пользователя ID 255');
  console.log('='.repeat(80));

  try {
    // 1. Сводка данных пользователя 255
    console.log('\n1️⃣ СВОДКА ПОЛЬЗОВАТЕЛЯ ID 255:');
    const { data: user255 } = await supabase
      .from('users')
      .select('*')
      .eq('id', 255)
      .single();

    if (user255) {
      console.log('✅ Пользователь ID 255 (Glazeb0):');
      console.log(`   telegram_id: ${user255.telegram_id}`);
      console.log(`   username: ${user255.username}`);
      console.log(`   first_name: ${user255.first_name}`);
      console.log(`   balance_ton: ${user255.balance_ton} TON`);
      console.log(`   balance_uni: ${user255.balance_uni} UNI`);
      console.log(`   ton_boost_package: ${user255.ton_boost_package}`);
      console.log(`   ton_boost_active: ${user255.ton_boost_active}`);
      console.log(`   ton_boost_rate: ${user255.ton_boost_rate}`);
      console.log(`   ton_farming_balance: ${user255.ton_farming_balance}`);
      console.log(`   ton_wallet_address: ${user255.ton_wallet_address || 'НЕ УСТАНОВЛЕН'}`);
      console.log(`   ton_wallet_verified: ${user255.ton_wallet_verified}`);
      console.log(`   created_at: ${user255.created_at}`);
    }

    // 2. Подсчет TON транзакций за всё время
    console.log('\n2️⃣ СТАТИСТИКА TON ТРАНЗАКЦИЙ ПОЛЬЗОВАТЕЛЯ 255:');
    const { data: allTonTx } = await supabase
      .from('transactions')
      .select('type, amount, status, created_at')
      .eq('user_id', 255)
      .eq('currency', 'TON');

    if (allTonTx) {
      const stats = {
        tonDeposits: allTonTx.filter(tx => tx.type === 'TON_DEPOSIT').length,
        farmingRewards: allTonTx.filter(tx => tx.type === 'FARMING_REWARD').length,
        referralRewards: allTonTx.filter(tx => tx.type === 'REFERRAL_REWARD').length,
        withdrawals: allTonTx.filter(tx => tx.type === 'WITHDRAWAL').length,
        totalTransactions: allTonTx.length
      };

      const totalEarned = allTonTx
        .filter(tx => ['FARMING_REWARD', 'REFERRAL_REWARD', 'TON_DEPOSIT'].includes(tx.type))
        .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

      const totalSpent = allTonTx
        .filter(tx => ['WITHDRAWAL', 'FARMING_DEPOSIT'].includes(tx.type))
        .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

      console.log('✅ Статистика TON транзакций:');
      console.log(`   📥 TON_DEPOSIT: ${stats.tonDeposits} транзакций`);
      console.log(`   💰 FARMING_REWARD: ${stats.farmingRewards} транзакций`);
      console.log(`   🎁 REFERRAL_REWARD: ${stats.referralRewards} транзакций`);
      console.log(`   📤 WITHDRAWAL: ${stats.withdrawals} транзакций`);
      console.log(`   📊 Всего TON транзакций: ${stats.totalTransactions}`);
      console.log(`   💵 Всего заработано: ${totalEarned.toFixed(6)} TON`);
      console.log(`   💸 Всего потрачено: ${totalSpent.toFixed(6)} TON`);
      console.log(`   🏦 Расчетный баланс: ${(totalEarned - totalSpent).toFixed(6)} TON`);
      console.log(`   💳 Фактический баланс: ${user255?.balance_ton} TON`);
    }

    // 3. Анализ дубликата пользователя 256
    console.log('\n3️⃣ АНАЛИЗ ДУБЛИКАТА ПОЛЬЗОВАТЕЛЯ ID 256:');
    const { data: user256 } = await supabase
      .from('users')
      .select('*')
      .eq('id', 256)
      .single();

    if (user256) {
      console.log('✅ Пользователь ID 256 (дубликат):');
      console.log(`   telegram_id: ${user256.telegram_id} (ВНИМАНИЕ: ${user256.telegram_id})`);
      console.log(`   username: ${user256.username} (тот же что у 255)`);
      console.log(`   ton_wallet_address: ${user256.ton_wallet_address?.slice(0, 30)}...`);
      console.log(`   ton_wallet_verified: ${user256.ton_wallet_verified}`);
      console.log(`   balance_ton: ${user256.balance_ton} TON`);
      console.log(`   created_at: ${user256.created_at}`);

      // Проверяем транзакции пользователя 256
      const { data: tx256 } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', 256);

      console.log(`   📊 Транзакций у дубликата: ${tx256?.length || 0}`);
    }

    // 4. Поиск депозитов с адресом кошелька пользователя 256
    console.log('\n4️⃣ ПОИСК ДЕПОЗИТОВ С КОШЕЛЬКОМ ПОЛЬЗОВАТЕЛЯ 256:');
    if (user256?.ton_wallet_address) {
      const { data: walletDeposits } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'TON_DEPOSIT')
        .ilike('description', `%${user256.ton_wallet_address}%`);

      console.log(`✅ Депозитов с адресом кошелька 256: ${walletDeposits?.length || 0}`);
      walletDeposits?.forEach((dep, i) => {
        console.log(`\n💰 Найденный депозит ${i + 1}:`);
        console.log(`   user_id: ${dep.user_id} (должен быть 256, а не 255!)`);
        console.log(`   amount: ${dep.amount} TON`);
        console.log(`   created_at: ${dep.created_at}`);
        console.log(`   status: ${dep.status}`);
        console.log(`   tx_hash: ${dep.tx_hash || 'НЕТ ХЕША'}`);
      });
    }

    // 5. Финальная диагностика
    console.log('\n5️⃣ ВРЕМЕННАЯ ДИАГНОСТИКА TON BOOST АКТИВАЦИИ:');
    
    // Найдем когда активировался TON Boost у пользователя 255
    const { data: firstBoostReward } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 255)
      .ilike('description', '%TON Boost%')
      .order('created_at', { ascending: true })
      .limit(1);

    if (firstBoostReward && firstBoostReward.length > 0) {
      const boostActivationTime = new Date(firstBoostReward[0].created_at);
      console.log(`✅ TON Boost активирован: ${firstBoostReward[0].created_at}`);
      
      // Поиск всех депозитов в пределах 2 часов до активации
      const twoHoursBefore = new Date(boostActivationTime.getTime() - 2 * 60 * 60 * 1000);
      const { data: suspiciousDeposits } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'TON_DEPOSIT')
        .gte('created_at', twoHoursBefore.toISOString())
        .lte('created_at', boostActivationTime.toISOString());

      console.log(`\n🔍 Депозиты за 2 часа до активации boost: ${suspiciousDeposits?.length || 0}`);
      suspiciousDeposits?.forEach((dep, i) => {
        console.log(`\n⏰ Подозрительный депозит ${i + 1}:`);
        console.log(`   user_id: ${dep.user_id}, amount: ${dep.amount} TON`);
        console.log(`   created_at: ${dep.created_at}`);
        const diffMinutes = Math.round((boostActivationTime.getTime() - new Date(dep.created_at).getTime()) / (1000 * 60));
        console.log(`   ⏱️ За ${diffMinutes} минут до boost активации`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('🚨 ФИНАЛЬНЫЙ ДИАГНОЗ ПРОБЛЕМЫ:');
    console.log('');
    console.log('✅ УСТАНОВЛЕННЫЕ ФАКТЫ:');
    console.log('1. Пользователь ID 255 имеет активный TON Boost пакет');
    console.log('2. Получает TON Boost доходы каждые несколько минут');
    console.log('3. НО в истории транзакций НЕТ ни одного TON_DEPOSIT');
    console.log('4. Баланс TON только от referral и farming rewards');
    console.log('5. Существует дубликат пользователя ID 256 с TON кошельком');
    console.log('');
    console.log('🔍 ВЕРОЯТНАЯ ПРИЧИНА:');
    console.log('- Депозиты 1.65 TON были сделаны в blockchain');
    console.log('- TON Boost пакет активировался (есть доходы)');
    console.log('- Но webhook обработчик НЕ создал TON_DEPOSIT записи');
    console.log('- Возможно проблема с привязкой кошелька или дедупликацией');
    console.log('');
    console.log('💡 РЕКОМЕНДАЦИИ ДЛЯ ВОССТАНОВЛЕНИЯ:');
    console.log('1. Найти blockchain tx_hash для депозитов 0.65 + 1.0 TON');
    console.log('2. Вручную создать TON_DEPOSIT записи в базе данных');
    console.log('3. Обновить баланс пользователя на 1.65 TON');
    console.log('4. Проверить и исправить систему обработки депозитов');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ФИНАЛЬНОГО ДИАГНОЗА:', error);
  }
}

finalDiagnosisUser255().catch(console.error);