import { supabase } from '../core/supabase.js';

async function checkSupabaseConnection() {
  console.log('🔍 Проверка подключения к Supabase...\n');
  
  try {
    // Проверяем переменные окружения
    console.log('1️⃣ Переменные окружения:');
    console.log('SUPABASE_URL установлен:', !!process.env.SUPABASE_URL);
    console.log('SUPABASE_SERVICE_KEY установлен:', !!process.env.SUPABASE_SERVICE_KEY);
    
    // Простой запрос для проверки подключения
    console.log('\n2️⃣ Тест подключения к базе данных...');
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.error('❌ Ошибка подключения:', error);
      return;
    }
    
    console.log('✅ Подключение успешно!');
    console.log('📊 Количество пользователей в базе:', count);
    
    // Проверяем конкретного пользователя
    console.log('\n3️⃣ Проверка пользователя ID 74...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton')
      .eq('id', 74)
      .single();
      
    if (userError) {
      console.error('❌ Ошибка получения пользователя:', userError);
      return;
    }
    
    console.log('✅ Пользователь найден:', user);
    
    // Тестируем из модуля
    console.log('\n4️⃣ Тест через UserRepository...');
    const { SupabaseUserRepository } = await import('../modules/user/service.js');
    const userRepository = new SupabaseUserRepository();
    
    const repoUser = await userRepository.getUserById(74);
    if (repoUser) {
      console.log('✅ UserRepository.getUserById(74) успешно:', {
        id: repoUser.id,
        username: repoUser.username,
        balance_uni: repoUser.balance_uni,
        balance_ton: repoUser.balance_ton
      });
    } else {
      console.log('❌ UserRepository.getUserById(74) вернул null');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

checkSupabaseConnection();