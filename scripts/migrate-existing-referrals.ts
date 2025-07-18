/**
 * Миграция существующих реферальных связей
 * Создает записи в таблице referrals для пользователей с referred_by
 */

import { supabase } from '../core/supabase';
import { ReferralService } from '../modules/referral/service';
import { logger } from '../core/logger';

async function migrateExistingReferrals() {
  console.log('\n' + '='.repeat(80));
  console.log('МИГРАЦИЯ СУЩЕСТВУЮЩИХ РЕФЕРАЛЬНЫХ СВЯЗЕЙ');
  console.log('='.repeat(80) + '\n');
  
  const referralService = new ReferralService();
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;
  
  try {
    // Получаем всех пользователей с рефералами
    const { data: usersWithRefs, error } = await supabase
      .from('users')
      .select('id, username, ref_code, referred_by')
      .not('referred_by', 'is', null);
    
    if (error) {
      console.error('Ошибка получения пользователей:', error);
      return;
    }
    
    if (!usersWithRefs || usersWithRefs.length === 0) {
      console.log('Нет пользователей с реферальными связями');
      return;
    }
    
    console.log(`Найдено ${usersWithRefs.length} пользователей с реферальными связями\n`);
    
    for (const user of usersWithRefs) {
      processedCount++;
      console.log(`[${processedCount}/${usersWithRefs.length}] Обработка User ${user.id} (referred_by: ${user.referred_by})`);
      
      // Находим реферера
      const { data: referrer, error: referrerError } = await supabase
        .from('users')
        .select('id, ref_code, username')
        .eq('id', user.referred_by)
        .single();
      
      if (referrerError || !referrer) {
        console.error(`  ❌ Реферер ${user.referred_by} не найден - пропускаем`);
        errorCount++;
        continue;
      }
      
      if (!referrer.ref_code) {
        console.error(`  ❌ У реферера ${referrer.id} нет ref_code - пропускаем`);
        errorCount++;
        continue;
      }
      
      console.log(`  → Реферер найден: User ${referrer.id} (${referrer.username}, ref_code: ${referrer.ref_code})`);
      
      // Вызываем processReferral для создания записи
      const result = await referralService.processReferral(referrer.ref_code, user.id.toString());
      
      if (result.success) {
        console.log(`  ✅ Реферальная связь создана успешно`);
        successCount++;
      } else {
        console.error(`  ❌ Ошибка создания связи: ${result.error}`);
        errorCount++;
      }
      
      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('РЕЗУЛЬТАТЫ МИГРАЦИИ:');
    console.log('='.repeat(80));
    console.log(`Обработано: ${processedCount}`);
    console.log(`Успешно: ${successCount}`);
    console.log(`Ошибок: ${errorCount}`);
    
    // Проверяем результат
    const { count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact' });
    
    console.log(`\nВсего записей в таблице referrals: ${count || 0}`);
    
  } catch (error) {
    console.error('Критическая ошибка миграции:', error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('МИГРАЦИЯ ЗАВЕРШЕНА');
  console.log('='.repeat(80) + '\n');
}

// Запуск миграции
migrateExistingReferrals();