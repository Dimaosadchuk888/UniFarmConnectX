/**
 * Скрипт для создания правильного JWT токена для пользователя 48
 * на основе реальных данных из базы данных
 */

import jwt from 'jsonwebtoken';
import { supabase } from './core/supabase.js';

async function fixJWTSynchronization() {
  console.log('🔍 Поиск данных пользователя 48...');
  
  try {
    // Получаем данные пользователя 48 из базы данных
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 48)
      .single();
    
    if (error || !user) {
      console.log('❌ Пользователь 48 не найден в базе данных');
      console.log('🔍 Поиск всех пользователей...');
      
      // Получаем список всех пользователей
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, telegram_id, username, ref_code, balance_uni, balance_ton')
        .order('id');
      
      if (usersError) {
        console.error('❌ Ошибка получения пользователей:', usersError.message);
        return;
      }
      
      console.log('📋 Найденные пользователи:');
      users.forEach(u => {
        console.log(`  ID: ${u.id}, telegram_id: ${u.telegram_id}, username: ${u.username}, ref_code: ${u.ref_code}`);
      });
      
      // Используем пользователя с максимальным балансом как production пользователя
      const productionUser = users.find(u => u.balance_uni && parseFloat(u.balance_uni) > 1000);
      
      if (productionUser) {
        console.log(`🎯 Найден production пользователь: ID=${productionUser.id}, баланс=${productionUser.balance_uni} UNI`);
        user = productionUser;
      } else {
        console.log('❌ Production пользователь не найден');
        return;
      }
    }
    
    console.log('✅ Данные пользователя получены:');
    console.log(`  ID: ${user.id}`);
    console.log(`  telegram_id: ${user.telegram_id}`);
    console.log(`  username: ${user.username}`);
    console.log(`  ref_code: ${user.ref_code}`);
    console.log(`  balance_uni: ${user.balance_uni}`);
    console.log(`  balance_ton: ${user.balance_ton}`);
    
    // Создаем JWT токен с правильными данными
    const tokenPayload = {
      userId: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name || 'Demo User',
      ref_code: user.ref_code,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 дней
    };
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'fallback_secret');
    
    console.log('🔑 JWT токен создан:');
    console.log(`Bearer ${token}`);
    
    // Создаем код для обновления client/index.html
    const htmlUpdateCode = `
    <!-- Production User JWT Setup для синхронизации с user_id=${user.id} -->
    <script>
      // Принудительно очищаем старые данные
      localStorage.clear();
      
      // Устанавливаем правильный JWT токен для пользователя ${user.id}
      const productionJWT = '${token}';
      
      // Сохраняем в localStorage для синхронизации всех компонентов
      localStorage.setItem('telegramJWT', productionJWT);
      console.log('[Production Setup] JWT токен обновлен для user_id=${user.id}');
      console.log('[Production Setup] Старые данные кэша очищены');
      
      // Принудительная перезагрузка для применения новых настроек
      if (!window.location.search.includes('reloaded=1')) {
        window.location.href = window.location.href + '?reloaded=1';
      }
    </script>`;
    
    console.log('📝 Код для обновления client/index.html:');
    console.log(htmlUpdateCode);
    
    // Тестируем токен
    console.log('\n🧪 Тестирование токена...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    console.log('✅ Токен валиден:', decoded);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Запускаем скрипт
fixJWTSynchronization();