/**
 * ВОССТАНОВЛЕНИЕ TON ДЕПОЗИТА USER #25
 * Обработка реального депозита 0.1 TON после исправления BalanceManager
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function restoreUser25Deposit() {
  console.log('🔄 ВОССТАНОВЛЕНИЕ TON ДЕПОЗИТА USER #25');
  console.log('======================================');
  
  try {
    const USER_ID = 25;
    const DEPOSIT_AMOUNT = 0.1;
    const TX_HASH = '00a1ba3c2614f4d65cc346805feea960';
    
    console.log(`✅ Восстанавливаем депозит:`);
    console.log(`   - User ID: ${USER_ID}`);
    console.log(`   - Сумма: ${DEPOSIT_AMOUNT} TON`);
    console.log(`   - TX Hash: ${TX_HASH}`);
    
    // 1. Проверяем текущий баланс User #25
    const { data: userBefore, error: userError } = await supabase
      .from('users')
      .select('balance_ton, username')
      .eq('id', USER_ID)
      .single();
    
    if (userError) {
      console.log('❌ Ошибка получения пользователя:', userError.message);
      return;
    }
    
    console.log(`📊 Баланс ДО восстановления: ${userBefore.balance_ton} TON`);
    
    // 2. Проверяем, не была ли уже создана транзакция
    const { data: existingTx, error: txCheckError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', USER_ID)
      .ilike('description', `%${TX_HASH}%`)
      .eq('currency', 'TON')
      .eq('type', 'DEPOSIT');
    
    if (txCheckError) {
      console.log('❌ Ошибка проверки существующих транзакций:', txCheckError.message);
      return;
    }
    
    if (existingTx && existingTx.length > 0) {
      console.log('⚠️  Транзакция уже существует:');
      existingTx.forEach(tx => {
        console.log(`   - ID: ${tx.id}, Amount: ${tx.amount} TON, Status: ${tx.status}`);
      });
      console.log('Восстановление не требуется.');
      return;
    }
    
    // 3. Обновляем баланс пользователя
    const newBalance = parseFloat(userBefore.balance_ton) + DEPOSIT_AMOUNT;
    
    const { error: balanceUpdateError } = await supabase
      .from('users')
      .update({ 
        balance_ton: newBalance
      })
      .eq('id', USER_ID);
    
    if (balanceUpdateError) {
      console.log('❌ Ошибка обновления баланса:', balanceUpdateError.message);
      return;
    }
    
    console.log(`✅ Баланс обновлен: ${userBefore.balance_ton} → ${newBalance} TON`);
    
    // 4. Создаем транзакцию
    const { data: transaction, error: txCreateError } = await supabase
      .from('transactions')
      .insert({
        user_id: USER_ID,
        amount: DEPOSIT_AMOUNT.toString(),
        type: 'DEPOSIT',
        currency: 'TON',
        status: 'completed',
        description: `TON deposit from blockchain: ${TX_HASH}`,
        metadata: {
          source: 'ton_deposit_restoration',
          wallet_address: 'unknown',
          tx_hash: TX_HASH,
          restored_at: new Date().toISOString(),
          original_issue: 'BalanceManager import missing'
        }
      })
      .select()
      .single();
    
    if (txCreateError) {
      console.log('❌ Ошибка создания транзакции:', txCreateError.message);
      
      // Откатываем баланс
      await supabase
        .from('users')
        .update({ balance_ton: userBefore.balance_ton })
        .eq('id', USER_ID);
      
      return;
    }
    
    console.log(`✅ Транзакция создана: ID ${transaction.id}`);
    
    // 5. Проверяем итоговый результат
    const { data: userAfter, error: finalCheckError } = await supabase
      .from('users')
      .select('balance_ton')
      .eq('id', USER_ID)
      .single();
    
    if (finalCheckError) {
      console.log('❌ Ошибка финальной проверки:', finalCheckError.message);
    } else {
      console.log(`📊 Баланс ПОСЛЕ восстановления: ${userAfter.balance_ton} TON`);
    }
    
    // 6. Итоговый отчет
    console.log('\n📋 ОТЧЕТ О ВОССТАНОВЛЕНИИ:');
    console.log('===========================');
    console.log(`✅ User #25 (${userBefore.username}): депозит 0.1 TON восстановлен`);
    console.log(`✅ Баланс увеличен: ${userBefore.balance_ton} → ${newBalance} TON`);
    console.log(`✅ Транзакция создана: ID ${transaction.id}`);
    console.log(`✅ Блокчейн TX Hash: ${TX_HASH}`);
    console.log('\nПроблема с BalanceManager import исправлена, TON депозиты теперь работают!');
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ВОССТАНОВЛЕНИЯ:', error.message);
  }
}

restoreUser25Deposit();