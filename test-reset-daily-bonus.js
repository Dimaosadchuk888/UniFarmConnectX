/**
 * Тестовый скрипт для сброса даты последнего получения Daily Bonus
 * чтобы протестировать исправленную сумму 500 UNI
 */

import { createClient } from '@supabase/supabase-js';

async function resetDailyBonus() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Отсутствуют переменные SUPABASE_URL или SUPABASE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== RESET DAILY BONUS TEST ===');
  
  // Получим текущие данные пользователя 48
  const { data: currentUser, error: currentError } = await supabase
    .from('users')
    .select('id, balance_uni, checkin_last_date, checkin_streak')
    .eq('id', 48)
    .single();
  
  if (currentError) {
    console.error('Ошибка получения текущих данных:', currentError.message);
    return;
  }
  
  console.log('BEFORE - Текущие данные пользователя 48:', {
    balance_uni: currentUser.balance_uni,
    checkin_last_date: currentUser.checkin_last_date,
    checkin_streak: currentUser.checkin_streak
  });
  
  // Сбросим дату последнего чекина на вчера
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0);
  
  const { error: updateError } = await supabase
    .from('users')
    .update({
      checkin_last_date: yesterday.toISOString()
    })
    .eq('id', 48);
  
  if (updateError) {
    console.error('Ошибка обновления даты:', updateError.message);
    return;
  }
  
  // Проверим обновленные данные
  const { data: updatedUser, error: afterError } = await supabase
    .from('users')
    .select('id, balance_uni, checkin_last_date, checkin_streak')
    .eq('id', 48)
    .single();
  
  if (afterError) {
    console.error('Ошибка получения обновленных данных:', afterError.message);
    return;
  }
  
  console.log('AFTER - Обновленные данные пользователя 48:', {
    balance_uni: updatedUser.balance_uni,
    checkin_last_date: updatedUser.checkin_last_date,
    checkin_streak: updatedUser.checkin_streak
  });
  
  console.log('✅ Daily Bonus дата сброшена. Теперь можно тестировать новую сумму 500 UNI');
  console.log('=== ТЕСТ ЗАВЕРШЕН ===');
}

resetDailyBonus().catch(console.error);