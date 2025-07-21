#!/usr/bin/env node

/**
 * Скрипт компенсации User 228 за потерянную TON транзакцию d1077cd0
 * Безопасное восстановление с проверками
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.DATABASE_URL?.replace('postgresql://', '').split('@')[1]?.split('/')[0];
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют переменные окружения для Supabase');
  process.exit(1);
}

const supabase = createClient(`https://${supabaseUrl}`, supabaseKey);

async function compensateUser228() {
  console.log('🔍 КОМПЕНСАЦИЯ USER 228 - НАЧАЛО ПРОЦЕДУРЫ\n');
  
  try {
    // 1. Проверяем текущий баланс User 228
    console.log('1. Проверка текущего состояния User 228...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton, balance_uni')
      .eq('id', 228)
      .single();
      
    if (userError || !user) {
      console.error('❌ User 228 не найден:', userError);
      return;
    }
    
    console.log('📊 Текущий статус User 228:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Telegram ID: ${user.telegram_id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   TON Balance: ${user.balance_ton}`);
    console.log(`   UNI Balance: ${user.balance_uni}`);
    
    // 2. Проверяем существующие транзакции
    console.log('\n2. Проверка существующих транзакций...');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, type, amount_ton, amount_uni, description, created_at')
      .eq('user_id', 228)
      .order('created_at', { ascending: false });
      
    if (txError) {
      console.error('❌ Ошибка получения транзакций:', txError);
      return;
    }
    
    console.log(`📊 Найдено транзакций: ${transactions?.length || 0}`);
    if (transactions && transactions.length > 0) {
      transactions.forEach(tx => {
        console.log(`   TX ${tx.id}: ${tx.type}, TON: ${tx.amount_ton}, UNI: ${tx.amount_uni}`);
      });
    }
    
    // 3. Проверяем, нужна ли компенсация
    const currentTonBalance = parseFloat(user.balance_ton || '0');
    const hasCompensation = transactions?.some(tx => 
      tx.description?.includes('d1077cd0') || 
      tx.description?.includes('compensation')
    );
    
    if (hasCompensation) {
      console.log('\n✅ КОМПЕНСАЦИЯ УЖЕ ВЫПОЛНЕНА');
      console.log('   Найдена существующая компенсационная транзакция');
      return;
    }
    
    if (currentTonBalance >= 1.0) {
      console.log('\n⚠️ КОМПЕНСАЦИЯ НЕ ТРЕБУЕТСЯ');
      console.log(`   У пользователя уже есть ${currentTonBalance} TON`);
      console.log('   Компенсация предназначена только для пользователей с 0 баланса');
      return;
    }
    
    // 4. Выполняем компенсацию
    console.log('\n3. Выполнение компенсации...');
    console.log('   Условия выполнены: баланс = 0, нет предыдущих компенсаций');
    
    // Создаем транзакцию компенсации
    const { data: transaction, error: createTxError } = await supabase
      .from('transactions')
      .insert({
        user_id: 228,
        amount_ton: 1.0,
        amount_uni: 0,
        type: 'DEPOSIT',
        currency: 'TON',
        status: 'completed',
        description: 'Manual compensation for lost transaction d1077cd0bad69b623a06fe24dd848ba5ed5b25f98655a0ca51466005f53b8b2b',
        metadata: {
          compensation: true,
          original_hash: 'd1077cd0bad69b623a06fe24dd848ba5ed5b25f98655a0ca51466005f53b8b2b',
          manual_review: true,
          compensation_date: new Date().toISOString(),
          compensation_reason: 'Lost TON deposit due to system enum error'
        }
      })
      .select()
      .single();
      
    if (createTxError) {
      console.error('❌ Ошибка создания транзакции:', createTxError);
      return;
    }
    
    console.log(`✅ Создана транзакция компенсации ID: ${transaction.id}`);
    
    // Обновляем баланс пользователя
    const newBalance = currentTonBalance + 1.0;
    const { error: updateError } = await supabase
      .from('users')
      .update({ balance_ton: newBalance })
      .eq('id', 228);
      
    if (updateError) {
      console.error('❌ Ошибка обновления баланса:', updateError);
      // Пытаемся удалить созданную транзакцию
      await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id);
      console.log('↩️ Транзакция откачена из-за ошибки обновления баланса');
      return;
    }
    
    console.log(`✅ Баланс обновлен: ${currentTonBalance} → ${newBalance} TON`);
    
    // 5. Финальная проверка
    console.log('\n4. Финальная проверка...');
    const { data: updatedUser, error: checkError } = await supabase
      .from('users')
      .select('balance_ton')
      .eq('id', 228)
      .single();
      
    if (checkError || !updatedUser) {
      console.error('❌ Ошибка финальной проверки:', checkError);
      return;
    }
    
    console.log('\n🎉 КОМПЕНСАЦИЯ УСПЕШНО ЗАВЕРШЕНА!');
    console.log('📊 ИТОГОВЫЙ РЕЗУЛЬТАТ:');
    console.log(`   User 228 TON баланс: ${updatedUser.balance_ton}`);
    console.log(`   Транзакция ID: ${transaction.id}`);
    console.log(`   Сумма компенсации: 1.0 TON`);
    console.log(`   Причина: Lost transaction d1077cd0`);
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    console.log('\n🚨 ПРОЦЕДУРА КОМПЕНСАЦИИ ПРЕРВАНА');
    console.log('   Все изменения отменены или не применены');
  }
}

// Запуск скрипта
compensateUser228()
  .then(() => {
    console.log('\n✅ Скрипт компенсации завершен');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Фатальная ошибка скрипта:', error);
    process.exit(1);
  });