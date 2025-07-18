/**
 * Проверка структуры таблицы referrals
 */

import { supabase } from '../core/supabase';

async function checkReferralsTable() {
  console.log('Проверка структуры таблицы referrals...\n');
  
  try {
    // Пробуем вставить тестовую запись чтобы увидеть какие поля ожидаются
    const testData = {
      user_id: 999999,
      inviter_id: 999998,
      referred_user_id: 999999,
      level: 1,
      reward_uni: '0',
      reward_ton: '0',
      ref_path: [999998]
    };
    
    console.log('Пробуем вставить тестовые данные с обоими полями...');
    const { data, error } = await supabase
      .from('referrals')
      .insert(testData)
      .select();
    
    if (error) {
      console.error('Ошибка вставки:', error.message);
      console.log('\nПробуем без user_id...');
      
      const testData2 = {
        referred_user_id: 999999,
        inviter_id: 999998,
        level: 1,
        reward_uni: '0',
        reward_ton: '0',
        ref_path: [999998]
      };
      
      const { data: data2, error: error2 } = await supabase
        .from('referrals')
        .insert(testData2)
        .select();
      
      if (error2) {
        console.error('Ошибка вставки без user_id:', error2.message);
      } else {
        console.log('✅ Успешно вставлено без user_id:', data2);
        // Удаляем тестовую запись
        if (data2 && data2[0]) {
          await supabase.from('referrals').delete().eq('id', data2[0].id);
        }
      }
    } else {
      console.log('✅ Успешно вставлено с обоими полями:', data);
      // Удаляем тестовую запись
      if (data && data[0]) {
        await supabase.from('referrals').delete().eq('id', data[0].id);
      }
    }
    
    // Получаем одну запись чтобы увидеть структуру
    console.log('\nПроверяем существующие записи...');
    const { data: existing, error: existingError } = await supabase
      .from('referrals')
      .select('*')
      .limit(1);
    
    if (existingError) {
      console.error('Ошибка получения записей:', existingError);
    } else if (existing && existing.length > 0) {
      console.log('Структура существующей записи:', Object.keys(existing[0]));
    } else {
      console.log('Таблица пустая');
    }
    
  } catch (error) {
    console.error('Критическая ошибка:', error);
  }
}

checkReferralsTable();