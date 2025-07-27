#!/usr/bin/env tsx

/**
 * 💰 КОМПЕНСАЦИЯ ЧЕРЕЗ ТРАНЗАКЦИИ - ПРАВИЛЬНЫЙ ПОДХОД
 * 
 * Создаем компенсационные транзакции, система сама пересчитает балансы
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function transactionBasedCompensation() {
  console.log('💰 КОМПЕНСАЦИЯ ЧЕРЕЗ СОЗДАНИЕ ТРАНЗАКЦИЙ');
  console.log('=' .repeat(55));
  
  const compensationData = [
    { userId: '251', username: 'Irinkatriumf', amount: 2.0 },
    { userId: '255', username: 'Glazeb0', amount: 2.0 }
  ];
  
  try {
    // 1. ПРОВЕРЯЕМ ТЕКУЩИЕ БАЛАНСЫ
    console.log('1️⃣ Текущие балансы до компенсации...');
    
    const { data: beforeUsers, error: beforeError } = await supabase
      .from('users')
      .select('id, username, balance_ton')
      .in('id', [251, 255])
      .order('id');

    if (beforeError) {
      console.error('❌ ОШИБКА ПОЛУЧЕНИЯ БАЛАНСОВ:', beforeError.message);
      return;
    }

    console.log('\n📊 БАЛАНСЫ ДО:');
    beforeUsers?.forEach(user => {
      console.log(`User ${user.id}: ${user.balance_ton} TON`);
    });

    // 2. СОЗДАЕМ КОМПЕНСАЦИОННЫЕ ТРАНЗАКЦИИ
    console.log('\n2️⃣ Создание компенсационных транзакций...');
    
    const compensationTransactions = compensationData.map(comp => ({
      user_id: comp.userId,
      type: 'ADMIN_COMPENSATION',
      amount: comp.amount,
      currency: 'TON',
      status: 'completed',
      description: `Admin compensation for lost deposit - ${comp.amount} TON restored (System auto-calculation)`,
      created_at: new Date().toISOString(),
      metadata: {
        admin_action: true,
        compensation_reason: 'lost_deposit_bug_compensation',
        compensation_amount: comp.amount,
        target_user: comp.username,
        compensation_date: '2025-07-27',
        method: 'transaction_based_auto_calculation'
      }
    }));

    // Создаем все транзакции одновременно
    const { data: createdTransactions, error: createError } = await supabase
      .from('transactions')
      .insert(compensationTransactions)
      .select();

    if (createError) {
      console.error('❌ ОШИБКА СОЗДАНИЯ ТРАНЗАКЦИЙ:', createError.message);
      return;
    }

    console.log('✅ Компенсационные транзакции созданы:');
    createdTransactions?.forEach(tx => {
      console.log(`   Transaction ${tx.id}: User ${tx.user_id} - ${tx.amount} ${tx.currency}`);
    });

    // 3. ЖДЕМ АВТОМАТИЧЕСКОГО ПЕРЕСЧЕТА
    console.log('\n3️⃣ Ожидание автоматического пересчета балансов...');
    console.log('   (Система должна сама пересчитать балансы на основе транзакций)');
    
    await new Promise(resolve => setTimeout(resolve, 3000)); // Ждем 3 секунды

    // 4. ПРОВЕРЯЕМ РЕЗУЛЬТАТ
    console.log('\n4️⃣ Проверка результата...');
    
    const { data: afterUsers, error: afterError } = await supabase
      .from('users')
      .select('id, username, balance_ton')
      .in('id', [251, 255])
      .order('id');

    if (afterError) {
      console.error('❌ ОШИБКА ПРОВЕРКИ РЕЗУЛЬТАТА:', afterError.message);
      return;
    }

    console.log('\n🎯 СРАВНЕНИЕ РЕЗУЛЬТАТОВ:');
    console.log('━'.repeat(60));
    
    let successCount = 0;
    afterUsers?.forEach(afterUser => {
      const beforeUser = beforeUsers?.find(u => u.id === afterUser.id);
      const beforeBalance = Number(beforeUser?.balance_ton || 0);
      const afterBalance = Number(afterUser.balance_ton || 0);
      const difference = afterBalance - beforeBalance;
      const expected = 2.0;
      const success = Math.abs(difference - expected) < 0.01;
      
      console.log(`User ${afterUser.id} (@${afterUser.username}):`);
      console.log(`   До: ${beforeBalance} TON`);
      console.log(`   После: ${afterBalance} TON`);
      console.log(`   Изменение: +${difference.toFixed(6)} TON`);
      console.log(`   Ожидали: +${expected} TON`);
      console.log(`   ${success ? '✅ УСПЕШНО' : '❌ НЕ СРАБОТАЛО'}`);
      console.log('');
      
      if (success) successCount++;
    });

    // 5. ЕСЛИ НЕ СРАБОТАЛО - ПРИНУДИТЕЛЬНЫЙ ПЕРЕСЧЕТ
    if (successCount < 2) {
      console.log('5️⃣ Автоматический пересчет не сработал, выполняем принудительный...');
      
      for (const userId of [251, 255]) {
        console.log(`\n🔄 Принудительный пересчет для User ${userId}...`);
        
        // Вычисляем сумму всех транзакций пользователя
        const { data: userTransactions, error: txError } = await supabase
          .from('transactions')
          .select('amount, currency, status')
          .eq('user_id', userId.toString())
          .eq('currency', 'TON')
          .eq('status', 'completed');

        if (txError) {
          console.error(`❌ Ошибка получения транзакций User ${userId}:`, txError.message);
          continue;
        }

        const totalTonBalance = userTransactions?.reduce((sum, tx) => {
          return sum + (Number(tx.amount) || 0);
        }, 0) || 0;

        console.log(`   Рассчитанный баланс из транзакций: ${totalTonBalance} TON`);
        
        // Обновляем баланс
        const { error: updateError } = await supabase
          .from('users')
          .update({ balance_ton: totalTonBalance })
          .eq('id', userId);

        if (updateError) {
          console.error(`❌ Ошибка обновления баланса User ${userId}:`, updateError.message);
        } else {
          console.log(`   ✅ Баланс User ${userId} обновлен до ${totalTonBalance} TON`);
        }
      }
      
      // Еще одна проверка
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: finalUsers, error: finalError } = await supabase
        .from('users')
        .select('id, username, balance_ton')
        .in('id', [251, 255])
        .order('id');

      if (!finalError && finalUsers) {
        console.log('\n🎯 ФИНАЛЬНЫЙ РЕЗУЛЬТАТ:');
        console.log('━'.repeat(50));
        
        let finalSuccessCount = 0;
        finalUsers.forEach(user => {
          const beforeUser = beforeUsers?.find(u => u.id === user.id);
          const change = Number(user.balance_ton) - Number(beforeUser?.balance_ton || 0);
          const success = change >= 1.5; // Хотя бы близко к 2 TON
          
          console.log(`User ${user.id}: ${user.balance_ton} TON (+${change.toFixed(6)})`);
          console.log(`   ${success ? '✅ КОМПЕНСАЦИЯ ПОЛУЧЕНА' : '❌ КОМПЕНСАЦИЯ НЕ ПОЛУЧЕНА'}`);
          
          if (success) finalSuccessCount++;
        });
        
        if (finalSuccessCount === 2) {
          console.log('\n🎉 ТРАНЗАКЦИОННАЯ КОМПЕНСАЦИЯ УСПЕШНА!');
        } else {
          console.log(`\n⚠️  Только ${finalSuccessCount}/2 пользователей получили компенсацию`);
        }
        
        return {
          success: finalSuccessCount === 2,
          compensated: finalSuccessCount,
          method: 'transaction_based_with_manual_recalculation'
        };
      }
    } else {
      console.log('\n🎉 АВТОМАТИЧЕСКАЯ ТРАНЗАКЦИОННАЯ КОМПЕНСАЦИЯ УСПЕШНА!');
      return {
        success: true,
        compensated: successCount,
        method: 'transaction_based_automatic'
      };
    }

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ТРАНЗАКЦИОННОЙ КОМПЕНСАЦИИ:', error);
    throw error;
  }
}

async function main() {
  try {
    const result = await transactionBasedCompensation();
    
    console.log('\n✅ ОПЕРАЦИЯ ЗАВЕРШЕНА');
    console.log(`Метод: ${result?.method}`);
    console.log(`Успешно: ${result?.compensated}/2 пользователей`);
    console.log(`Статус: ${result?.success ? 'ПОЛНОСТЬЮ УСПЕШНО' : 'ТРЕБУЕТ ДОРАБОТКИ'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ОПЕРАЦИЯ ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();