/**
 * Расследование пропавшего 1 TON пополнения для User ID 25
 * После redeploy пользователь пополнил 1 TON но деньги не зачислились
 */

import { config } from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

config();

// Используем прямое подключение к PostgreSQL
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_1RZVvcQu3Ipf@ep-twilight-night-aeprq06j.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

console.log('🔗 Database URL найден:', DATABASE_URL.substring(0, 50) + '...');

async function investigateUser25MissingTon() {
  console.log('🔍 Начинаем расследование пропавшего 1 TON для User ID 25');
  console.log('Время расследования:', new Date().toISOString());
  
  try {
    // 1. ПРОВЕРЯЕМ ТЕКУЩИЕ БАЛАНСЫ User ID 25
    console.log('\n=== 1. ТЕКУЩИЕ БАЛАНСЫ USER ID 25 ===');
    
    const userQuery = `
      SELECT id, uni_balance, ton_balance, ton_wallet_address, updated_at 
      FROM users 
      WHERE id = 25;
    `;
    
    const { stdout: userResult, stderr: userError } = await execAsync(
      `echo "${userQuery}" | psql "${DATABASE_URL}" -t`
    );

    if (userError) {
      console.error('❌ Ошибка получения пользователя:', userError);
      return;
    }

    if (user) {
      console.log('✅ User ID 25 найден:');
      console.log(`- UNI Balance: ${user.uni_balance}`);
      console.log(`- TON Balance: ${user.ton_balance}`);
      console.log(`- TON Wallet: ${user.ton_wallet_address}`);
      console.log(`- Last Updated: ${user.updated_at}`);
    } else {
      console.log('❌ User ID 25 не найден в БД');
      return;
    }

    // 2. ПРОВЕРЯЕМ ПОСЛЕДНИЕ ТРАНЗАКЦИИ (особенно TON_DEPOSIT)
    console.log('\n=== 2. ПОСЛЕДНИЕ ТРАНЗАКЦИИ USER ID 25 ===');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .order('created_at', { ascending: false })
      .limit(20);

    if (txError) {
      console.error('❌ Ошибка получения транзакций:', txError);
    } else if (transactions && transactions.length > 0) {
      console.log(`✅ Найдено ${transactions.length} транзакций:`);
      
      transactions.forEach((tx, index) => {
        console.log(`\n--- Транзакция ${index + 1} ---`);
        console.log(`ID: ${tx.id}`);
        console.log(`Type: ${tx.type}`);
        console.log(`Amount TON: ${tx.amount_ton}`);
        console.log(`Amount UNI: ${tx.amount_uni}`);
        console.log(`Currency: ${tx.currency}`);
        console.log(`Status: ${tx.status}`);
        console.log(`Description: ${tx.description}`);
        console.log(`Created: ${tx.created_at}`);
        
        if (tx.metadata) {
          console.log(`Metadata:`, JSON.stringify(tx.metadata, null, 2));
        }
      });
      
      // АНАЛИЗИРУЕМ TON_DEPOSIT транзакции
      const tonDeposits = transactions.filter(tx => tx.type === 'TON_DEPOSIT');
      console.log(`\n🔍 TON_DEPOSIT транзакций найдено: ${tonDeposits.length}`);
      
      if (tonDeposits.length > 0) {
        console.log('\n--- АНАЛИЗ TON_DEPOSIT ТРАНЗАКЦИЙ ---');
        tonDeposits.forEach((deposit, index) => {
          console.log(`\nTON Deposit ${index + 1}:`);
          console.log(`- Amount: ${deposit.amount_ton} TON`);
          console.log(`- Status: ${deposit.status}`);
          console.log(`- Created: ${deposit.created_at}`);
          console.log(`- tx_hash in metadata: ${deposit.metadata?.tx_hash || 'НЕТ'}`);
          console.log(`- original_boc: ${deposit.metadata?.original_boc ? 'ЕСТЬ' : 'НЕТ'}`);
          console.log(`- hash_extracted: ${deposit.metadata?.hash_extracted || 'НЕТ'}`);
        });
      }
    } else {
      console.log('❌ Транзакции для User ID 25 не найдены');
    }

    // 3. ПРОВЕРЯЕМ ТРАНЗАКЦИИ ЗА ПОСЛЕДНИЙ ЧАС (время после redeploy)
    console.log('\n=== 3. ТРАНЗАКЦИИ ЗА ПОСЛЕДНИЙ ЧАС ===');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentTx, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    if (recentError) {
      console.error('❌ Ошибка получения свежих транзакций:', recentError);
    } else if (recentTx && recentTx.length > 0) {
      console.log(`✅ Найдено ${recentTx.length} свежих транзакций:`);
      
      recentTx.forEach((tx, index) => {
        console.log(`\n--- Свежая транзакция ${index + 1} ---`);
        console.log(`ID: ${tx.id}`);
        console.log(`Type: ${tx.type}`);
        console.log(`Amount TON: ${tx.amount_ton}`);
        console.log(`Status: ${tx.status}`);
        console.log(`Description: ${tx.description}`);
        console.log(`Created: ${tx.created_at}`);
        
        if (tx.metadata) {
          console.log(`Metadata:`, JSON.stringify(tx.metadata, null, 2));
        }
        
        // КРИТИЧЕСКИЙ АНАЛИЗ
        if (tx.type === 'TON_DEPOSIT' && tx.amount_ton === 1) {
          console.log('🚨 НАЙДЕН ПРОПАВШИЙ 1 TON ДЕПОЗИТ!');
          console.log('🔍 Анализ проблемы:');
          
          if (tx.status !== 'completed') {
            console.log(`❌ Статус не "completed": ${tx.status}`);
          }
          
          if (!tx.metadata?.tx_hash) {
            console.log('❌ Отсутствует tx_hash в metadata');
          }
          
          if (tx.description && tx.description.includes('te6')) {
            console.log('❌ BOC данные в description вместо извлеченного hash');
          }
        }
      });
    } else {
      console.log('❌ Свежих транзакций за последний час не найдено');
    }

    // 4. ПРОВЕРЯЕМ LOGS ТАБЛИЦУ (если есть)
    console.log('\n=== 4. ПОИСК В ЛОГАХ ===');
    try {
      const { data: logs, error: logsError } = await supabase
        .from('logs')
        .select('*')
        .ilike('message', '%user%25%')
        .or('message.ilike.%ton%deposit%,message.ilike.%TON_DEPOSIT%')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      if (logsError) {
        console.log('ℹ️ Таблица logs не найдена или недоступна');
      } else if (logs && logs.length > 0) {
        console.log(`✅ Найдено ${logs.length} записей в логах:`);
        logs.forEach((log, index) => {
          console.log(`\n--- Лог ${index + 1} ---`);
          console.log(`Level: ${log.level}`);
          console.log(`Message: ${log.message}`);
          console.log(`Created: ${log.created_at}`);
        });
      } else {
        console.log('ℹ️ Логи не найдены');
      }
    } catch (error) {
      console.log('ℹ️ Таблица logs недоступна');
    }

    // 5. ФИНАЛЬНЫЙ ДИАГНОЗ
    console.log('\n=== 5. ДИАГНОЗ ПРОБЛЕМЫ ===');
    console.log('Время завершения расследования:', new Date().toISOString());
    
    // Поиск 1 TON депозита
    const onetonDeposit = transactions?.find(tx => 
      tx.type === 'TON_DEPOSIT' && 
      tx.amount_ton === 1 &&
      new Date(tx.created_at) > new Date(oneHourAgo)
    );
    
    if (onetonDeposit) {
      console.log('🎯 НАЙДЕН 1 TON ДЕПОЗИТ:');
      console.log(`- Transaction ID: ${onetonDeposit.id}`);
      console.log(`- Status: ${onetonDeposit.status}`);
      console.log(`- Amount: ${onetonDeposit.amount_ton} TON`);
      console.log(`- Description: ${onetonDeposit.description}`);
      
      console.log('\n🔧 ВОЗМОЖНЫЕ ПРИЧИНЫ ПОЧЕМУ НЕ ЗАЧИСЛИЛСЯ:');
      
      if (onetonDeposit.status !== 'completed') {
        console.log('❌ 1. Статус транзакции не "completed"');
      }
      
      if (!onetonDeposit.metadata?.tx_hash) {
        console.log('❌ 2. Отсутствует tx_hash в metadata (проблема дедупликации)');
      }
      
      if (onetonDeposit.description && onetonDeposit.description.includes('te6')) {
        console.log('❌ 3. BOC данные сохранены в description (не извлечен hash)');
      }
      
      console.log('\n💡 РЕКОМЕНДАЦИИ:');
      console.log('1. Проверить BalanceManager - обновился ли баланс пользователя');
      console.log('2. Проверить WebSocket уведомления');
      console.log('3. Возможно нужно вручную пересчитать баланс');
    } else {
      console.log('❌ 1 TON депозит НЕ НАЙДЕН в транзакциях!');
      console.log('🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Депозит полностью потерян!');
    }

  } catch (error) {
    console.error('💥 Критическая ошибка расследования:', error);
  }
}

// Запускаем расследование
investigateUser25MissingTon().then(() => {
  console.log('\n✅ Расследование завершено');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Фатальная ошибка:', error);
  process.exit(1);
});