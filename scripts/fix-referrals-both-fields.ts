/**
 * Вставка реферальных записей с обоими полями
 */

import { supabase } from '../core/supabase';

async function fixReferralsBothFields() {
  console.log('Вставка реферальных записей с обоими полями...\n');
  
  try {
    // Получаем пользователей с реферальными связями
    const { data: usersWithRefs, error } = await supabase
      .from('users')
      .select('id, username, referred_by')
      .not('referred_by', 'is', null)
      .order('id');
    
    if (error || !usersWithRefs) {
      console.error('Ошибка получения пользователей:', error);
      return;
    }
    
    console.log(`Найдено ${usersWithRefs.length} пользователей с реферальными связями\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of usersWithRefs) {
      console.log(`Обработка User ${user.id} (referred_by: ${user.referred_by})`);
      
      // Формируем данные для вставки с ОБОИМИ полями
      const referralData = {
        user_id: user.id,                // ID приглашенного пользователя
        referred_user_id: user.id,        // Дублируем ID в оба поля
        inviter_id: user.referred_by,
        level: 1,
        reward_uni: '0',
        reward_ton: '0',
        ref_path: [user.referred_by]
      };
      
      console.log('  Данные для вставки:', JSON.stringify(referralData));
      
      // Пробуем вставить
      const { data, error: insertError } = await supabase
        .from('referrals')
        .insert(referralData)
        .select();
      
      if (insertError) {
        console.error(`  ❌ Ошибка: ${insertError.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ Запись создана успешно:`, data);
        successCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`Результаты: Успешно ${successCount}, Ошибок ${errorCount}`);
    
    // Проверяем результат
    const { data: allReferrals, count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact' });
    
    console.log(`Всего записей в таблице referrals: ${count || 0}`);
    
    if (allReferrals && allReferrals.length > 0) {
      console.log('\nПример записи:');
      console.log(JSON.stringify(allReferrals[0], null, 2));
    }
    
  } catch (error) {
    console.error('Критическая ошибка:', error);
  }
}

fixReferralsBothFields();