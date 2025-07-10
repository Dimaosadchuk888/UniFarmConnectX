#!/usr/bin/env node

/**
 * Проверка данных о ежедневном бонусе для пользователя ID 74
 */

const dotenv = require('dotenv');
const path = require('path');

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkDailyBonusData() {
  console.log('=== ПРОВЕРКА ДАННЫХ О ЕЖЕДНЕВНОМ БОНУСЕ ===\n');

  try {
    // 1. Проверяем данные пользователя
    console.log('1. ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ID 74:');
    console.log('------------------------------');
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, checkin_last_date, checkin_streak, created_at')
      .eq('id', 74)
      .single();
    
    if (userError) {
      console.error('❌ Ошибка получения пользователя:', userError);
      return;
    }
    
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Последний check-in: ${user.checkin_last_date || 'НИКОГДА'}`);
    console.log(`   Серия дней: ${user.checkin_streak || 0}`);
    console.log(`   Создан: ${new Date(user.created_at).toLocaleString('ru-RU')}`);
    
    // 2. Расчёт времени с последнего получения
    console.log('\n2. АНАЛИЗ ВОЗМОЖНОСТИ ПОЛУЧЕНИЯ БОНУСА:');
    console.log('---------------------------------------');
    
    const now = new Date();
    console.log(`   Текущее время сервера: ${now.toLocaleString('ru-RU')}`);
    console.log(`   UTC время: ${now.toISOString()}`);
    
    if (user.checkin_last_date) {
      const lastClaimDate = new Date(user.checkin_last_date);
      console.log(`   Последний бонус получен: ${lastClaimDate.toLocaleString('ru-RU')}`);
      
      // Точный расчёт разницы в миллисекундах
      const timeDiff = now.getTime() - lastClaimDate.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      
      console.log(`   Прошло времени: ${hoursDiff.toFixed(2)} часов (${daysDiff} полных дней)`);
      
      // Логика из сервиса
      if (daysDiff < 1) {
        console.log('   ❌ Бонус УЖЕ ПОЛУЧЕН сегодня (прошло меньше 24 часов)');
        const nextAvailable = new Date(lastClaimDate.getTime() + 24 * 60 * 60 * 1000);
        console.log(`   ⏰ Следующий бонус доступен: ${nextAvailable.toLocaleString('ru-RU')}`);
        const hoursToWait = (nextAvailable.getTime() - now.getTime()) / (1000 * 60 * 60);
        console.log(`   ⏱️  Осталось ждать: ${hoursToWait.toFixed(2)} часов`);
      } else {
        console.log('   ✅ Бонус ДОСТУПЕН для получения');
      }
    } else {
      console.log('   ✅ Бонус НИКОГДА не получался - доступен для получения');
    }
    
    // 3. Проверяем историю транзакций daily bonus
    console.log('\n3. ИСТОРИЯ ТРАНЗАКЦИЙ DAILY_BONUS:');
    console.log('----------------------------------');
    
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('type', 'DAILY_BONUS')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (txError) {
      console.error('❌ Ошибка получения транзакций:', txError);
    } else if (transactions && transactions.length > 0) {
      console.log(`   Найдено ${transactions.length} транзакций:`);
      transactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${new Date(tx.created_at).toLocaleString('ru-RU')} - ${tx.amount_uni} UNI`);
      });
    } else {
      console.log('   📋 Транзакций DAILY_BONUS не найдено');
    }
    
    // 4. Проверяем таблицу daily_bonus_history (если существует)
    console.log('\n4. ПРОВЕРКА ТАБЛИЦЫ daily_bonus_history:');
    console.log('----------------------------------------');
    
    const { data: bonusHistory, error: historyError } = await supabase
      .from('daily_bonus_history')
      .select('*')
      .eq('user_id', 74)
      .order('claimed_at', { ascending: false })
      .limit(5);
    
    if (historyError) {
      if (historyError.code === '42P01') {
        console.log('   ℹ️  Таблица daily_bonus_history не существует');
      } else {
        console.error('   ❌ Ошибка:', historyError);
      }
    } else if (bonusHistory && bonusHistory.length > 0) {
      console.log(`   Найдено ${bonusHistory.length} записей:`);
      bonusHistory.forEach((record, index) => {
        console.log(`   ${index + 1}. ${new Date(record.claimed_at).toLocaleString('ru-RU')} - ${record.bonus_amount} UNI, streak: ${record.streak_day}`);
      });
    } else {
      console.log('   📋 Записей в daily_bonus_history не найдено');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
  
  console.log('\n=== ДИАГНОСТИКА ЗАВЕРШЕНА ===');
}

checkDailyBonusData().catch(console.error);