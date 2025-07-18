/**
 * Тест проверки исправления реферальной системы
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testReferralFix() {
  console.log('\n🧪 ТЕСТ ИСПРАВЛЕНИЯ РЕФЕРАЛЬНОЙ СИСТЕМЫ');
  console.log('='.repeat(50));

  try {
    // 1. Проверяем состояние ДО (для сравнения)
    const { data: beforeUsers } = await supabase
      .from('users')
      .select('id, referred_by, created_at')
      .gte('created_at', '2025-07-18')
      .order('created_at', { ascending: false });

    console.log(`📊 Пользователей с 18 июля ДО исправления: ${beforeUsers?.length || 0}`);
    
    const beforeWithReferrer = beforeUsers?.filter(u => u.referred_by !== null) || [];
    const beforeSuccessRate = beforeUsers?.length > 0 ? (beforeWithReferrer.length / beforeUsers.length * 100).toFixed(1) : 0;
    
    console.log(`📊 Успешность ДО исправления: ${beforeSuccessRate}%`);

    // 2. Инструкции для тестирования
    console.log('\n📋 ИНСТРУКЦИИ ДЛЯ ТЕСТИРОВАНИЯ:');
    console.log('1. Перезапустите сервер для применения изменений');
    console.log('2. Создайте нового тестового пользователя через реферальную ссылку:');
    console.log('   https://t.me/UniFarming_Bot/UniFarm?startapp=REF_1750079004411_nddfp2');
    console.log('3. Проверьте, что в БД появилась запись с referred_by: 25');
    console.log('4. Запустите этот скрипт снова для проверки результата');

    // 3. Мониторинг новых пользователей
    console.log('\n🔍 МОНИТОРИНГ БУДЕТ ОТСЛЕЖИВАТЬ:');
    console.log('- Создание пользователей с referred_by: null (правильно)');
    console.log('- Обновление на referred_by: 25 после processReferral() (цель)');
    console.log('- Рост процента успешности с 37.5% до 95%+');

    return {
      beforeCount: beforeUsers?.length || 0,
      beforeSuccessRate: parseFloat(beforeSuccessRate)
    };

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
    return null;
  }
}

testReferralFix().then((result) => {
  if (result) {
    console.log('\n✅ Базовые метрики зафиксированы');
    console.log(`📊 Исходная успешность: ${result.beforeSuccessRate}%`);
    console.log('🎯 Целевая успешность: 95%+');
  }
}).catch(error => {
  console.error('❌ Ошибка:', error);
});