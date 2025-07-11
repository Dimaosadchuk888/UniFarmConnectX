import { supabase } from './core/supabaseClient';

async function fixUserIdConflict() {
  console.log('=== Исправление конфликта ID пользователей ===\n');
  
  // Проверяем текущую ситуацию
  const { data: user75, error: error75 } = await supabase
    .from('users')
    .select('id, telegram_id, username')
    .eq('id', 75)
    .single();
    
  if (user75) {
    console.log('Текущее состояние user_id=75:');
    console.log(`ID: ${user75.id}, Telegram ID: ${user75.telegram_id}, Username: ${user75.username}`);
    
    if (user75.telegram_id === 74) {
      console.log('\nОбнаружен конфликт! User 75 имеет telegram_id=74');
      console.log('Изменяем telegram_id пользователя 75 на уникальное значение...');
      
      // Генерируем новый уникальный telegram_id для user 75
      const newTelegramId = 999975; // Уникальный ID
      
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ telegram_id: newTelegramId })
        .eq('id', 75)
        .select();
        
      if (updateError) {
        console.error('Ошибка обновления:', updateError);
      } else {
        console.log(`\nУспешно обновлено! Новый telegram_id для user 75: ${newTelegramId}`);
        console.log('Конфликт устранен.');
      }
    } else {
      console.log('\nКонфликт уже устранен или не существует');
    }
  }
  
  // Проверяем user 74
  const { data: user74, error: error74 } = await supabase
    .from('users')
    .select('id, telegram_id, username')
    .eq('id', 74)
    .single();
    
  if (user74) {
    console.log('\nТекущее состояние user_id=74:');
    console.log(`ID: ${user74.id}, Telegram ID: ${user74.telegram_id}, Username: ${user74.username}`);
  }
  
  process.exit(0);
}

fixUserIdConflict().catch(console.error);