/**
 * Исследование структуры балансов и куда должен зачисляться 1 TON
 * Проверяем реальные поля в БД и логику обновления балансов
 */

import { supabase } from './core/supabaseClient';

async function investigateBalanceStructure() {
  console.log('🔍 ИССЛЕДОВАНИЕ СТРУКТУРЫ БАЛАНСОВ И ЛОГИКИ ЗАЧИСЛЕНИЯ');
  console.log('Время:', new Date().toISOString());
  console.log('='.repeat(70));

  try {
    // 1. СМОТРИМ РЕАЛЬНУЮ СТРУКТУРУ ТАБЛИЦЫ USERS
    console.log('\n1️⃣ СТРУКТУРА ТАБЛИЦЫ USERS:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 25)
      .single();

    if (usersError) {
      console.error('❌ Ошибка получения структуры users:', usersError);
      return;
    }

    if (users) {
      console.log('✅ РЕАЛЬНЫЕ ПОЛЯ USER ID 25:');
      Object.keys(users).forEach(field => {
        console.log(`   - ${field}: ${users[field]}`);
      });
      
      // ИЩЕМ ПОЛЯ С БАЛАНСАМИ
      console.log('\n🔍 ПОЛЯ С БАЛАНСАМИ:');
      Object.keys(users).forEach(field => {
        if (field.toLowerCase().includes('balance') || 
            field.toLowerCase().includes('ton') || 
            field.toLowerCase().includes('uni')) {
          console.log(`   💰 ${field}: ${users[field]} (${typeof users[field]})`);
        }
      });
    }

    // 2. СМОТРИМ ВСЕ ТРАНЗАКЦИИ 1910979 (НАША ПРОПАВШАЯ)
    console.log('\n2️⃣ ДЕТАЛИ ТРАНЗАКЦИИ 1910979:');
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', 1910979)
      .single();

    if (txError) {
      console.error('❌ Ошибка получения транзакции:', txError);
    } else if (transaction) {
      console.log('✅ ТРАНЗАКЦИЯ 1910979 НАЙДЕНА:');
      console.log(`   - ID: ${transaction.id}`);
      console.log(`   - User ID: ${transaction.user_id}`);
      console.log(`   - Type: ${transaction.type}`);
      console.log(`   - Amount TON: ${transaction.amount_ton}`);
      console.log(`   - Amount UNI: ${transaction.amount_uni}`);
      console.log(`   - Currency: ${transaction.currency}`);
      console.log(`   - Status: ${transaction.status}`);
      console.log(`   - Description: ${transaction.description}`);
      console.log(`   - Created: ${transaction.created_at}`);
      console.log(`   - Updated: ${transaction.updated_at}`);
      
      if (transaction.metadata) {
        console.log('\n📋 METADATA:');
        console.log(JSON.stringify(transaction.metadata, null, 4));
      }
      
      // АНАЛИЗ ПРОБЛЕМЫ
      console.log('\n🔍 АНАЛИЗ ПРОБЛЕМЫ:');
      if (transaction.status === 'completed') {
        console.log('✅ Статус "completed" - транзакция должна была обновить баланс');
      }
      
      if (transaction.amount_ton === 1) {
        console.log('✅ Amount TON = 1 - сумма правильная');
      }
      
      if (transaction.currency === 'TON') {
        console.log('✅ Currency = TON - валюта правильная');
      }
    }

    // 3. СМОТРИМ БАЛАНС ДО И ПОСЛЕ ТРАНЗАКЦИИ
    console.log('\n3️⃣ ПОИСК ИЗМЕНЕНИЙ БАЛАНСА:');
    
    // Транзакции вокруг нашей
    const { data: aroundTx, error: aroundError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('id', 1910970)
      .lte('id', 1910990)
      .order('id', { ascending: true });

    if (aroundError) {
      console.error('❌ Ошибка получения соседних транзакций:', aroundError);
    } else if (aroundTx && aroundTx.length > 0) {
      console.log(`✅ Найдено ${aroundTx.length} транзакций вокруг 1910979:`);
      
      aroundTx.forEach((tx, index) => {
        const marker = tx.id === 1910979 ? ' ← НАША ТРАНЗАКЦИЯ' : '';
        console.log(`${index + 1}. ID ${tx.id}: ${tx.type} - ${tx.amount_ton} TON - ${tx.created_at}${marker}`);
      });
    }

    // 4. ПРОВЕРЯЕМ BalanceManager ЛОГИКУ
    console.log('\n4️⃣ АНАЛИЗ ЛОГИКИ ОБНОВЛЕНИЯ БАЛАНСА:');
    
    // Ищем другие успешные TON_DEPOSIT для сравнения
    const { data: otherDeposits, error: otherError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('type', 'TON_DEPOSIT')
      .eq('status', 'completed')
      .neq('id', 1910979)
      .order('created_at', { ascending: false })
      .limit(3);

    if (otherError) {
      console.error('❌ Ошибка получения других депозитов:', otherError);
    } else if (otherDeposits && otherDeposits.length > 0) {
      console.log(`✅ Найдено ${otherDeposits.length} других TON депозитов для сравнения:`);
      
      otherDeposits.forEach((deposit, index) => {
        console.log(`\n--- Депозит ${index + 1} (ID ${deposit.id}) ---`);
        console.log(`Amount: ${deposit.amount_ton} TON`);
        console.log(`Status: ${deposit.status}`);
        console.log(`Created: ${deposit.created_at}`);
        console.log(`tx_hash: ${deposit.metadata?.tx_hash ? 'ЕСТЬ' : 'НЕТ'}`);
        console.log(`BOC данные: ${deposit.metadata?.tx_hash?.startsWith('te6') ? 'ДА' : 'НЕТ'}`);
      });
    } else {
      console.log('ℹ️ Других TON депозитов не найдено для сравнения');
    }

    // 5. ФИНАЛЬНЫЙ ДИАГНОЗ
    console.log('\n' + '='.repeat(70));
    console.log('5️⃣ ФИНАЛЬНЫЙ ДИАГНОЗ - КУДА ПРОПАЛ 1 TON:');
    
    if (users) {
      console.log('\n📊 ТЕКУЩИЕ БАЛАНСЫ User ID 25:');
      // Ищем все поля с балансами
      const balanceFields = Object.keys(users).filter(field => 
        field.toLowerCase().includes('balance') || 
        field.toLowerCase().includes('ton')
      );
      
      balanceFields.forEach(field => {
        console.log(`   ${field}: ${users[field]}`);
      });
      
      console.log('\n🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
      console.log('1. BalanceManager не обработал транзакцию 1910979');
      console.log('2. Неправильное поле для обновления TON баланса');
      console.log('3. BOC данные в tx_hash блокируют логику');
      console.log('4. UnifiedTransactionService создал транзакцию, но не обновил баланс');
      console.log('5. WebSocket не отправил уведомление');
      
      console.log('\n💡 ЧТО ПРОВЕРИТЬ:');
      console.log('1. Какое поле должно содержать TON баланс');
      console.log('2. Работает ли BalanceManager для других транзакций');
      console.log('3. Логи backend сервера во время создания транзакции');
    }

  } catch (error) {
    console.error('💥 Критическая ошибка исследования:', error);
  }
}

// Запускаем исследование
investigateBalanceStructure().then(() => {
  console.log('\n✅ Исследование завершено');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Фатальная ошибка:', error);
  process.exit(1);
});