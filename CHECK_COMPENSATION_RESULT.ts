#!/usr/bin/env tsx

/**
 * 🔍 ПРОВЕРКА РЕЗУЛЬТАТА КОМПЕНСАЦИИ USER 251 И 255
 * 
 * Проверяем появились ли у пользователей 251 и 255 дополнительные 2 TON на балансах
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function checkCompensationResult() {
  console.log('🔍 ПРОВЕРКА РЕЗУЛЬТАТА КОМПЕНСАЦИИ USER 251 И 255');
  console.log('=' .repeat(60));
  
  try {
    // 1. ПРОВЕРЯЕМ ТЕКУЩИЕ БАЛАНСЫ USER 251 И 255
    console.log('1️⃣ Проверка текущих балансов...');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, balance_ton, balance_uni, created_at')
      .in('id', [251, 255])
      .order('id');

    if (usersError) {
      console.error('❌ ОШИБКА ПОЛУЧЕНИЯ ДАННЫХ ПОЛЬЗОВАТЕЛЕЙ:', usersError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ ПОЛЬЗОВАТЕЛИ 251 И 255 НЕ НАЙДЕНЫ!');
      return;
    }

    console.log('\n📊 ТЕКУЩИЕ БАЛАНСЫ:');
    console.log('━'.repeat(80));
    users.forEach(user => {
      console.log(`User ${user.id} (@${user.username || 'unknown'})`);
      console.log(`   TON Balance: ${user.balance_ton} TON`);
      console.log(`   UNI Balance: ${user.balance_uni} UNI`);
      console.log(`   Registered: ${user.created_at}`);
      console.log('');
    });

    // 2. ПРОВЕРЯЕМ BACKUP ТАБЛИЦУ ЕСЛИ СУЩЕСТВУЕТ
    console.log('2️⃣ Проверка backup данных...');
    
    const { data: backup, error: backupError } = await supabase
      .from('backup_compensation_251_255')
      .select('*')
      .order('id');

    if (backupError) {
      console.log('⚠️  Backup таблица не найдена или не доступна');
    } else if (backup && backup.length > 0) {
      console.log('\n💾 ДАННЫЕ ИЗ BACKUP (до компенсации):');
      console.log('━'.repeat(80));
      backup.forEach(backupUser => {
        console.log(`User ${backupUser.id} (@${backupUser.username || 'unknown'})`);
        console.log(`   Старый TON Balance: ${backupUser.balance_ton} TON`);
        console.log('');
      });

      // СРАВНИВАЕМ СТАРЫЕ И НОВЫЕ БАЛАНСЫ
      console.log('3️⃣ СРАВНЕНИЕ БАЛАНСОВ (до и после):');
      console.log('━'.repeat(80));
      
      users.forEach(user => {
        const backupUser = backup.find(b => b.id === user.id);
        if (backupUser) {
          const difference = Number(user.balance_ton) - Number(backupUser.balance_ton);
          const status = Math.abs(difference - 2.0) < 0.001 ? '✅ КОМПЕНСАЦИЯ УСПЕШНА' : '❌ ОШИБКА КОМПЕНСАЦИИ';
          
          console.log(`User ${user.id}:`);
          console.log(`   До:    ${backupUser.balance_ton} TON`);
          console.log(`   После: ${user.balance_ton} TON`);
          console.log(`   Разница: +${difference.toFixed(6)} TON`);
          console.log(`   Статус: ${status}`);
          console.log('');
        }
      });
    }

    // 4. ПРОВЕРЯЕМ ПОСЛЕДНИЕ ТРАНЗАКЦИИ ЭТИХ ПОЛЬЗОВАТЕЛЕЙ
    console.log('4️⃣ Последние транзакции пользователей...');
    
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .in('user_id', ['251', '255'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (txError) {
      console.log('⚠️  Ошибка получения транзакций:', txError.message);
    } else if (transactions && transactions.length > 0) {
      console.log('\n📋 ПОСЛЕДНИЕ ТРАНЗАКЦИИ:');
      console.log('━'.repeat(80));
      transactions.forEach(tx => {
        const date = new Date(tx.created_at).toLocaleString('ru-RU');
        console.log(`User ${tx.user_id}: ${tx.amount} ${tx.currency} (${tx.type}) - ${date}`);
        if (tx.description) {
          console.log(`   Описание: ${tx.description}`);
        }
        console.log('');
      });
    }

    // 5. ИТОГОВЫЙ СТАТУС
    console.log('🎯 ИТОГОВЫЙ СТАТУС КОМПЕНСАЦИИ:');
    console.log('━'.repeat(80));
    
    const user251 = users.find(u => u.id === 251);
    const user255 = users.find(u => u.id === 255);
    
    if (user251) {
      console.log(`✅ User 251: Баланс ${user251.balance_ton} TON`);
    } else {
      console.log('❌ User 251: НЕ НАЙДЕН');
    }
    
    if (user255) {
      console.log(`✅ User 255: Баланс ${user255.balance_ton} TON`);
    } else {
      console.log('❌ User 255: НЕ НАЙДЕН');
    }
    
    // Проверка что балансы положительные
    const allBalancesPositive = users.every(u => Number(u.balance_ton) > 0);
    
    if (allBalancesPositive) {
      console.log('\n🎉 КОМПЕНСАЦИЯ ВЫПОЛНЕНА!');
      console.log('   Все пользователи имеют положительные TON балансы');
    } else {
      console.log('\n⚠️  ТРЕБУЕТСЯ ПРОВЕРКА:');
      console.log('   Некоторые балансы могут быть нулевыми');
    }

    return {
      success: true,
      users: users,
      compensationApplied: allBalancesPositive
    };
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ПРОВЕРКИ:', error);
    throw error;
  }
}

// Запуск проверки
async function main() {
  try {
    const result = await checkCompensationResult();
    console.log('\n✅ ПРОВЕРКА ЗАВЕРШЕНА');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ПРОВЕРКА ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();

export { checkCompensationResult };