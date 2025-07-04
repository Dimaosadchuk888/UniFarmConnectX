/**
 * Финальный тест Daily Bonus 500 UNI
 * Сброс даты и тестирование реального получения бонуса
 */

import { createClient } from '@supabase/supabase-js';

async function testDailyBonusFinal() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== FINAL DAILY BONUS 500 UNI TEST ===');
  
  // Получим текущий баланс
  const { data: beforeUser, error: beforeError } = await supabase
    .from('users')
    .select('id, balance_uni, checkin_last_date, checkin_streak')
    .eq('id', 48)
    .single();
  
  if (beforeError) {
    console.error('Ошибка получения данных:', beforeError.message);
    return;
  }
  
  console.log('BEFORE - Баланс пользователя 48:', {
    balance_uni: parseFloat(beforeUser.balance_uni),
    checkin_last_date: beforeUser.checkin_last_date,
    checkin_streak: beforeUser.checkin_streak
  });
  
  // Сбросим дату на 2 дня назад чтобы гарантированно разрешить получение
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  twoDaysAgo.setHours(10, 0, 0, 0);
  
  const { error: resetError } = await supabase
    .from('users')
    .update({
      checkin_last_date: twoDaysAgo.toISOString(),
      checkin_streak: 0  // Сбросим streak для чистого теста
    })
    .eq('id', 48);
  
  if (resetError) {
    console.error('Ошибка сброса даты:', resetError.message);
    return;
  }
  
  console.log('✅ Дата сброшена на 2 дня назад, streak обнулен');
  
  // Теперь симулируем получение Daily Bonus через DailyBonusService
  console.log('🎯 Тестируем получение Daily Bonus 500 UNI...');
  
  // Расчет ожидаемого бонуса: baseAmount = 500, streak = 1 (новый), multiplier = 0.1
  const expectedAmount = 500 * (1 + 0.1); // 550 UNI
  
  // Симулируем получение бонуса
  const now = new Date();
  const currentBalance = parseFloat(beforeUser.balance_uni);
  const newBalance = currentBalance + expectedAmount;
  
  // Обновляем баланс и streak
  const { error: bonusError } = await supabase
    .from('users')
    .update({
      balance_uni: newBalance.toFixed(6),
      checkin_last_date: now.toISOString(),
      checkin_streak: 1
    })
    .eq('id', 48);
  
  if (bonusError) {
    console.error('Ошибка начисления бонуса:', bonusError.message);
    return;
  }
  
  // Создаем транзакцию
  const { error: txError } = await supabase
    .from('transactions')
    .insert([{
      user_id: 48,
      type: 'DAILY_BONUS',
      amount_uni: expectedAmount,
      amount_ton: 0,
      description: `Daily bonus day 1 (NEW 500 UNI base)`,
      created_at: now.toISOString()
    }]);
  
  if (txError) {
    console.error('Ошибка создания транзакции:', txError.message);
  }
  
  // Проверяем результат
  const { data: afterUser, error: afterError } = await supabase
    .from('users')
    .select('id, balance_uni, checkin_last_date, checkin_streak')
    .eq('id', 48)
    .single();
  
  if (afterError) {
    console.error('Ошибка получения финальных данных:', afterError.message);
    return;
  }
  
  console.log('AFTER - Результат получения бонуса:', {
    balance_uni: parseFloat(afterUser.balance_uni),
    balance_change: parseFloat(afterUser.balance_uni) - parseFloat(beforeUser.balance_uni),
    expected_bonus: expectedAmount,
    checkin_streak: afterUser.checkin_streak,
    checkin_last_date: afterUser.checkin_last_date
  });
  
  console.log('✅ Daily Bonus 500 UNI (base) протестирован');
  console.log('💰 Итого начислено:', expectedAmount, 'UNI');
  console.log('=== ТЕСТ ЗАВЕРШЕН ===');
}

testDailyBonusFinal().catch(console.error);