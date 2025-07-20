/**
 * СОЗДАНИЕ ТЕСТОВОГО TON ДЕПОЗИТА ДЛЯ USER #25
 * Имитируем frontend вызов с правильным JWT токеном
 */

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function createUser25TonDepositTest() {
  console.log('🧪 ТЕСТ TON ДЕПОЗИТА ДЛЯ USER #25');
  console.log('==================================');
  
  try {
    // 1. Получаем данные User #25
    const { data: user25, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 25)
      .single();
    
    if (userError || !user25) {
      console.log('❌ User #25 не найден:', userError?.message);
      return;
    }
    
    console.log('✅ User #25 найден:');
    console.log(`   - ID: ${user25.id}`);
    console.log(`   - Telegram ID: ${user25.telegram_id}`);
    console.log(`   - Username: ${user25.username}`);
    console.log(`   - Current TON Balance: ${user25.balance_ton}`);
    
    // 2. Создаем JWT токен для User #25
    const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
    
    const jwtPayload = {
      userId: user25.id,
      telegram_id: user25.telegram_id,
      username: user25.username,
      ref_code: user25.ref_code
    };
    
    const jwtToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '7d' });
    console.log(`✅ JWT токен создан для User #25 (длина: ${jwtToken.length})`);
    
    // 3. Тестируем вызов TON deposit endpoint
    console.log('\n🚀 ТЕСТОВЫЙ ВЫЗОВ /api/v2/wallet/ton-deposit:');
    
    const testDepositData = {
      ton_tx_hash: 'test_hash_user25_' + Date.now(),
      amount: 0.1,
      wallet_address: 'EQTest_User25_Address_12345'
    };
    
    console.log('Данные для теста:', testDepositData);
    
    try {
      const response = await fetch('http://localhost:3000/api/v2/wallet/ton-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(testDepositData)
      });
      
      console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
      
      const responseText = await response.text();
      console.log('📄 Response Body:');
      console.log(responseText);
      
      // 4. Проверяем создание транзакции
      console.log('\n💾 ПРОВЕРКА СОЗДАНИЯ ТРАНЗАКЦИИ:');
      
      const { data: newTxs, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', 25)
        .ilike('description', `%${testDepositData.ton_tx_hash}%`)
        .order('created_at', { ascending: false });
      
      if (txError) {
        console.log('❌ Ошибка поиска транзакции:', txError.message);
      } else {
        console.log(`📊 Найдено транзакций: ${newTxs?.length || 0}`);
        newTxs?.forEach(tx => {
          console.log(`   - ID: ${tx.id}, Amount: ${tx.amount} ${tx.currency}, Status: ${tx.status}`);
        });
      }
      
      // 5. Проверяем обновление баланса
      console.log('\n💳 ПРОВЕРКА ОБНОВЛЕНИЯ БАЛАНСА:');
      
      const { data: updatedUser, error: balanceError } = await supabase
        .from('users')
        .select('balance_ton')
        .eq('id', 25)
        .single();
      
      if (balanceError) {
        console.log('❌ Ошибка получения баланса:', balanceError.message);
      } else {
        console.log(`   - TON баланс до: ${user25.balance_ton}`);
        console.log(`   - TON баланс после: ${updatedUser.balance_ton}`);
        console.log(`   - Изменение: +${updatedUser.balance_ton - user25.balance_ton} TON`);
      }
      
    } catch (fetchError) {
      console.log('❌ Ошибка вызова API:', fetchError.message);
    }
    
    // 6. ИТОГОВЫЙ ОТЧЕТ
    console.log('\n📋 ИТОГОВЫЙ ОТЧЕТ ТЕСТА:');
    console.log('=========================');
    console.log('Этот тест показывает:');
    console.log('1. Доступность User #25 в БД');  
    console.log('2. Возможность создания валидного JWT токена');
    console.log('3. Результат вызова POST /api/v2/wallet/ton-deposit');
    console.log('4. Создание транзакции в БД (если backend работает)');
    console.log('5. Обновление баланса (если service работает)');
    
    console.log('\nЕсли тест показывает 200 OK и транзакция создается - проблема в frontend integration');
    console.log('Если тест показывает ошибку - проблема в backend logic');
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ТЕСТА:', error.message);
  }
}

createUser25TonDepositTest();