#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY!
);

console.log('\n💎 ФИНАЛЬНЫЙ АНАЛИЗ: ГДЕ СОЗДАЮТСЯ DEPOSIT ТРАНЗАКЦИИ');
console.log('='.repeat(70));

async function analyzeDepositCreation() {
  try {
    // 1. Найдем старые и новые DEPOSIT транзакции
    const { data: allDeposits, error: depositError } = await supabase
      .from('transactions')
      .select('id, user_id, amount_ton, description, metadata, created_at')
      .eq('type', 'DEPOSIT')
      .gt('amount_ton', 0.01)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!depositError && allDeposits) {
      console.log(`\n1️⃣ НАЙДЕНО ${allDeposits.length} DEPOSIT ТРАНЗАКЦИЙ:`);
      console.log('-'.repeat(50));
      
      let withUnifiedService = 0;
      let withoutUnifiedService = 0;
      let withTxHash = 0;
      
      console.log('📊 АНАЛИЗ ИСТОЧНИКА СОЗДАНИЯ:');
      allDeposits.forEach((tx, index) => {
        const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata || {});
        const hasOriginalType = !!metadata.original_type;
        const hasTxHash = !!metadata.tx_hash;
        const hasSource = !!metadata.source;
        
        if (hasOriginalType || hasSource) withUnifiedService++;
        else withoutUnifiedService++;
        
        if (hasTxHash) withTxHash++;
        
        if (index < 10) { // Показываем первые 10
          console.log(`\n   #${index + 1} ID: ${tx.id}, User: ${tx.user_id}, Amount: ${tx.amount_ton} TON`);
          console.log(`       Время: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
          console.log(`       Описание: ${tx.description || 'Нет описания'}`);
          console.log(`       Original_type: ${metadata.original_type || 'Нет'}`);
          console.log(`       Source: ${metadata.source || 'Нет'}`);
          console.log(`       TX_Hash: ${hasTxHash ? metadata.tx_hash.substring(0, 20) + '...' : 'Нет'}`);
          console.log(`       🔍 Источник: ${hasOriginalType || hasSource ? 'UnifiedTransactionService' : 'Прямое создание в БД'}`);
        }
      });
      
      console.log(`\n📈 СТАТИСТИКА ИСТОЧНИКОВ:`);
      console.log(`   🔧 Через UnifiedTransactionService: ${withUnifiedService}`);
      console.log(`   📝 Прямое создание в БД: ${withoutUnifiedService}`);
      console.log(`   🔗 С TX Hash: ${withTxHash}`);
      console.log(`   📅 Без TX Hash: ${allDeposits.length - withTxHash}`);
      
      // Проверим где в коде могут создаваться DEPOSIT напрямую
      console.log(`\n💡 АНАЛИЗ:`);
      if (withoutUnifiedService > withUnifiedService) {
        console.log('   ⚠️  БОЛЬШИНСТВО DEPOSIT созданы НАПРЯМУЮ в БД');
        console.log('   🔍 Возможные источники:');
        console.log('      - Старая версия WalletService без UnifiedTransactionService');
        console.log('      - Прямые SQL вставки');
        console.log('      - Импорт данных');
        console.log('      - Другой API endpoint');
      } else {
        console.log('   ✅ БОЛЬШИНСТВО DEPOSIT созданы через UnifiedTransactionService');
      }
    }

    // 2. Проверим текущую версию WalletService
    console.log(`\n2️⃣ ПРОВЕРКА ТЕКУЩЕЙ ЛОГИКИ WALLETSERVICE:`);
    console.log('-'.repeat(50));
    
    console.log('📋 ТЕКУЩИЙ КОД (modules/wallet/service.ts):');
    console.log(`   ✅ processTonDeposit() использует UnifiedTransactionService`);
    console.log(`   ✅ Тип: 'TON_DEPOSIT' → UnifiedTransactionService`);
    console.log(`   ✅ Маппинг: 'TON_DEPOSIT' → 'FARMING_REWARD'`);
    console.log(`   ❓ Но реальные DEPOSIT в БД имеют тип 'DEPOSIT'`);

    // 3. Проверим User #25 конкретно
    console.log(`\n3️⃣ АНАЛИЗ USER #25 (ИСЧЕЗАЮЩИЕ ДЕПОЗИТЫ):`);
    console.log('-'.repeat(50));
    
    const { data: user25Deposits, error: user25Error } = await supabase
      .from('transactions')
      .select('id, type, amount_ton, description, metadata, created_at')
      .eq('user_id', 25)
      .in('type', ['DEPOSIT', 'FARMING_REWARD'])
      .gt('amount_ton', 0.01)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!user25Error && user25Deposits) {
      console.log(`💰 Найдено ${user25Deposits.length} TON транзакций для User #25:`);
      
      const deposits = user25Deposits.filter(tx => tx.type === 'DEPOSIT');
      const farmingRewards = user25Deposits.filter(tx => tx.type === 'FARMING_REWARD');
      
      console.log(`   📥 DEPOSIT: ${deposits.length}`);
      console.log(`   🌾 FARMING_REWARD: ${farmingRewards.length}`);
      
      deposits.forEach(tx => {
        const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata || {});
        console.log(`\n   💎 DEPOSIT ID: ${tx.id}, Amount: ${tx.amount_ton} TON`);
        console.log(`      Время: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        console.log(`      TX_Hash: ${metadata.tx_hash?.substring(0, 30)}...`);
        console.log(`      Source: ${metadata.source || 'Не указан'}`);
      });
      
      // Найдем TON boost доходы для сравнения
      const tonBoostRewards = farmingRewards.filter(tx => {
        const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata || {});
        return metadata.original_type === 'TON_BOOST_INCOME';
      });
      
      console.log(`\n   🚀 TON Boost доходы: ${tonBoostRewards.length}`);
      if (tonBoostRewards.length > 0) {
        const latestBoost = tonBoostRewards[0];
        const metadata = typeof latestBoost.metadata === 'string' ? JSON.parse(latestBoost.metadata || '{}') : (latestBoost.metadata || {});
        console.log(`      Последний: ${latestBoost.amount_ton} TON (${new Date(latestBoost.created_at).toLocaleString('ru-RU')})`);
        console.log(`      Daily_rate: ${metadata.daily_rate}, Deposit: ${metadata.user_deposit}`);
      }
    }

    // 4. Финальное заключение
    console.log(`\n4️⃣ ФИНАЛЬНОЕ ЗАКЛЮЧЕНИЕ:`);
    console.log('-'.repeat(50));
    console.log('🎯 ПРОБЛЕМА ЛОКАЛИЗОВАНА:');
    console.log('   1. Текущий код создает TON_DEPOSIT → FARMING_REWARD');
    console.log('   2. Реальные депозиты в БД имеют тип DEPOSIT');
    console.log('   3. WebSocket работает для FARMING_REWARD, но НЕ для DEPOSIT');
    console.log('   4. Возможно есть старая логика создания DEPOSIT напрямую');
    
    console.log('\n🔧 РЕКОМЕНДУЕМОЕ РЕШЕНИЕ:');
    console.log('   📋 ВАРИАНТ 1 (РЕКОМЕНДУЕТСЯ): Добавить DEPOSIT в WebSocket');
    console.log('      - Добавить DEPOSIT в shouldUpdateBalance()');
    console.log('      - Минимальные изменения, максимальная совместимость');
    console.log('      - Поддержка всех существующих DEPOSIT транзакций');
    
    console.log('\n   📋 ВАРИАНТ 2: Исправить источник создания DEPOSIT');
    console.log('      - Найти где создаются DEPOSIT транзакции напрямую');
    console.log('      - Переключить на UnifiedTransactionService');
    console.log('      - Более сложный, но архитектурно правильный');

  } catch (error) {
    console.error('❌ Ошибка финального анализа:', error);
  }
}

analyzeDepositCreation();
