/**
 * Test TON Boost Purchase with Transaction Creation
 * Проверяет создание транзакции при покупке TON Boost пакета
 */

import { supabase } from './core/supabase.js';
import { boostService } from './modules/boost/service.js';

console.log('🧪 Тестирование покупки TON Boost пакета...\n');

async function testTonBoostPurchase() {
  const testUserId = '9997';  // Test user для безопасного тестирования
  const boostPackageId = '1'; // Пакет 1: 5 TON депозит
  
  try {
    // 1. Создаем тестового пользователя если его нет
    console.log('1️⃣ Создание тестового пользователя...');
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, telegram_id, balance_ton')
      .eq('id', testUserId)
      .single();

    if (!existingUser) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: parseInt(testUserId),
          telegram_id: 999999997,
          username: 'test_boost_user_997',
          balance_ton: '100',
          balance_uni: '1000',
          ref_code: 'TEST997',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Ошибка создания пользователя:', createError);
        return;
      }
      console.log('✅ Тестовый пользователь создан');
    } else {
      console.log(`✅ Тестовый пользователь найден (balance_ton: ${existingUser.balance_ton})`);
    }

    // 2. Проверяем транзакции до покупки
    console.log('\n2️⃣ Проверка транзакций до покупки...');
    const { data: beforeTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', testUserId)
      .eq('type', 'BOOST_PURCHASE');
    
    console.log(`   Найдено BOOST_PURCHASE транзакций: ${beforeTx?.length || 0}`);

    // 3. Выполняем покупку boost пакета
    console.log('\n3️⃣ Покупка TON Boost пакета...');
    const result = await boostService.purchaseBoost(
      testUserId,
      boostPackageId,
      'wallet' // Используем внутренний кошелек
    );

    if (result.success) {
      console.log('✅ Boost пакет успешно куплен!');
      console.log(`   Активирован пакет: ${result.data.packageId}`);
    } else {
      console.error('❌ Ошибка покупки:', result.error);
      return;
    }

    // 4. Проверяем транзакции после покупки
    console.log('\n4️⃣ Проверка транзакций после покупки...');
    const { data: afterTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', testUserId)
      .eq('type', 'BOOST_PURCHASE')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (afterTx && afterTx.length > 0) {
      const tx = afterTx[0];
      console.log('✅ Транзакция BOOST_PURCHASE создана!');
      console.log(`   - ID: ${tx.id}`);
      console.log(`   - Сумма: ${tx.amount} ${tx.currency}`);
      console.log(`   - Статус: ${tx.status}`);
      console.log(`   - Описание: ${tx.description}`);
    } else {
      console.error('❌ Транзакция BOOST_PURCHASE не найдена!');
    }

    // 5. Проверяем ton_farming_data
    console.log('\n5️⃣ Проверка ton_farming_data...');
    const { data: farmingData } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', testUserId)
      .single();
    
    if (farmingData) {
      console.log('✅ Данные TON farming:');
      console.log(`   - farming_balance: ${farmingData.farming_balance}`);
      console.log(`   - boost_active: ${farmingData.boost_active}`);
      console.log(`   - boost_package_id: ${farmingData.boost_package_id}`);
      console.log(`   - farming_rate: ${farmingData.farming_rate}`);
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testTonBoostPurchase().catch(console.error);