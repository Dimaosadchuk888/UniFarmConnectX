/**
 * Тестирование калибровки ежедневных бонусов
 * Проверяет, что отображается ровно столько, сколько начисляется
 */

import { supabase } from './core/supabase';

async function testDailyBonusCalibration() {
  console.log('🧪 ТЕСТИРОВАНИЕ КАЛИБРОВКИ ЕЖЕДНЕВНЫХ БОНУСОВ');
  console.log('=' .repeat(60));
  
  const testUserId = 184;
  
  console.log('\n📊 Тест 1: Проверка отображаемой суммы через API');
  
  // Симулируем разные streak дни
  const testStreaks = [0, 1, 2, 3, 5, 10];
  
  for (const streak of testStreaks) {
    // Временно обновляем streak пользователя для теста
    const { error: updateError } = await supabase
      .from('users')
      .update({ checkin_streak: streak })
      .eq('id', testUserId);
    
    if (updateError) {
      console.error(`Ошибка обновления streak ${streak}:`, updateError.message);
      continue;
    }
    
    // Тестируем API эндпоинт
    try {
      const response = await fetch(`http://localhost:3000/api/v2/daily-bonus/status?user_id=${testUserId}`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`Streak ${streak}: API показывает ${data.data.bonusAmount} UNI`);
      } else {
        console.error(`Streak ${streak}: Ошибка API -`, data.error);
      }
    } catch (error) {
      console.error(`Streak ${streak}: Ошибка запроса -`, error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200)); // Небольшая пауза
  }
  
  console.log('\n🧮 Тест 2: Проверка логики начисления через сервис');
  
  // Импортируем сервис
  const { DailyBonusService } = await import('./modules/dailyBonus/service');
  const service = new DailyBonusService();
  
  // Тестируем calculateBonusAmount через getDailyBonusInfo
  for (const streak of testStreaks) {
    // Обновляем streak
    await supabase
      .from('users')
      .update({ checkin_streak: streak })
      .eq('id', testUserId);
    
    try {
      const bonusInfo = await service.getDailyBonusInfo(testUserId.toString());
      console.log(`Streak ${streak}: Service начисляет ${bonusInfo.next_bonus_amount} UNI`);
    } catch (error) {
      console.error(`Streak ${streak}: Ошибка сервиса -`, error);
    }
  }
  
  console.log('\n✅ Тест 3: Проверка синхронизации');
  
  // Финальный тест - проверяем что обе системы дают одинаковый результат
  const finalStreak = 2; // Тестируем проблемный случай
  
  await supabase
    .from('users')
    .update({ checkin_streak: finalStreak })
    .eq('id', testUserId);
  
  // API результат
  const apiResponse = await fetch(`http://localhost:3000/api/v2/daily-bonus/status?user_id=${testUserId}`);
  const apiData = await apiResponse.json();
  const apiAmount = apiData.success ? apiData.data.bonusAmount : 'ERROR';
  
  // Service результат
  const serviceInfo = await service.getDailyBonusInfo(testUserId.toString());
  const serviceAmount = serviceInfo.next_bonus_amount;
  
  console.log(`\nСтрик ${finalStreak} дня:`);
  console.log(`📱 Карточка показывает: ${apiAmount} UNI`);
  console.log(`💰 Сервис начислит: ${serviceAmount} UNI`);
  
  if (apiAmount === parseInt(serviceAmount)) {
    console.log('✅ КАЛИБРОВКА УСПЕШНА - суммы совпадают!');
  } else {
    console.log('❌ КАЛИБРОВКА НЕ ЗАВЕРШЕНА - суммы не совпадают!');
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎊 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
}

// Запуск тестирования
testDailyBonusCalibration().catch(console.error);