#!/usr/bin/env node
/**
 * ДЕТАЛЬНАЯ ДИАГНОСТИКА БЕЗ ИЗМЕНЕНИЙ В КОДЕ
 * Анализ трех проблем:
 * 1. Последствия изменения REFERRAL_REWARD → REFERRAL_REWARD_TON
 * 2. Планировщик - где хранится конфигурация крона
 * 3. TON пополнения через TonConnect - цепочка отображения
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function detailedDiagnosisWithoutChanges() {
  console.log('🔍 ДЕТАЛЬНАЯ ДИАГНОСТИКА БЕЗ ИЗМЕНЕНИЙ В КОДЕ\n');
  console.log('📋 Задачи:');
  console.log('   1. Анализ последствий изменения типа referral_reward');
  console.log('   2. Диагностика конфигурации планировщика крона');
  console.log('   3. Цепочка отображения TON пополнений через TonConnect\n');

  // ================================
  // 1. АНАЛИЗ REFERRAL_REWARD ТИПОВ
  // ================================
  console.log('🧩 ПРОБЛЕМА 1: ПОСЛЕДСТВИЯ ИЗМЕНЕНИЯ REFERRAL_REWARD → REFERRAL_REWARD_TON\n');

  try {
    // Анализ всех REFERRAL_REWARD транзакций
    const { data: allReferralTx, error: refError } = await supabase
      .from('transactions')
      .select('id, user_id, type, currency, amount, description, created_at, metadata')
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false });

    if (refError) {
      console.error('❌ Ошибка получения referral транзакций:', refError);
    } else {
      console.log(`📊 НАЙДЕНО ${allReferralTx.length} REFERRAL_REWARD транзакций:`);
      
      let uniCount = 0;
      let tonCount = 0;
      
      allReferralTx.forEach(tx => {
        if (tx.currency === 'UNI') uniCount++;
        if (tx.currency === 'TON') tonCount++;
      });
      
      console.log(`   📈 UNI транзакций: ${uniCount}`);
      console.log(`   📈 TON транзакций: ${tonCount}`);
      
      console.log('\n🔍 АНАЛИЗ ПОСЛЕДСТВИЙ при изменении type:');
      console.log(`   ⚠️ При изменении TON транзакций на REFERRAL_REWARD_TON:`);
      console.log(`      - ${tonCount} существующих TON транзакций станут иметь другой type`);
      console.log(`      - Фильтры по type === 'REFERRAL_REWARD' не найдут TON транзакции`);
      console.log(`      - История транзакций может показывать только UNI референсы`);
      
      // Проверяем последние 5 TON referral для анализа metadata
      const recentTonReferrals = allReferralTx
        .filter(tx => tx.currency === 'TON')
        .slice(0, 5);
        
      console.log('\n📋 Последние 5 TON referral транзакций:');
      recentTonReferrals.forEach((tx, i) => {
        console.log(`   ${i + 1}. ID ${tx.id}: ${tx.amount} TON`);
        console.log(`      User: ${tx.user_id}`);
        console.log(`      Type: ${tx.type} (сейчас)`);
        console.log(`      Metadata: ${tx.metadata ? JSON.stringify(tx.metadata) : 'null'}`);
        console.log(`      Создана: ${new Date(tx.created_at).toLocaleString()}`);
      });
      
      // Анализ таблиц и зависимостей
      console.log('\n🔍 АНАЛИЗ ЗАВИСИМОСТЕЙ:');
      console.log('   📂 Таблицы, которые могут использовать type:');
      console.log('      - transactions (основная)');
      console.log('      - referral_earnings (если существует)'); 
      console.log('      - user_missions (возможно)');
      
      // Проверяем возможные фильтры в коде
      console.log('\n   🔍 Потенциальные места фильтрации по type:');
      console.log('      - TransactionHistory.tsx: фильтры по type');
      console.log('      - WalletService: getTransactionsByType()');
      console.log('      - ReferralService: подсчет referral наград');
      console.log('      - Dashboard: статистика по типам транзакций');
    }
    
  } catch (error) {
    console.error('❌ Ошибка анализа referral типов:', error.message);
  }

  // ================================
  // 2. ДИАГНОСТИКА ПЛАНИРОВЩИКА
  // ================================
  console.log('\n\n⏱️ ПРОБЛЕМА 2: КОНФИГУРАЦИЯ ПЛАНИРОВЩИКА КРОНА\n');

  try {
    console.log('🔍 Поиск конфигурационных файлов планировщика...');
    
    // Проверяем файлы cron/scheduler
    const possibleSchedulerFiles = [
      'server/scheduler.ts',
      'server/schedulers/index.ts', 
      'modules/farming/scheduler.ts',
      'core/scheduler.ts',
      'scripts/cron.js',
      'scripts/scheduler.js',
      'package.json'  // scripts section
    ];
    
    console.log('📂 Проверка файлов планировщика:');
    for (const file of possibleSchedulerFiles) {
      if (fs.existsSync(file)) {
        console.log(`   ✅ Найден: ${file}`);
      } else {
        console.log(`   ❌ Отсутствует: ${file}`);
      }
    }
    
    // Анализ интервалов из последних транзакций TON Boost
    console.log('\n📊 АНАЛИЗ ИНТЕРВАЛОВ ПЛАНИРОВЩИКА:');
    
    const { data: tonBoostTx, error: boostError } = await supabase
      .from('transactions')
      .select('id, amount, created_at, description, metadata')
      .eq('currency', 'TON')
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(20); // Увеличиваем выборку для лучшего анализа

    if (boostError) {
      console.error('❌ Ошибка получения TON Boost транзакций:', boostError);
    } else {
      console.log(`🔍 Анализ ${tonBoostTx.length} последних TON Boost транзакций:`);
      
      // Группируем по времени для поиска паттернов
      const timeGroups = {};
      const intervals = [];
      
      tonBoostTx.reverse(); // Сортируем по возрастанию времени
      
      let previousTime = null;
      tonBoostTx.forEach((tx, i) => {
        const currentTime = new Date(tx.created_at);
        const timeKey = currentTime.toLocaleString().substr(0, 16); // до минут
        
        if (!timeGroups[timeKey]) {
          timeGroups[timeKey] = [];
        }
        timeGroups[timeKey].push(tx);
        
        if (previousTime) {
          const intervalMinutes = (currentTime - previousTime) / (1000 * 60);
          intervals.push({
            from: previousTime.toLocaleTimeString(),
            to: currentTime.toLocaleTimeString(),
            minutes: intervalMinutes,
            txId: tx.id
          });
        }
        
        previousTime = currentTime;
      });
      
      console.log('\n🕐 ГРУППЫ ТРАНЗАКЦИЙ ПО ВРЕМЕНИ (поиск batch\'ов):');
      Object.entries(timeGroups).forEach(([time, txs]) => {
        if (txs.length > 1) {
          console.log(`   🚨 ${time}: ${txs.length} транзакций одновременно!`);
          console.log(`      IDs: ${txs.map(tx => tx.id).join(', ')}`);
        } else {
          console.log(`   ✅ ${time}: 1 транзакция (ID: ${txs[0].id})`);
        }
      });
      
      console.log('\n📈 ДЕТАЛЬНАЯ СТАТИСТИКА ИНТЕРВАЛОВ:');
      
      // Анализ коротких интервалов (< 1 минута)
      const shortIntervals = intervals.filter(int => int.minutes < 1);
      const normalIntervals = intervals.filter(int => int.minutes >= 4 && int.minutes <= 6);
      const longIntervals = intervals.filter(int => int.minutes > 6);
      
      console.log(`   🚨 Короткие интервалы (< 1 мин): ${shortIntervals.length}`);
      console.log(`   ✅ Нормальные интервалы (4-6 мин): ${normalIntervals.length}`);
      console.log(`   ⏰ Длинные интервалы (> 6 мин): ${longIntervals.length}`);
      
      if (shortIntervals.length > 0) {
        console.log('\n   🔍 Примеры коротких интервалов:');
        shortIntervals.slice(0, 5).forEach(int => {
          console.log(`      ${int.from} → ${int.to}: ${int.minutes.toFixed(3)} мин (TX: ${int.txId})`);
        });
      }
      
      console.log('\n🎯 ДИАГНОЗ ПЛАНИРОВЩИКА:');
      if (shortIntervals.length > normalIntervals.length) {
        console.log('   🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Множественные планировщики или зацикливание');
        console.log('   📋 Возможные причины:');
        console.log('      - Два экземпляра cron работают параллельно');
        console.log('      - pm2 или Docker перезапускает планировщик');
        console.log('      - Кеш старого планировщика не очищен');
        console.log('      - Планировщик попадает в бесконечный цикл');
      } else {
        console.log('   ✅ Планировщик работает преимущественно нормально');
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка диагностики планировщика:', error.message);
  }

  // ================================
  // 3. TON CONNECT ПОПОЛНЕНИЯ
  // ================================
  console.log('\n\n💸 ПРОБЛЕМА 3: TON ПОПОЛНЕНИЯ ЧЕРЕЗ TONCONNECT\n');

  try {
    console.log('🔍 Анализ цепочки отображения TON пополнений...');
    
    // Ищем TON депозиты (не referral и не farming reward)
    const { data: tonDeposits, error: depError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, description, created_at, metadata')
      .eq('currency', 'TON')
      .not('type', 'eq', 'REFERRAL_REWARD')
      .not('type', 'eq', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);

    if (depError) {
      console.error('❌ Ошибка получения TON депозитов:', depError);
    } else {
      console.log(`📊 Найдено ${tonDeposits.length} потенциальных TON депозитов:`);
      
      if (tonDeposits.length === 0) {
        console.log('   🚨 НЕТ TON ДЕПОЗИТОВ в базе данных!');
        console.log('   📋 Это означает:');
        console.log('      - TonConnect транзакции НЕ сохраняются как депозиты');
        console.log('      - Только balance обновляется без создания transaction записи'); 
        console.log('      - Пользователь видит увеличение баланса но не видит транзакцию');
      } else {
        tonDeposits.forEach((tx, i) => {
          console.log(`   ${i + 1}. ID ${tx.id}: ${tx.amount} TON`);
          console.log(`      Type: ${tx.type}`);
          console.log(`      User: ${tx.user_id}`);
          console.log(`      Description: ${tx.description}`);
          console.log(`      Created: ${new Date(tx.created_at).toLocaleString()}`);
          console.log(`      Metadata: ${tx.metadata ? JSON.stringify(tx.metadata) : 'null'}`);
        });
      }
    }
    
    // Анализ TON транзакций User 184 для поиска паттернов
    console.log('\n🔍 Анализ всех TON транзакций User 184:');
    
    const { data: user184TonTx, error: userTonError } = await supabase
      .from('transactions')
      .select('id, type, amount, description, created_at, metadata')
      .eq('user_id', 184)
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(15);

    if (userTonError) {
      console.error('❌ Ошибка получения TON транзакций пользователя:', userTonError);
    } else {
      console.log(`📋 ${user184TonTx.length} TON транзакций User 184:`);
      
      const txByType = {};
      user184TonTx.forEach(tx => {
        if (!txByType[tx.type]) {
          txByType[tx.type] = [];
        }
        txByType[tx.type].push(tx);
      });
      
      Object.entries(txByType).forEach(([type, txs]) => {
        console.log(`   📊 ${type}: ${txs.length} транзакций`);
        if (type === 'TON_DEPOSIT' || type === 'DEPOSIT') {
          console.log('      ✅ Это TON пополнения');
          txs.slice(0, 3).forEach(tx => {
            console.log(`         ID ${tx.id}: ${tx.amount} TON - ${tx.description}`);
          });
        }
      });
      
      console.log('\n🎯 АНАЛИЗ ЦЕПОЧКИ ОТОБРАЖЕНИЯ:');
      
      if (txByType['TON_DEPOSIT'] || txByType['DEPOSIT']) {
        console.log('   ✅ TON депозиты ЕСТЬ в базе данных');
        console.log('   📋 Проблема в Frontend отображении:');
        console.log('      - TransactionHistory.tsx: фильтры могут исключать TON депозиты');
        console.log('      - WalletService: getTransactionsByType() не включает депозиты');
        console.log('      - UI компонент: StyledTransactionItem не распознает тип');
      } else {
        console.log('   🚨 TON депозиты ОТСУТСТВУЮТ в базе');
        console.log('   📋 Проблема в Backend создании транзакций:');
        console.log('      - TonConnect service не вызывает createTransaction()');
        console.log('      - WalletService.processTonDeposit() не работает');
        console.log('      - Только balance обновляется напрямую');
      }
      
      console.log('\n📂 ЦЕПОЧКА КОМПОНЕНТОВ для диагностики:');
      console.log('   1. Frontend: TonConnect → sendTonTransaction()');
      console.log('   2. Backend: /api/v2/wallet/ton-deposit');
      console.log('   3. Service: WalletService.processTonDeposit()');
      console.log('   4. Repository: создание transaction записи');
      console.log('   5. UI: TransactionHistory → StyledTransactionItem');
      
      console.log('\n🔍 ФАЙЛЫ ДЛЯ ПРОВЕРКИ (БЕЗ ИЗМЕНЕНИЙ):');
      console.log('   - client/src/services/tonConnectService.ts');
      console.log('   - server/routes/wallet.ts');
      console.log('   - modules/wallet/service.ts');
      console.log('   - client/src/components/wallet/TransactionHistory.tsx');
    }
    
  } catch (error) {
    console.error('❌ Ошибка анализа TON пополнений:', error.message);
  }

  console.log('\n🎯 ДИАГНОСТИКА ЗАВЕРШЕНА');
  console.log('📋 Готов детальный анализ всех трех проблем');
  console.log('⚠️ НИКАКИХ ИЗМЕНЕНИЙ В КОД НЕ ВНЕСЕНО');
}

detailedDiagnosisWithoutChanges();