/**
 * ПРОВЕРКА ПРАВ ДОСТУПА SUPABASE RLS ДЛЯ ТАБЛИЦЫ REFERRALS
 * Диагностирует проблемы с Row Level Security
 */

console.log('🔒 ПРОВЕРКА SUPABASE RLS PERMISSIONS');
console.log('=====================================\n');

async function checkSupabaseRLSPermissions() {
  console.log('1️⃣ ТЕСТИРОВАНИЕ ПРАВ ЗАПИСИ В ТАБЛИЦУ REFERRALS:');
  console.log('--------------------------------------------------');
  
  // Получаем JWT токен для аутентификации
  const jwt = localStorage.getItem('unifarm_jwt_token');
  console.log(`🔑 JWT Token: ${jwt ? 'НАЙДЕН' : 'НЕ НАЙДЕН'}`);
  
  if (!jwt) {
    console.log('❌ JWT токен не найден - аутентификация невозможна');
    return;
  }
  
  try {
    // Пытаемся создать тестовую запись в referrals через backend API
    console.log('\n2️⃣ ТЕСТИРОВАНИЕ ЧЕРЕЗ BACKEND API:');
    console.log('--------------------------------------------------');
    
    // Создаем тестового пользователя для проверки
    const testData = {
      telegram_id: 888888888,
      username: 'test_rls_user_' + Date.now(),
      first_name: 'RLS Test',
      ref_by: 'TEST_REF_RLS'
    };
    
    console.log('📝 Тестовые данные:', testData);
    
    const response = await fetch('/api/v2/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({
        initData: `user=${JSON.stringify({
          id: testData.telegram_id,
          username: testData.username,
          first_name: testData.first_name
        })}`,
        ref_by: testData.ref_by
      })
    });
    
    console.log(`📊 Ответ сервера: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Успешный ответ:', data);
      
      // Анализируем лог сервера (если доступен через консоль)
      console.log('\n3️⃣ АНАЛИЗ ЛОГОВ СЕРВЕРА:');
      console.log('--------------------------------------------------');
      console.log('📋 Проверьте console/logs на предмет:');
      console.log('   🔍 "[AuthService] НАЧИНАЕТСЯ НЕМЕДЛЕННАЯ ОБРАБОТКА"');
      console.log('   ✅ "[AuthService] ✅ РЕФЕРАЛЬНАЯ СВЯЗЬ УСПЕШНО СОЗДАНА"');
      console.log('   ❌ "[AuthService] ❌ КРИТИЧЕСКАЯ ОШИБКА создания referrals записи"');
      console.log('   🔐 "RLS policy violation" или "insufficient privileges"');
      
    } else {
      const errorData = await response.text();
      console.log('❌ Ошибка сервера:', errorData);
    }
    
    // Проверяем конфигурацию Supabase
    console.log('\n4️⃣ ДИАГНОСТИКА ВОЗМОЖНЫХ ПРОБЛЕМ RLS:');
    console.log('--------------------------------------------------');
    console.log('🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
    console.log('   1. 🚫 Отсутствуют RLS policies для таблицы referrals');
    console.log('   2. 🔐 Policy блокирует INSERT операции');
    console.log('   3. 🎭 JWT token не содержит необходимые claims');
    console.log('   4. 🔄 Неправильный user_id в policy условиях');
    
    console.log('\n🛠️ РЕКОМЕНДАЦИИ:');
    console.log('   1. ✅ Проверить RLS policies в Supabase Dashboard');
    console.log('   2. ✅ Создать policy: ALLOW INSERT for authenticated users');
    console.log('   3. ✅ Проверить JWT payload и user claims');
    console.log('   4. ✅ Временно отключить RLS для тестирования');
    
  } catch (error) {
    console.error('❌ Критическая ошибка проверки RLS:', error);
  }
  
  console.log('\n5️⃣ SQL КОМАНДЫ ДЛЯ ИСПРАВЛЕНИЯ RLS:');
  console.log('--------------------------------------------------');
  console.log('-- Создать базовую policy для INSERT в referrals');
  console.log(`
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Policy для создания реферальных записей
CREATE POLICY "Allow referral creation" ON referrals
  FOR INSERT WITH CHECK (true);

-- Policy для чтения реферальных записей  
CREATE POLICY "Allow referral reading" ON referrals
  FOR SELECT USING (true);

-- Временно отключить RLS для отладки (НЕ для production!)
-- ALTER TABLE referrals DISABLE ROW LEVEL SECURITY;
  `);
}

// Запуск проверки
if (typeof window !== 'undefined') {
  checkSupabaseRLSPermissions();
} else {
  console.log('⚠️ Проверка предназначена для браузера');
}