/**
 * Прямая вставка реферальных записей в таблицу
 */

import { supabase } from '../core/supabase';

async function fixReferralsDirectly() {
  console.log('Прямая вставка реферальных записей...\n');
  
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
    
    for (const user of usersWithRefs) {
      console.log(`Обработка User ${user.id} (referred_by: ${user.referred_by})`);
      
      // Формируем данные для вставки
      const referralData = {
        user_id: user.id,
        inviter_id: user.referred_by,
        level: 1,
        reward_uni: '0',
        reward_ton: '0',
        ref_path: [user.referred_by]
      };
      
      // Пробуем вставить
      const { data, error: insertError } = await supabase
        .from('referrals')
        .insert(referralData)
        .select();
      
      if (insertError) {
        console.error(`  ❌ Ошибка: ${insertError.message}`);
        
        // Если ошибка про referred_user_id, пробуем с этим полем
        if (insertError.message.includes('referred_user_id')) {
          const referralDataAlt = {
            referred_user_id: user.id,
            inviter_id: user.referred_by,
            level: 1,
            reward_uni: '0',
            reward_ton: '0',
            ref_path: [user.referred_by]
          };
          
          const { data: dataAlt, error: errorAlt } = await supabase
            .from('referrals')
            .insert(referralDataAlt)
            .select();
          
          if (errorAlt) {
            console.error(`  ❌ Альтернативная попытка также не удалась: ${errorAlt.message}`);
          } else {
            console.log(`  ✅ Запись создана с полем referred_user_id`);
          }
        }
      } else {
        console.log(`  ✅ Запись создана успешно`);
      }
    }
    
    // Проверяем результат
    const { count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact' });
    
    console.log(`\nВсего записей в таблице referrals: ${count || 0}`);
    
  } catch (error) {
    console.error('Критическая ошибка:', error);
  }
}

fixReferralsDirectly();