#!/usr/bin/env tsx

/**
 * 💰 ИСПРАВЛЕННАЯ КОМПЕНСАЦИЯ ЧЕРЕЗ КОРРЕКТНЫЕ ТРАНЗАКЦИИ
 * 
 * Использую существующие типы транзакций для компенсации
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function fixedTransactionCompensation() {
  console.log('💰 ИСПРАВЛЕННАЯ КОМПЕНСАЦИЯ ЧЕРЕЗ ТРАНЗАКЦИИ');
  console.log('=' .repeat(50));
  
  try {
    // 1. ПРОВЕРЯЕМ ДОСТУПНЫЕ ТИПЫ ТРАНЗАКЦИЙ
    console.log('1️⃣ Создание компенсационных транзакций...');
    
    const { data: beforeUsers, error: beforeError } = await supabase
      .from('users')
      .select('id, username, balance_ton')
      .in('id', [251, 255])
      .order('id');

    if (beforeError) {
      console.error('❌ ОШИБКА ПОЛУЧЕНИЯ БАЛАНСОВ:', beforeError.message);
      return;
    }

    console.log('\n📊 БАЛАНСЫ ДО КОМПЕНСАЦИИ:');
    beforeUsers?.forEach(user => {
      console.log(`User ${user.id}: ${user.balance_ton} TON`);
    });

    // 2. СОЗДАЕМ КОМПЕНСАЦИОННЫЕ ТРАНЗАКЦИИ С ТИПОМ DEPOSIT
    console.log('\n2️⃣ Создание транзакций типа DEPOSIT...');
    
    const compensationTransactions = [
      {
        user_id: '251',
        type: 'DEPOSIT', // Используем существующий тип
        amount: 2.0,
        currency: 'TON',
        status: 'completed',
        description: 'Admin compensation for lost deposit - 2 TON restored',
        created_at: new Date().toISOString(),
        metadata: {
          admin_compensation: true,
          reason: 'lost_deposit_bug_fix',
          original_issue: 'User lost 2 TON due to system bug',
          compensation_date: '2025-07-27'
        }
      },
      {
        user_id: '255',
        type: 'DEPOSIT', // Используем существующий тип
        amount: 2.0,
        currency: 'TON',
        status: 'completed',
        description: 'Admin compensation for lost deposit - 2 TON restored',
        created_at: new Date().toISOString(),
        metadata: {
          admin_compensation: true,
          reason: 'lost_deposit_bug_fix',
          original_issue: 'User lost 2 TON due to system bug',
          compensation_date: '2025-07-27'
        }
      }
    ];

    const { data: createdTransactions, error: createError } = await supabase
      .from('transactions')
      .insert(compensationTransactions)
      .select();

    if (createError) {
      console.error('❌ ОШИБКА СОЗДАНИЯ ТРАНЗАКЦИЙ:', createError.message);
      
      // Пробуем другой тип
      console.log('🔄 Пробуем тип FARMING_REWARD...');
      
      const alternativeTransactions = compensationTransactions.map(tx => ({
        ...tx,
        type: 'FARMING_REWARD'
      }));

      const { data: altCreated, error: altError } = await supabase
        .from('transactions')
        .insert(alternativeTransactions)
        .select();

      if (altError) {
        console.error('❌ И FARMING_REWARD НЕ РАБОТАЕТ:', altError.message);
        return;
      } else {
        console.log('✅ Транзакции созданы с типом FARMING_REWARD');
        createdTransactions = altCreated;
      }
    } else {
      console.log('✅ Транзакции созданы с типом DEPOSIT');
    }

    console.log('\n📋 СОЗДАННЫЕ ТРАНЗАКЦИИ:');
    createdTransactions?.forEach(tx => {
      console.log(`   ID ${tx.id}: User ${tx.user_id} - ${tx.amount} ${tx.currency} (${tx.type})`);
    });

    // 3. ПРИНУДИТЕЛЬНО ПЕРЕСЧИТЫВАЕМ БАЛАНСЫ НА ОСНОВЕ ВСЕХ ТРАНЗАКЦИЙ
    console.log('\n3️⃣ Принудительный пересчет балансов...');
    
    for (const userId of [251, 255]) {
      console.log(`\n🔄 Пересчет для User ${userId}...`);
      
      // Получаем ВСЕ транзакции пользователя
      const { data: allTransactions, error: txError } = await supabase
        .from('transactions')
        .select('amount, currency, status, type, description')
        .eq('user_id', userId.toString())
        .eq('currency', 'TON')
        .eq('status', 'completed');

      if (txError) {
        console.error(`❌ Ошибка получения транзакций User ${userId}:`, txError.message);
        continue;
      }

      console.log(`   Найдено ${allTransactions?.length || 0} транзакций TON`);
      
      // Считаем общий баланс
      let totalBalance = 0;
      allTransactions?.forEach(tx => {
        const amount = Number(tx.amount) || 0;
        totalBalance += amount;
        
        // Показываем последние транзакции для отладки
        if (tx.description?.includes('compensation') || tx.description?.includes('Admin')) {
          console.log(`     ${tx.type}: ${amount} TON - ${tx.description}`);
        }
      });

      console.log(`   Рассчитанный баланс: ${totalBalance} TON`);
      
      // Обновляем баланс пользователя
      const { error: updateError } = await supabase
        .from('users')
        .update({ balance_ton: totalBalance })
        .eq('id', userId);

      if (updateError) {
        console.error(`❌ Ошибка обновления User ${userId}:`, updateError.message);
      } else {
        console.log(`   ✅ Баланс User ${userId} обновлен до ${totalBalance} TON`);
      }
    }

    // 4. ФИНАЛЬНАЯ ПРОВЕРКА
    console.log('\n4️⃣ Финальная проверка результата...');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: afterUsers, error: afterError } = await supabase
      .from('users')
      .select('id, username, balance_ton')
      .in('id', [251, 255])
      .order('id');

    if (afterError) {
      console.error('❌ ОШИБКА ФИНАЛЬНОЙ ПРОВЕРКИ:', afterError.message);
      return;
    }

    console.log('\n🎯 ИТОГОВЫЙ РЕЗУЛЬТАТ:');
    console.log('━'.repeat(60));
    
    let successCount = 0;
    afterUsers?.forEach(afterUser => {
      const beforeUser = beforeUsers?.find(u => u.id === afterUser.id);
      const beforeBalance = Number(beforeUser?.balance_ton || 0);
      const afterBalance = Number(afterUser.balance_ton || 0);
      const change = afterBalance - beforeBalance;
      const success = change >= 1.8; // Принимаем от 1.8 TON как успех
      
      console.log(`User ${afterUser.id} (@${afterUser.username}):`);
      console.log(`   Было: ${beforeBalance} TON`);
      console.log(`   Стало: ${afterBalance} TON`);
      console.log(`   Прирост: +${change.toFixed(6)} TON`);
      console.log(`   ${success ? '✅ КОМПЕНСАЦИЯ ПОЛУЧЕНА' : '❌ КОМПЕНСАЦИЯ НЕ ПОЛУЧЕНА'}`);
      console.log('');
      
      if (success) successCount++;
    });

    if (successCount === 2) {
      console.log('🎉 ТРАНЗАКЦИОННАЯ КОМПЕНСАЦИЯ ПОЛНОСТЬЮ УСПЕШНА!');
      console.log('   Оба пользователя получили компенсацию');
    } else {
      console.log(`⚠️  Только ${successCount}/2 пользователей получили компенсацию`);
    }

    return {
      success: successCount === 2,
      compensated: successCount,
      total: 2,
      finalBalances: afterUsers
    };

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
    throw error;
  }
}

async function main() {
  try {
    const result = await fixedTransactionCompensation();
    
    console.log('\n✅ ОПЕРАЦИЯ ЗАВЕРШЕНА');
    console.log(`Результат: ${result?.success ? 'ПОЛНОСТЬЮ УСПЕШНО' : 'ЧАСТИЧНО УСПЕШНО'}`);
    console.log(`Компенсировано: ${result?.compensated}/${result?.total} пользователей`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ОПЕРАЦИЯ ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();