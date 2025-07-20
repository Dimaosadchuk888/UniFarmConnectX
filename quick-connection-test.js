import { supabase } from './core/supabase.js';

async function quickTest() {
  console.log('🔄 Тест подключения к Supabase...');
  
  try {
    // Проверяем подключение
    const { data, error } = await supabase
      .from('users')
      .select('id, telegram_id, username')
      .limit(3);
    
    if (error) {
      console.error('❌ Ошибка подключения:', error.message);
      return;
    }
    
    console.log('✅ Подключение работает');
    console.log('📊 Первые 3 пользователя:', data);
    
    // Проверяем конкретно User #25
    const { data: user25, error: error25 } = await supabase
      .from('users')
      .select('*')
      .eq('id', 25)
      .maybeSingle();
    
    if (error25) {
      console.error('❌ Ошибка поиска User #25:', error25.message);
    } else if (user25) {
      console.log('✅ User #25 найден:', {
        id: user25.id,
        telegram_id: user25.telegram_id,
        username: user25.username,
        balance_ton: user25.balance_ton
      });
    } else {
      console.log('⚠️ User #25 не найден по id=25');
    }
    
    // Поиск по telegram_id
    const { data: userByTg, error: errorTg } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', 425855744)
      .maybeSingle();
    
    if (errorTg) {
      console.error('❌ Ошибка поиска по telegram_id:', errorTg.message);
    } else if (userByTg) {
      console.log('✅ User найден по telegram_id:', {
        id: userByTg.id,
        telegram_id: userByTg.telegram_id,
        username: userByTg.username,
        balance_ton: userByTg.balance_ton
      });
    } else {
      console.log('⚠️ User не найден по telegram_id=425855744');
    }
    
  } catch (err) {
    console.error('❌ Критическая ошибка:', err.message);
  }
}

quickTest();