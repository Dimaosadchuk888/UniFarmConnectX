/**
 * СРОЧНАЯ проверка User ID 25 - пропавший 1 TON депозит
 * Используем существующий supabase клиент для быстрого доступа к данным
 */

import { supabase } from './core/supabaseClient';

async function checkUser25TonDeposit() {
  console.log('🚨 ЭКСТРЕННАЯ ПРОВЕРКА USER ID 25 - ПРОПАВШИЙ 1 TON');
  console.log('Время проверки:', new Date().toISOString());
  console.log('='.repeat(60));

  try {
    // 1. ТЕКУЩИЕ БАЛАНСЫ
    console.log('\n1️⃣ ТЕКУЩИЕ БАЛАНСЫ USER ID 25:');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 25)
      .single();

    if (userError) {
      console.error('❌ Ошибка получения User ID 25:', userError);
      return;
    }

    if (user) {
      console.log('✅ User ID 25 найден:');
      console.log(`   - UNI Balance: ${user.uni_balance || user.balance_uni || 'не указан'}`);
      console.log(`   - TON Balance: ${user.ton_balance || user.balance_ton || 'не указан'}`);
      console.log(`   - TON Wallet: ${user.ton_wallet_address || 'не привязан'}`);
      console.log(`   - Last Updated: ${user.updated_at}`);
    }

    // 2. ПОИСК ТРАНЗАКЦИЙ ЗА ПОСЛЕДНИЙ ЧАС (ПОСЛЕ REDEPLOY)
    console.log('\n2️⃣ ТРАНЗАКЦИИ ЗА ПОСЛЕДНИЙ ЧАС:');
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
        
        // КРИТИЧЕСКИЙ АНАЛИЗ 1 TON ДЕПОЗИТА
        if (tx.type === 'TON_DEPOSIT' && tx.amount_ton === 1) {
          console.log('\n🎯 НАЙДЕН ПРОПАВШИЙ 1 TON ДЕПОЗИТ!');
          console.log('🔍 ДИАГНОСТИКА ПРОБЛЕМЫ:');
          
          const issues = [];
          
          if (tx.status !== 'completed') {
            issues.push(`❌ Статус не "completed": ${tx.status}`);
          }
          
          if (!tx.metadata?.tx_hash) {
            issues.push('❌ Отсутствует tx_hash в metadata');
          }
          
          if (tx.description && tx.description.includes('te6')) {
            issues.push('❌ BOC данные в description (hash не извлечен)');
          }
          
          if (tx.currency !== 'TON') {
            issues.push(`❌ Неправильная валюта: ${tx.currency}`);
          }
          
          if (issues.length > 0) {
            console.log('\n🚨 НАЙДЕННЫЕ ПРОБЛЕМЫ:');
            issues.forEach(issue => console.log(`   ${issue}`));
          } else {
            console.log('✅ Транзакция выглядит корректно');
          }
          
          console.log('\n💡 ВОЗМОЖНЫЕ ПРИЧИНЫ НЕ ЗАЧИСЛЕНИЯ:');
          console.log('   1. BalanceManager не обновил user.ton_balance');
          console.log('   2. WebSocket уведомление не отправилось');
          console.log('   3. Frontend cache не обновился');
          console.log('   4. Проблема в UnifiedTransactionService');
        }
      });
    } else {
      console.log('❌ Свежих транзакций не найдено - КРИТИЧЕСКАЯ ПРОБЛЕМА!');
      console.log('🚨 Депозит полностью потерян в системе!');
    }

    // 3. ВСЕ TON_DEPOSIT ТРАНЗАКЦИИ User ID 25
    console.log('\n3️⃣ ВСЕ TON ДЕПОЗИТЫ USER ID 25:');
    const { data: tonDeposits, error: tonError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('type', 'TON_DEPOSIT')
      .order('created_at', { ascending: false })
      .limit(10);

    if (tonError) {
      console.error('❌ Ошибка получения TON депозитов:', tonError);
    } else if (tonDeposits && tonDeposits.length > 0) {
      console.log(`✅ Найдено ${tonDeposits.length} TON депозитов:`);
      
      tonDeposits.forEach((deposit, index) => {
        console.log(`\n--- TON Deposit ${index + 1} ---`);
        console.log(`ID: ${deposit.id}`);
        console.log(`Amount: ${deposit.amount_ton} TON`);
        console.log(`Status: ${deposit.status}`);
        console.log(`Created: ${deposit.created_at}`);
        console.log(`tx_hash: ${deposit.metadata?.tx_hash || 'НЕТ'}`);
        console.log(`original_boc: ${deposit.metadata?.original_boc ? 'ЕСТЬ' : 'НЕТ'}`);
        console.log(`hash_extracted: ${deposit.metadata?.hash_extracted || 'НЕТ'}`);
      });
    } else {
      console.log('❌ TON депозиты не найдены');
    }

    // 4. ПРОВЕРЯЕМ ДРУГИЕ ТИПЫ ТРАНЗАКЦИЙ
    console.log('\n4️⃣ ДРУГИЕ ТИПЫ ТРАНЗАКЦИЙ USER ID 25 (последние 5):');
    const { data: otherTx, error: otherError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .neq('type', 'TON_DEPOSIT')
      .order('created_at', { ascending: false })
      .limit(5);

    if (otherError) {
      console.error('❌ Ошибка получения других транзакций:', otherError);
    } else if (otherTx && otherTx.length > 0) {
      console.log(`✅ Найдено ${otherTx.length} других транзакций:`);
      
      otherTx.forEach((tx, index) => {
        console.log(`${index + 1}. ${tx.type} - ${tx.amount_ton || tx.amount_uni} ${tx.currency} - ${tx.created_at}`);
      });
    }

    // 5. ФИНАЛЬНЫЙ ДИАГНОЗ
    console.log('\n' + '='.repeat(60));
    console.log('5️⃣ ФИНАЛЬНЫЙ ДИАГНОЗ:');
    
    const recentTonDeposit = recentTx?.find(tx => 
      tx.type === 'TON_DEPOSIT' && 
      tx.amount_ton === 1
    );
    
    if (recentTonDeposit) {
      console.log('🎯 1 TON ДЕПОЗИТ НАЙДЕН В БД');
      console.log(`   - Transaction ID: ${recentTonDeposit.id}`);
      console.log(`   - Status: ${recentTonDeposit.status}`);
      console.log(`   - Created: ${recentTonDeposit.created_at}`);
      
      console.log('\n🔧 ПЛАН ДЕЙСТВИЙ:');
      if (recentTonDeposit.status === 'completed') {
        console.log('   1. ✅ Транзакция имеет статус "completed"');
        console.log('   2. 🔍 Проблема в BalanceManager или WebSocket');
        console.log('   3. 💡 Нужно проверить обновление user.ton_balance');
        console.log('   4. 🔄 Возможно нужен manual refresh баланса');
      } else {
        console.log('   1. ❌ Статус транзакции не "completed"');
        console.log('   2. 🔧 Нужно исправить статус на "completed"');
        console.log('   3. ⚡ Запустить обновление баланса');
      }
    } else {
      console.log('❌ 1 TON ДЕПОЗИТ НЕ НАЙДЕН В БД!');
      console.log('🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА - ДЕПОЗИТ ПОЛНОСТЬЮ ПОТЕРЯН!');
      console.log('\n📞 НУЖНО:');
      console.log('   1. Проверить логи backend сервера');
      console.log('   2. Проверить TON Connect webhook');
      console.log('   3. Возможно создать транзакцию вручную');
    }

  } catch (error) {
    console.error('💥 Критическая ошибка проверки:', error);
  }
}

// Запускаем проверку
checkUser25TonDeposit().then(() => {
  console.log('\n✅ Проверка завершена');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Фатальная ошибка:', error);
  process.exit(1);
});