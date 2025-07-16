import { supabase } from '../core/supabase.js';

async function checkFarmingTiming() {
  console.log('=== ТОЧНЫЙ РАСЧЕТ ВРЕМЕНИ РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЙ ===\n');
  
  try {
    // 1. Проверяем последние запуски планировщика
    console.log('📅 ПОСЛЕДНИЕ ЗАПУСКИ ПЛАНИРОВЩИКА:\n');
    
    const { data: recentTx, error } = await supabase
      .from('transactions')
      .select('created_at, user_id')
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'UNI')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (recentTx && recentTx.length > 0) {
      const lastRun = new Date(recentTx[0].created_at);
      const now = new Date();
      const timeSinceLastRun = Math.floor((now.getTime() - lastRun.getTime()) / 1000 / 60);
      
      console.log(`Последний запуск: ${lastRun.toLocaleString('ru-RU')}`);
      console.log(`Прошло времени: ${timeSinceLastRun} минут`);
      console.log(`Следующий запуск: через ${5 - (timeSinceLastRun % 5)} минут\n`);
    }
    
    // 2. Проверяем статус рефералов
    console.log('⏱️ СТАТУС ОБРАБОТКИ РЕФЕРАЛОВ:\n');
    
    const { data: referrals } = await supabase
      .from('users')
      .select('id, username, uni_farming_last_update, created_at')
      .eq('referred_by', 74)
      .order('created_at', { ascending: false })
      .limit(3);
      
    for (const ref of referrals || []) {
      const createdAt = new Date(ref.created_at);
      const now = new Date();
      const minutesSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / 1000 / 60);
      
      console.log(`${ref.username} (ID: ${ref.id}):`);
      console.log(`- Создан: ${minutesSinceCreation} минут назад`);
      
      if (ref.uni_farming_last_update) {
        const lastUpdate = new Date(ref.uni_farming_last_update);
        const minutesSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000 / 60);
        console.log(`- Последнее обновление: ${minutesSinceUpdate} минут назад`);
        console.log(`- Статус: ✅ Уже обрабатывается планировщиком`);
      } else {
        console.log(`- Статус: ⏳ Ожидает первой обработки`);
        console.log(`- Примерное время до обработки: ${Math.max(0, 5 - (minutesSinceCreation % 5))} минут`);
      }
      console.log('');
    }
    
    // 3. Расчет времени
    console.log('⏰ ТОЧНОЕ ВРЕМЯ НАЧИСЛЕНИЙ:\n');
    console.log('1. Фарминг доход рефералам: в течение следующих 5 минут');
    console.log('2. Реферальные комиссии User 74: сразу после начисления дохода рефералам');
    console.log('3. Общее время ожидания: максимум 5-10 минут\n');
    
    console.log('📝 ВАЖНО:');
    console.log('- Планировщик обрабатывает всех пользователей пакетами');
    console.log('- Новые пользователи попадают в обработку при следующем запуске');
    console.log('- Реферальные комиссии начисляются автоматически в том же цикле');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkFarmingTiming();