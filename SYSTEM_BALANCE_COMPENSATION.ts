#!/usr/bin/env tsx

/**
 * 💰 СИСТЕМНОЕ ЗАЧИСЛЕНИЕ 2 TON ДЛЯ USER 251 И 255
 * 
 * Безопасное зачисление через API системы с полным логированием
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function systemBalanceCompensation() {
  console.log('💰 СИСТЕМНОЕ ЗАЧИСЛЕНИЕ КОМПЕНСАЦИИ USER 251 И 255');
  console.log('=' .repeat(70));
  
  const usersToCompensate = [
    { id: 251, username: 'Irinkatriumf', amount: 2.0 },
    { id: 255, username: 'Glazeb0', amount: 2.0 }
  ];

  try {
    // 1. ПРОВЕРЯЕМ ТЕКУЩИЕ БАЛАНСЫ
    console.log('1️⃣ Проверка текущих балансов...');
    
    const { data: currentUsers, error: currentError } = await supabase
      .from('users')
      .select('id, username, balance_ton, balance_uni')
      .in('id', [251, 255]);

    if (currentError) {
      console.error('❌ ОШИБКА ПОЛУЧЕНИЯ ТЕКУЩИХ БАЛАНСОВ:', currentError.message);
      return;
    }

    console.log('\n📊 ТЕКУЩИЕ БАЛАНСЫ:');
    currentUsers?.forEach(user => {
      console.log(`User ${user.id}: ${user.balance_ton} TON, ${user.balance_uni} UNI`);
    });

    // 2. СОЗДАЕМ BACKUP
    console.log('\n2️⃣ Создание backup...');
    
    const backupData = currentUsers?.map(user => ({
      user_id: user.id,
      old_balance_ton: user.balance_ton,
      old_balance_uni: user.balance_uni,
      backup_date: new Date().toISOString(),
      compensation_reason: 'lost_deposit_bug_fix'
    }));

    if (backupData) {
      const { error: backupError } = await supabase
        .from('compensation_backup_log')
        .insert(backupData);
      
      if (backupError) {
        console.log('⚠️  Backup не создался, но продолжаем...');
      } else {
        console.log('✅ Backup создан успешно');
      }
    }

    // 3. ВЫПОЛНЯЕМ КОМПЕНСАЦИЮ ДЛЯ КАЖДОГО ПОЛЬЗОВАТЕЛЯ
    console.log('\n3️⃣ Выполнение компенсации...');
    
    for (const userInfo of usersToCompensate) {
      console.log(`\n🔄 Обрабатываем User ${userInfo.id} (@${userInfo.username})...`);
      
      const currentUser = currentUsers?.find(u => u.id === userInfo.id);
      if (!currentUser) {
        console.log(`❌ User ${userInfo.id} не найден!`);
        continue;
      }

      const oldBalance = Number(currentUser.balance_ton) || 0;
      const newBalance = oldBalance + userInfo.amount;
      
      console.log(`   Старый баланс: ${oldBalance} TON`);
      console.log(`   Добавляем: +${userInfo.amount} TON`);
      console.log(`   Новый баланс: ${newBalance} TON`);
      
      // ОБНОВЛЯЕМ БАЛАНС
      const { error: updateError } = await supabase
        .from('users')
        .update({
          balance_ton: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', userInfo.id);

      if (updateError) {
        console.error(`❌ ОШИБКА ОБНОВЛЕНИЯ User ${userInfo.id}:`, updateError.message);
        continue;
      }

      console.log(`✅ User ${userInfo.id} - баланс успешно обновлен!`);
      
      // СОЗДАЕМ ЗАПИСЬ О КОМПЕНСАЦИИ
      const { error: logError } = await supabase
        .from('admin_compensation_log')
        .insert({
          user_id: userInfo.id.toString(),
          compensation_amount: userInfo.amount,
          currency: 'TON',
          reason: 'Lost deposit due to system bug - manual compensation',
          old_balance: oldBalance,
          new_balance: newBalance,
          executed_by: 'system_admin',
          executed_at: new Date().toISOString(),
          metadata: {
            compensation_method: 'direct_balance_update',
            bug_reference: 'lost_deposits_users_251_255',
            execution_date: '2025-07-27'
          }
        });

      if (logError) {
        console.log(`⚠️  Лог для User ${userInfo.id} не создался, но компенсация выполнена`);
      }
    }

    // 4. ПРОВЕРЯЕМ РЕЗУЛЬТАТ
    console.log('\n4️⃣ Проверка результата...');
    
    const { data: updatedUsers, error: checkError } = await supabase
      .from('users')
      .select('id, username, balance_ton, balance_uni')
      .in('id', [251, 255]);

    if (checkError) {
      console.error('❌ ОШИБКА ПРОВЕРКИ РЕЗУЛЬТАТА:', checkError.message);
      return;
    }

    console.log('\n🎯 ИТОГОВЫЕ БАЛАНСЫ:');
    console.log('━'.repeat(50));
    
    let allSuccess = true;
    updatedUsers?.forEach(user => {
      const originalUser = currentUsers?.find(u => u.id === user.id);
      const difference = Number(user.balance_ton) - Number(originalUser?.balance_ton || 0);
      const success = Math.abs(difference - 2.0) < 0.01;
      
      console.log(`User ${user.id} (@${user.username}):`);
      console.log(`   Новый баланс: ${user.balance_ton} TON`);
      console.log(`   Изменение: +${difference.toFixed(6)} TON`);
      console.log(`   Статус: ${success ? '✅ УСПЕШНО' : '❌ ОШИБКА'}`);
      console.log('');
      
      if (!success) allSuccess = false;
    });

    if (allSuccess) {
      console.log('🎉 КОМПЕНСАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
      console.log('   Оба пользователя получили по 2 TON');
    } else {
      console.log('⚠️  ТРЕБУЕТСЯ ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА');
    }

    return {
      success: allSuccess,
      compensatedUsers: updatedUsers?.length || 0,
      details: updatedUsers
    };
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА СИСТЕМНОЙ КОМПЕНСАЦИИ:', error);
    throw error;
  }
}

// Запуск системной компенсации
async function main() {
  try {
    console.log('🚀 ЗАПУСК СИСТЕМНОЙ КОМПЕНСАЦИИ...\n');
    
    const result = await systemBalanceCompensation();
    
    console.log('\n✅ СИСТЕМНАЯ КОМПЕНСАЦИЯ ЗАВЕРШЕНА');
    console.log(`Пользователей обработано: ${result?.compensatedUsers}`);
    console.log(`Статус: ${result?.success ? 'УСПЕШНО' : 'ТРЕБУЕТСЯ ПРОВЕРКА'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ СИСТЕМНАЯ КОМПЕНСАЦИЯ ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();

export { systemBalanceCompensation };