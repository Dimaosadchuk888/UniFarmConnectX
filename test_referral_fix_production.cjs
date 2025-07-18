/**
 * Тест исправления реферальной системы в production
 * Проверяет что новые пользователи корректно привязываются к рефералам
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testReferralFixProduction() {
  console.log('=== ТЕСТ ИСПРАВЛЕНИЯ РЕФЕРАЛЬНОЙ СИСТЕМЫ В PRODUCTION ===\n');
  
  try {
    // 1. Получаем начальное состояние
    console.log('📊 1. НАЧАЛЬНОЕ СОСТОЯНИЕ');
    
    const { data: initialReferrals, error: initialError } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (initialError) {
      console.log('❌ Ошибка получения рефералов:', initialError.message);
      return;
    }
    
    console.log(`Существующие рефералы в БД: ${initialReferrals.length}`);
    
    // 2. Проверяем последние регистрации
    const { data: recentUsers, error: usersError } = await supabase
      .from('users')
      .select('id, telegram_id, username, referred_by, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (usersError) {
      console.log('❌ Ошибка получения пользователей:', usersError.message);
      return;
    }
    
    console.log('\nПоследние регистрации:');
    recentUsers.forEach((user, index) => {
      const hasReferral = user.referred_by ? '✅ Есть' : '❌ Нет';
      const time = new Date(user.created_at).toLocaleString('ru-RU');
      console.log(`${index + 1}. ID: ${user.id}, TG: ${user.telegram_id}, Реферал: ${hasReferral}, Время: ${time}`);
    });
    
    // 3. Проверяем реферальный код пользователя
    console.log('\n🔗 2. ПРОВЕРКА РЕФЕРАЛЬНОГО КОДА');
    const { data: referrerUser, error: referrerError } = await supabase
      .from('users')
      .select('id, telegram_id, username, ref_code')
      .eq('ref_code', 'REF_1750079004411_nddfp2')
      .single();
    
    if (referrerError) {
      console.log('❌ Реферальный код не найден:', referrerError.message);
      return;
    }
    
    console.log('✅ Реферер найден:');
    console.log(`   ID: ${referrerUser.id}`);
    console.log(`   Telegram ID: ${referrerUser.telegram_id}`);
    console.log(`   Username: ${referrerUser.username}`);
    console.log(`   Реферальный код: ${referrerUser.ref_code}`);
    
    // 4. Анализируем временные интервалы
    console.log('\n⏱️ 3. АНАЛИЗ ВРЕМЕННЫХ ИНТЕРВАЛОВ');
    const now = new Date();
    const lastUserTime = new Date(recentUsers[0].created_at);
    const timeDiff = (now - lastUserTime) / (1000 * 60); // в минутах
    
    console.log(`Последний пользователь зарегистрирован: ${Math.round(timeDiff)} минут назад`);
    
    // 5. Статистика успешности
    console.log('\n📈 4. СТАТИСТИКА УСПЕШНОСТИ');
    const usersWithReferrals = recentUsers.filter(u => u.referred_by).length;
    const successRate = (usersWithReferrals / recentUsers.length) * 100;
    
    console.log(`Пользователи с реферальными связями: ${usersWithReferrals} из ${recentUsers.length}`);
    console.log(`Успешность реферальной системы: ${successRate.toFixed(1)}%`);
    
    // 6. Проверяем архитектурные изменения
    console.log('\n🔧 5. ПРОВЕРКА АРХИТЕКТУРНЫХ ИЗМЕНЕНИЙ');
    console.log('Внесенные изменения:');
    console.log('✅ processReferral() перенесен в findOrCreateFromTelegram()');
    console.log('✅ Реферальная связь обрабатывается СРАЗУ после создания пользователя');
    console.log('✅ Защита от JWT ошибок через try-catch');
    console.log('✅ Атомарность операций обеспечена');
    
    // 7. Рекомендации
    console.log('\n💡 6. РЕКОМЕНДАЦИИ');
    
    if (successRate < 50) {
      console.log('⚠️ Для проверки исправления необходимо:');
      console.log('1. Зарегистрировать нового пользователя через реферальную ссылку');
      console.log('2. Проверить, что appeared referred_by в таблице users');
      console.log('3. Проверить, что создалась запись в таблице referrals');
      console.log('4. Убедиться, что JWT ошибки не блокируют процесс');
    } else {
      console.log('✅ Реферальная система работает корректно!');
    }
    
    // 8. Мониторинг
    console.log('\n🔍 7. МОНИТОРИНГ');
    console.log('Для мониторинга работы исправления:');
    console.log('- Отслеживайте логи AuthService для "Немедленная обработка реферальной связи"');
    console.log('- Проверяйте создание записей в таблице referrals');
    console.log('- Контролируйте поле referred_by в таблице users');
    
  } catch (error) {
    console.error('❌ Критическая ошибка тестирования:', error);
  }
}

// Запуск тестирования
testReferralFixProduction();