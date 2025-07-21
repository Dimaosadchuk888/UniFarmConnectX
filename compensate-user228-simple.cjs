#!/usr/bin/env node

/**
 * Простая компенсация User 228 через Supabase API
 */

require('dotenv').config();

async function compensateUser228() {
  console.log('🔍 КОМПЕНСАЦИЯ USER 228 - Используем core/supabase.ts подключение');
  
  try {
    // Импортируем Supabase из core модуля
    const { supabase } = await import('./core/supabase.js');
    
    // 1. Проверяем User 228
    console.log('1. Проверка User 228...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance_ton, balance_uni, username')
      .eq('id', 228)
      .single();
      
    if (userError) {
      console.error('❌ Ошибка:', userError.message);
      return;
    }
    
    if (!user) {
      console.log('❌ User 228 не найден');
      return;
    }
    
    console.log(`📊 User 228: ${user.username}`);
    console.log(`   TON Balance: ${user.balance_ton}`);
    console.log(`   UNI Balance: ${user.balance_uni}`);
    
    // 2. Проверяем, нужна ли компенсация
    const currentBalance = parseFloat(user.balance_ton || '0');
    if (currentBalance >= 1.0) {
      console.log('\n⚠️ КОМПЕНСАЦИЯ НЕ ТРЕБУЕТСЯ');
      console.log(`   У пользователя уже есть ${currentBalance} TON`);
      return;
    }
    
    // 3. Проверяем существующие компенсации
    const { data: existingCompensation } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', 228)
      .like('description', '%d1077cd0%');
      
    if (existingCompensation && existingCompensation.length > 0) {
      console.log('\n✅ КОМПЕНСАЦИЯ УЖЕ СУЩЕСТВУЕТ');
      console.log(`   Найдена транзакция: ${existingCompensation[0].id}`);
      return;
    }
    
    // 4. Выполняем компенсацию
    console.log('\n2. Создание компенсационной транзакции...');
    
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: 228,
        amount_ton: 1.0,
        amount_uni: 0,
        type: 'DEPOSIT',
        currency: 'TON',
        status: 'completed',
        description: 'Compensation for lost transaction d1077cd0bad69b623a06fe24dd848ba5ed5b25f98655a0ca51466005f53b8b2b',
        metadata: {
          compensation: true,
          original_hash: 'd1077cd0bad69b623a06fe24dd848ba5ed5b25f98655a0ca51466005f53b8b2b',
          compensation_date: new Date().toISOString(),
          manual_review: true
        }
      })
      .select()
      .single();
      
    if (txError) {
      console.error('❌ Ошибка создания транзакции:', txError.message);
      return;
    }
    
    console.log(`✅ Транзакция создана: ID ${transaction.id}`);
    
    // 5. Обновляем баланс
    console.log('3. Обновление баланса...');
    const newBalance = currentBalance + 1.0;
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ balance_ton: newBalance })
      .eq('id', 228);
      
    if (updateError) {
      console.error('❌ Ошибка обновления баланса:', updateError.message);
      // Откатываем транзакцию
      await supabase.from('transactions').delete().eq('id', transaction.id);
      console.log('↩️ Транзакция удалена');
      return;
    }
    
    console.log(`✅ Баланс обновлен: ${currentBalance} → ${newBalance} TON`);
    
    // 6. Финальная проверка
    const { data: finalCheck } = await supabase
      .from('users')
      .select('balance_ton')
      .eq('id', 228)
      .single();
      
    console.log('\n🎉 КОМПЕНСАЦИЯ ЗАВЕРШЕНА!');
    console.log(`📊 Финальный баланс: ${finalCheck?.balance_ton} TON`);
    console.log(`📋 Транзакция: ${transaction.id}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

compensateUser228();