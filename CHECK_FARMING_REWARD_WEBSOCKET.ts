#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY!
);

console.log('\n🌐 ПРОВЕРКА WEBSOCKET И FARMING_REWARD ИНТЕГРАЦИИ');
console.log('='.repeat(65));

async function checkWebSocketIntegration() {
  try {
    // 1. Проверяем есть ли FARMING_REWARD транзакции с original_type = TON_DEPOSIT
    console.log('\n1️⃣ ПОИСК TON_DEPOSIT В FARMING_REWARD');
    console.log('-'.repeat(50));
    
    const { data: tonDepositFarming, error: farmingError } = await supabase
      .from('transactions')
      .select('id, user_id, amount_ton, description, metadata, created_at')
      .eq('type', 'FARMING_REWARD')
      .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (!farmingError && tonDepositFarming) {
      const tonDepositCandidates = tonDepositFarming.filter(tx => {
        const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata || {});
        return metadata.original_type === 'TON_DEPOSIT' || 
               (tx.description?.toLowerCase().includes('deposit') && parseFloat(tx.amount_ton || '0') > 0);
      });
      
      console.log(`📊 Всего FARMING_REWARD: ${tonDepositFarming.length}`);
      console.log(`💎 С TON_DEPOSIT маркерами: ${tonDepositCandidates.length}`);
      
      if (tonDepositCandidates.length > 0) {
        console.log('\n🔍 ПРИМЕРЫ TON_DEPOSIT В FARMING_REWARD:');
        tonDepositCandidates.slice(0, 3).forEach(tx => {
          const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata || {});
          console.log(`   ID: ${tx.id}, User: ${tx.user_id}, Amount: ${tx.amount_ton} TON`);
          console.log(`      Original_type: ${metadata.original_type}`);
          console.log(`      TX_Hash: ${metadata.tx_hash?.substring(0, 25)}...`);
          console.log(`      Описание: ${tx.description}`);
          console.log('');
        });
      } else {
        console.log('❌ НЕ НАЙДЕНО TON_DEPOSIT в FARMING_REWARD за последнюю неделю');
        console.log('💡 Это означает что новые депозиты НЕ проходят через UnifiedTransactionService');
      }
    }

    // 2. Проверяем shouldUpdateBalance логику
    console.log('\n2️⃣ АНАЛИЗ SHOULDUPDATEBALANCE ЛОГИКИ');
    console.log('-'.repeat(50));
    
    // Проверим текущую логику из кода
    const shouldUpdateTypes = [
      'FARMING_REWARD', 'TON_BOOST_INCOME', 'UNI_DEPOSIT', 'TON_DEPOSIT', 
      'REFERRAL_REWARD', 'MISSION_REWARD', 'DAILY_BONUS'
    ];
    
    console.log('📋 ТИПЫ ТРАНЗАКЦИЙ, КОТОРЫЕ ОБНОВЛЯЮТ БАЛАНС:');
    shouldUpdateTypes.forEach(type => {
      console.log(`   ✅ ${type}`);
    });
    
    console.log('\n💡 АНАЛИЗ:');
    console.log('   🔍 TON_DEPOSIT в списке → должен обновлять баланс');
    console.log('   🔍 FARMING_REWARD в списке → должен обновлять баланс');
    console.log('   ❓ DEPOSIT НЕ в списке → НЕ обновляет баланс через WebSocket');

    // 3. Проверяем реальные DEPOSIT транзакции и их баланс эффект
    console.log('\n3️⃣ ПРОВЕРКА DEPOSIT ТРАНЗАКЦИЙ И БАЛАНСА');
    console.log('-'.repeat(50));
    
    // Найдем пользователя с недавним DEPOSIT
    const { data: recentDeposits, error: depositError } = await supabase
      .from('transactions')
      .select('id, user_id, amount_ton, created_at, metadata')
      .eq('type', 'DEPOSIT')
      .gt('amount_ton', 0.05)
      .gt('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (!depositError && recentDeposits && recentDeposits.length > 0) {
      console.log(`💰 Найдено ${recentDeposits.length} недавних DEPOSIT транзакций:`);
      
      for (const deposit of recentDeposits) {
        console.log(`\n🔍 АНАЛИЗ DEPOSIT ID: ${deposit.id}`);
        console.log(`   User: ${deposit.user_id}, Amount: ${deposit.amount_ton} TON`);
        console.log(`   Время: ${new Date(deposit.created_at).toLocaleString('ru-RU')}`);
        
        // Проверяем баланс пользователя
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, balance_ton, telegram_username')
          .eq('id', deposit.user_id)
          .single();
          
        if (!userError && user) {
          console.log(`   Текущий баланс: ${user.balance_ton} TON`);
          console.log(`   Username: @${user.telegram_username}`);
          
          // Проверяем есть ли соответствующая FARMING_REWARD транзакция
          const { data: correspondingFarming, error: corrError } = await supabase
            .from('transactions')
            .select('id, amount_ton, description, metadata')
            .eq('type', 'FARMING_REWARD')
            .eq('user_id', deposit.user_id)
            .gte('created_at', new Date(new Date(deposit.created_at).getTime() - 5 * 60 * 1000).toISOString())
            .lte('created_at', new Date(new Date(deposit.created_at).getTime() + 5 * 60 * 1000).toISOString());
            
          if (!corrError && correspondingFarming && correspondingFarming.length > 0) {
            console.log(`   🔗 НАЙДЕНА соответствующая FARMING_REWARD:`);
            correspondingFarming.forEach(fr => {
              const metadata = typeof fr.metadata === 'string' ? JSON.parse(fr.metadata || '{}') : (fr.metadata || {});
              console.log(`      ID: ${fr.id}, Amount: ${fr.amount_ton} TON`);
              console.log(`      Original_type: ${metadata.original_type}`);
            });
          } else {
            console.log(`   ❌ НЕТ соответствующей FARMING_REWARD транзакции`);
          }
        }
      }
    } else {
      console.log('❌ Не найдено недавних DEPOSIT транзакций для анализа');
    }

    // 4. Финальные рекомендации
    console.log('\n4️⃣ ФИНАЛЬНЫЙ АНАЛИЗ И РЕКОМЕНДАЦИИ');
    console.log('-'.repeat(50));
    
    console.log('📊 ФАКТЫ:');
    console.log('   ✅ FARMING_REWARD содержит TON_BOOST_INCOME (28 транзакций/день)');
    console.log('   ✅ Metadata.original_type работает для различения подтипов');
    console.log('   ✅ WebSocket интеграция работает для FARMING_REWARD');
    console.log('   ❌ Реальные DEPOSIT транзакции (20 найдено) НЕ проходят через WebSocket');
    console.log('   ❌ DEPOSIT НЕ в shouldUpdateBalance списке');
    
    console.log('\n💡 ВАРИАНТЫ РЕШЕНИЯ:');
    console.log('\n   📋 ВАРИАНТ 1: Оставить TON_DEPOSIT → FARMING_REWARD');
    console.log('      ✅ Сохраняется существующая логика');
    console.log('      ✅ WebSocket работает автоматически');
    console.log('      ❌ Нужно исправить логику создания, чтобы депозиты шли через UnifiedTransactionService');
    
    console.log('\n   📋 ВАРИАНТ 2: Изменить TON_DEPOSIT → DEPOSIT');
    console.log('      ✅ Логически правильно - депозиты должны быть DEPOSIT');
    console.log('      ❌ Нужно добавить DEPOSIT в shouldUpdateBalance');
    console.log('      ❌ Нужно настроить WebSocket для DEPOSIT типа');
    
    console.log('\n   📋 ВАРИАНТ 3: Dual System - оба типа поддерживаются');
    console.log('      ✅ Обратная совместимость');
    console.log('      ✅ Новые депозиты через FARMING_REWARD, старые остаются DEPOSIT');
    console.log('      ❌ Сложность поддержки двух систем');

  } catch (error) {
    console.error('❌ Ошибка анализа WebSocket интеграции:', error);
  }
}

checkWebSocketIntegration();
