/**
 * Симуляция TON депозита для тестирования полной цепочки
 */

import { supabase } from './core/supabase';
import { logger } from './core/logger';

async function simulateTonDeposit() {
  console.log('=== СИМУЛЯЦИЯ TON ДЕПОЗИТА (PREVIEW MODE) ===');
  console.log('Время:', new Date().toISOString());
  
  try {
    // 1. Проверяем пользователя
    const userId = 184; // Тестовый пользователь
    console.log('1. Проверка пользователя ID:', userId);
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      throw new Error(`Пользователь ${userId} не найден`);
    }
    
    console.log('   ✓ Пользователь найден:', {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      balance_ton: user.balance_ton,
      balance_uni: user.balance_uni
    });
    
    // 2. Генерируем тестовую транзакцию
    const testTxHash = `PREVIEW_SIMULATION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const testAmount = 0.1;
    const testWallet = `UQPreview_Test_Wallet_${userId}`;
    
    console.log('2. Тестовые данные транзакции:');
    console.log('   - Hash:', testTxHash);
    console.log('   - Amount:', testAmount);
    console.log('   - Wallet:', testWallet);
    
    // 3. Проверяем, нет ли дубликата
    console.log('3. Проверка на дубликаты...');
    const { data: existingTx } = await supabase
      .from('ton_transactions')
      .select('*')
      .eq('ton_tx_hash', testTxHash)
      .single();
    
    if (existingTx) {
      console.log('   ⚠️ Транзакция уже существует');
      return;
    }
    console.log('   ✓ Дубликатов не найдено');
    
    // 4. Создаем транзакцию
    console.log('4. Создание транзакции в БД...');
    
    const { data: newTx, error: txError } = await supabase
      .from('ton_transactions')
      .insert({
        user_id: userId,
        ton_tx_hash: testTxHash,
        wallet_address: testWallet,
        amount: testAmount,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (txError) {
      throw new Error(`Ошибка создания транзакции: ${txError.message}`);
    }
    
    console.log('   ✓ TON транзакция создана:', {
      id: newTx.id,
      hash: newTx.ton_tx_hash.substring(0, 30) + '...'
    });
    
    // 5. Создаем запись в transactions
    console.log('5. Создание записи в общих транзакциях...');
    
    const { data: transaction, error: transError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'TON_DEPOSIT',
        amount: testAmount,
        currency: 'TON',
        status: 'completed',
        description: `Test TON deposit (Preview mode): ${testAmount} TON`,
        metadata: {
          ton_tx_hash: testTxHash,
          wallet_address: testWallet,
          preview_mode: true,
          test_simulation: true
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (transError) {
      throw new Error(`Ошибка создания транзакции: ${transError.message}`);
    }
    
    console.log('   ✓ Транзакция создана:', {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount
    });
    
    // 6. Обновляем баланс
    console.log('6. Обновление баланса пользователя...');
    
    const newBalance = parseFloat(user.balance_ton || '0') + testAmount;
    
    const { error: balanceError } = await supabase
      .from('users')
      .update({
        balance_ton: newBalance
      })
      .eq('id', userId);
    
    if (balanceError) {
      throw new Error(`Ошибка обновления баланса: ${balanceError.message}`);
    }
    
    console.log('   ✓ Баланс обновлен:');
    console.log('     - Было:', user.balance_ton);
    console.log('     - Стало:', newBalance);
    
    // 7. Проверяем результат
    console.log('7. Проверка результата...');
    
    const { data: updatedUser } = await supabase
      .from('users')
      .select('balance_ton, balance_uni')
      .eq('id', userId)
      .single();
    
    console.log('   ✓ Финальные балансы:');
    console.log('     - TON:', updatedUser?.balance_ton);
    console.log('     - UNI:', updatedUser?.balance_uni);
    
    console.log('\n✅ СИМУЛЯЦИЯ УСПЕШНО ЗАВЕРШЕНА');
    console.log('Transaction ID:', transaction.id);
    console.log('TON Transaction ID:', newTx.id);
    console.log('Amount deposited:', testAmount, 'TON');
    
  } catch (error) {
    console.error('❌ ОШИБКА СИМУЛЯЦИИ:', error);
    logger.error('[SIMULATION] Failed', { error });
  }
  
  console.log('=== КОНЕЦ СИМУЛЯЦИИ ===');
  process.exit(0);
}

// Запускаем симуляцию
simulateTonDeposit();