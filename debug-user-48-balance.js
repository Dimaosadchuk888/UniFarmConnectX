/**
 * Отладочный скрипт для проверки реальных данных пользователя ID=48
 * Проверяет все поля пользователя для выявления проблемы с балансом
 */

import { supabase } from './core/supabase.ts';

async function debugUser48Balance() {
  try {
    console.log('=== ПРОВЕРКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ ID=48 ===\n');
    
    // 1. Получаем полные данные пользователя ID=48
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 48)
      .single();
    
    if (userError) {
      console.error('❌ Ошибка получения пользователя:', userError);
      return;
    }
    
    if (!user) {
      console.log('❌ Пользователь ID=48 не найден в базе данных');
      return;
    }
    
    console.log('✅ Пользователь ID=48 найден');
    console.log('📊 Основные данные:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Telegram ID: ${user.telegram_id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Ref Code: ${user.ref_code}`);
    
    console.log('\n💰 Балансы:');
    console.log(`   UNI Balance: ${user.balance_uni} (тип: ${typeof user.balance_uni})`);
    console.log(`   TON Balance: ${user.balance_ton} (тип: ${typeof user.balance_ton})`);
    
    console.log('\n🌾 Фарминг данные:');
    console.log(`   UNI Deposit Amount: ${user.uni_deposit_amount}`);
    console.log(`   TON Deposit Amount: ${user.ton_deposit_amount}`);
    console.log(`   UNI Farming Rate: ${user.uni_farming_rate}`);
    console.log(`   UNI Farming Start: ${user.uni_farming_start_timestamp}`);
    
    console.log('\n📋 ВСЕ ПОЛЯ ПОЛЬЗОВАТЕЛЯ:');
    Object.keys(user).forEach(key => {
      const value = user[key];
      const type = typeof value;
      console.log(`   ${key}: ${value} (${type})`);
    });
    
    // 2. Проверим транзакции для этого пользователя
    console.log('\n=== ПРОВЕРКА ТРАНЗАКЦИЙ ===');
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 48)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (transError) {
      console.error('❌ Ошибка получения транзакций:', transError);
    } else {
      console.log(`✅ Найдено ${transactions.length} последних транзакций:`);
      transactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.type} - UNI: ${tx.amount_uni}, TON: ${tx.amount_ton} (${tx.created_at})`);
      });
    }
    
    // 3. Проверим все пользователей для сравнения
    console.log('\n=== СРАВНЕНИЕ С ДРУГИМИ ПОЛЬЗОВАТЕЛЯМИ ===');
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton')
      .order('id');
    
    if (allError) {
      console.error('❌ Ошибка получения всех пользователей:', allError);
    } else {
      console.log(`✅ Всего пользователей в базе: ${allUsers.length}`);
      allUsers.forEach(u => {
        const highlight = u.id === 48 ? '>>> ' : '    ';
        console.log(`${highlight}ID ${u.id}: ${u.username} (tg:${u.telegram_id}) - UNI:${u.balance_uni}, TON:${u.balance_ton}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

debugUser48Balance();