#!/usr/bin/env tsx
/**
 * 🔍 АНАЛИЗ ПОТОКА ОБРАБОТКИ ДЕПОЗИТОВ
 * Исследование критических точек в коде где может происходить сбой
 */

import { supabase } from './core/supabase';

async function analyzeDepositProcessingFlow() {
  console.log('🔍 АНАЛИЗ ПОТОКА ОБРАБОТКИ ДЕПОЗИТОВ');
  console.log('='.repeat(80));

  try {
    // Краткая статистика из предыдущего анализа  
    console.log('\n📊 КРАТКАЯ СТАТИСТИКА ПРОБЛЕМЫ:');
    console.log('- Из 27 пользователей с TON Boost, 21 проблемных (77.8%)');
    console.log('- Основная проблема: NO_DEPOSITS или INSUFFICIENT_DEPOSITS');
    console.log('- Время: преимущественно июль 2025 (17 из 21)');
    console.log('- Только 3 успешных тестовых аккаунта с August 2025');
    
    // 1. Анализ транзакций с нулевыми депозитами но положительным балансом
    console.log('\n1️⃣ АНАЛИЗ ПОЛЬЗОВАТЕЛЕЙ С ПОЛОЖИТЕЛЬНЫМ БАЛАНСОМ БЕЗ ДЕПОЗИТОВ:');
    
    const problematicUsers = [255, 305, 192, 230, 246, 245, 194, 307, 226]; // NO_DEPOSITS users
    
    for (const userId of problematicUsers.slice(0, 5)) {
      const { data: user } = await supabase
        .from('users')
        .select('id, username, balance_ton, ton_boost_active, ton_boost_package')
        .eq('id', userId)
        .single();

      if (user && user.balance_ton > 0) {
        console.log(`\n🔍 Пользователь ${userId} (${user.username}):`);
        console.log(`   Balance TON: ${user.balance_ton}`);
        console.log(`   TON Boost: пакет ${user.ton_boost_package}, активен: ${user.ton_boost_active}`);
        
        // Ищем откуда пришел баланс (если не из депозитов)
        const { data: tonTx } = await supabase
          .from('transactions')
          .select('type, amount, description, created_at')
          .eq('user_id', userId)
          .eq('currency', 'TON')
          .order('created_at', { ascending: true });

        console.log(`   Источники TON баланса:`);
        tonTx?.forEach((tx, i) => {
          if (i < 3) { // первые 3 транзакции
            console.log(`     ${tx.type}: ${tx.amount} TON (${tx.created_at.slice(0, 16)})`);
          }
        });
        
        const totalFromRewards = tonTx
          ?.filter(tx => tx.type === 'REFERRAL_REWARD' || tx.type === 'FARMING_REWARD')
          .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0;
          
        console.log(`   Всего от rewards: ${totalFromRewards.toFixed(6)} TON`);
        console.log(`   Необъясненный баланс: ${(user.balance_ton - totalFromRewards).toFixed(6)} TON`);
      }
    }

    // 2. Поиск транзакций со статусом pending или failed
    console.log('\n2️⃣ ПОИСК ЗАВИСШИХ И НЕУДАВШИХСЯ ТРАНЗАКЦИЙ:');
    
    const { data: pendingTx, error: pendingError } = await supabase
      .from('transactions')
      .select('user_id, type, amount, status, created_at, metadata')
      .eq('type', 'TON_DEPOSIT')
      .in('status', ['pending', 'failed', 'error'])
      .gte('created_at', '2025-07-01T00:00:00.000Z')
      .order('created_at', { ascending: false });

    if (!pendingError && pendingTx) {
      console.log(`✅ Найдено зависших/неудавшихся TON депозитов: ${pendingTx.length}`);
      
      pendingTx.forEach((tx, i) => {
        console.log(`\n⏳ Транзакция ${i + 1}:`);
        console.log(`   user_id: ${tx.user_id}, amount: ${tx.amount} TON`);
        console.log(`   status: ${tx.status}, created: ${tx.created_at}`);
        console.log(`   metadata:`, tx.metadata);
      });
    }

    // 3. Анализ metadata в TON_DEPOSIT транзакциях
    console.log('\n3️⃣ АНАЛИЗ METADATA В TON ДЕПОЗИТАХ:');
    
    const { data: allDeposits, error: allDepositsError } = await supabase
      .from('transactions')
      .select('user_id, amount, metadata, created_at')
      .eq('type', 'TON_DEPOSIT')
      .gte('created_at', '2025-07-01T00:00:00.000Z')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!allDepositsError && allDeposits) {
      console.log(`✅ Анализ metadata последних ${allDeposits.length} депозитов:`);
      
      const metadataTypes = {};
      allDeposits.forEach(dep => {
        const metadata = dep.metadata || {};
        const type = metadata.transaction_type || 'unknown';
        metadataTypes[type] = (metadataTypes[type] || 0) + 1;
      });
      
      console.log('📊 Типы транзакций в metadata:');
      Object.entries(metadataTypes).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} транзакций`);
      });
    }

    // 4. Проверка логики UnifiedTransactionService
    console.log('\n4️⃣ АНАЛИЗ ДЕДУПЛИКАЦИИ ТРАНЗАКЦИЙ:');
    
    // Поиск возможных дубликатов по tx_hash
    const { data: duplicateTx, error: dupError } = await supabase
      .from('transactions')
      .select('tx_hash, COUNT(*) as count')
      .eq('type', 'TON_DEPOSIT')
      .not('tx_hash', 'is', null)
      .gte('created_at', '2025-07-01T00:00:00.000Z')
      .group('tx_hash')
      .having('COUNT(*)', 'gt', 1);

    if (!dupError && duplicateTx) {
      console.log(`🔍 Найдено дублированных tx_hash: ${duplicateTx.length}`);
      
      if (duplicateTx.length > 0) {
        console.log('⚠️ Возможные дубликаты транзакций найдены!');
        duplicateTx.slice(0, 3).forEach(dup => {
          console.log(`   tx_hash: ${dup.tx_hash?.slice(0, 20)}... (${dup.count} раз)`);
        });
      }
    }

    // 5. Проверка временных окон активации TON Boost
    console.log('\n5️⃣ АНАЛИЗ ВРЕМЕННЫХ ОКОН АКТИВАЦИИ TON BOOST:');
    
    // Для 3 проблемных пользователей смотрим когда активировался boost
    const sampleUsers = [255, 305, 192];
    
    for (const userId of sampleUsers) {
      const { data: firstBoost } = await supabase
        .from('transactions')
        .select('created_at, description')
        .eq('user_id', userId)
        .ilike('description', '%TON Boost%')
        .order('created_at', { ascending: true })
        .limit(1);

      if (firstBoost && firstBoost.length > 0) {
        console.log(`\n⏰ Пользователь ${userId}:`);
        console.log(`   Первый TON Boost доход: ${firstBoost[0].created_at}`);
        
        // Ищем депозиты в окне ±2 часа
        const boostTime = new Date(firstBoost[0].created_at);
        const windowStart = new Date(boostTime.getTime() - 2 * 60 * 60 * 1000);
        const windowEnd = new Date(boostTime.getTime() + 2 * 60 * 60 * 1000);
        
        const { data: nearbyDeposits } = await supabase
          .from('transactions')
          .select('user_id, amount, created_at')
          .eq('type', 'TON_DEPOSIT')
          .gte('created_at', windowStart.toISOString())
          .lte('created_at', windowEnd.toISOString());

        console.log(`   Депозиты в окне ±2 часа: ${nearbyDeposits?.length || 0}`);
        nearbyDeposits?.forEach(dep => {
          const diffMinutes = Math.round((new Date(dep.created_at).getTime() - boostTime.getTime()) / (1000 * 60));
          console.log(`     user_id ${dep.user_id}: ${dep.amount} TON (${diffMinutes > 0 ? '+' : ''}${diffMinutes} мин)`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎯 ВЫЯВЛЕННЫЕ ПАТТЕРНЫ СИСТЕМНОЙ ПРОБЛЕМЫ:');
    console.log('');
    console.log('1. 🔄 ПРОБЛЕМА ЧАСТИЧНОЙ ОБРАБОТКИ:');
    console.log('   - TON Boost активируется (видим доходы)');
    console.log('   - Но TON_DEPOSIT записи не создаются');
    console.log('   - Баланс частично обновляется (откуда-то берется TON)');
    console.log('');
    console.log('2. ⏱️ ВРЕМЕННАЯ ДЕСИНХРОНИЗАЦИЯ:');
    console.log('   - Boost активируется в определенное время');
    console.log('   - Но депозиты в это время отсутствуют');
    console.log('   - Возможно webhook vs scheduler расхождение');
    console.log('');
    console.log('3. 📊 СТАТИСТИЧЕСКАЯ АНОМАЛИЯ:');
    console.log('   - 77.8% проблемных аккаунтов из TON Boost пользователей');
    console.log('   - Только тестовые аккаунты работают идеально');
    console.log('   - Проблема началась в июле 2025');
    console.log('');
    console.log('4. 🔧 ВЕРОЯТНЫЕ ПРИЧИНЫ:');
    console.log('   a) Webhook обработчик получает данные но падает на этапе создания TON_DEPOSIT');
    console.log('   b) UnifiedTransactionService блокирует дубликаты но не создает основную запись');
    console.log('   c) Scheduler активирует boost независимо от состояния депозитов');
    console.log('   d) Race condition между webhook и scheduler обработкой');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА АНАЛИЗА:', error);
  }
}

analyzeDepositProcessingFlow().catch(console.error);