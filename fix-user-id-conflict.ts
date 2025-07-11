import { supabase } from './core/supabaseClient';

async function fixUserIdConflict() {
  console.log('=== Исправление конфликта ID пользователей ===\n');
  
  // Проверяем всех пользователей с конфликтующими telegram_id
  const { data: conflictUsers } = await supabase
    .from('users')
    .select('id, telegram_id, username')
    .or('telegram_id.eq.74,telegram_id.eq.999489');
    
  console.log('Пользователи с потенциальными конфликтами:');
  conflictUsers?.forEach(user => {
    console.log(`ID: ${user.id}, Telegram ID: ${user.telegram_id}, Username: ${user.username}`);
  });
  
  // Исправляем user 76 если у него telegram_id=74
  const user76 = conflictUsers?.find(u => u.id === 76);
  if (user76 && user76.telegram_id === 74) {
    console.log('\nОбнаружен конфликт! User 76 имеет telegram_id=74');
    console.log('Изменяем telegram_id пользователя 76 на уникальное значение...');
    
    const newTelegramId = 999976; // Уникальный ID для user 76
    
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ telegram_id: newTelegramId })
      .eq('id', 76)
      .select();
      
    if (updateError) {
      console.error('Ошибка обновления user 76:', updateError);
    } else {
      console.log(`Успешно обновлено! Новый telegram_id для user 76: ${newTelegramId}`);
    }
  }
  
  // Исправляем любых других пользователей с telegram_id=74 (кроме правильного user 74)
  const otherConflicts = conflictUsers?.filter(u => u.telegram_id === 74 && u.id !== 74);
  if (otherConflicts && otherConflicts.length > 0) {
    for (const user of otherConflicts) {
      const newTelegramId = 999900 + user.id; // Генерируем уникальный ID
      console.log(`\nИсправляем user ${user.id} с telegram_id=74 на ${newTelegramId}`);
      
      await supabase
        .from('users')
        .update({ telegram_id: newTelegramId })
        .eq('id', user.id);
    }
  }
  
  console.log('\n=== Финальная проверка ===');
  
  // Проверяем финальное состояние
  const { data: finalCheck } = await supabase
    .from('users')
    .select('id, telegram_id, username')
    .in('id', [74, 75, 76]);
    
  console.log('Финальное состояние пользователей:');
  finalCheck?.forEach(user => {
    console.log(`ID: ${user.id}, Telegram ID: ${user.telegram_id}, Username: ${user.username}`);
  });
  
  process.exit(0);
}

fixUserIdConflict().catch(console.error);