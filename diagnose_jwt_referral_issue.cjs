/**
 * ДИАГНОСТИКА JWT И РЕФЕРАЛЬНЫХ ПРОБЛЕМ
 * Глубокий анализ проблемы с User ID 224
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseJWTReferralIssue() {
  console.log('=== ДИАГНОСТИКА JWT И РЕФЕРАЛЬНЫХ ПРОБЛЕМ ===\n');
  
  try {
    // 1. АНАЛИЗ ПРОБЛЕМНОГО ПОЛЬЗОВАТЕЛЯ
    console.log('🔍 1. АНАЛИЗ ПРОБЛЕМНОГО ПОЛЬЗОВАТЕЛЯ ID 224');
    
    const { data: problemUser, error: problemUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 224)
      .single();
    
    if (problemUserError) {
      console.log('❌ Пользователь ID 224 НЕ НАЙДЕН:', problemUserError.message);
      return;
    }
    
    console.log('✅ Пользователь ID 224 найден:');
    console.log(`   Telegram ID: ${problemUser.telegram_id}`);
    console.log(`   Username: ${problemUser.username}`);
    console.log(`   Ref Code: ${problemUser.ref_code}`);
    console.log(`   Referred by: ${problemUser.referred_by || 'НЕТ'}`);
    console.log(`   Время создания: ${new Date(problemUser.created_at).toLocaleString('ru-RU')}`);
    
    // 2. ПРОВЕРКА РЕФЕРАЛЬНОГО КОДА КОТОРЫЙ ДОЛЖЕН БЫЛ ИСПОЛЬЗОВАТЬСЯ
    console.log('\n🔗 2. ПРОВЕРКА РЕФЕРАЛЬНОГО КОДА РЕФЕРЕРА');
    
    const { data: referrerUser, error: referrerError } = await supabase
      .from('users')
      .select('*')
      .eq('ref_code', 'REF_1750079004411_nddfp2')
      .single();
    
    if (referrerError) {
      console.log('❌ Реферер НЕ НАЙДЕН:', referrerError.message);
    } else {
      console.log('✅ Реферер найден:');
      console.log(`   ID: ${referrerUser.id}`);
      console.log(`   Telegram ID: ${referrerUser.telegram_id}`);
      console.log(`   Username: ${referrerUser.username}`);
      console.log(`   Ref Code: ${referrerUser.ref_code}`);
      
      // Проверяем, должна ли была быть создана связь
      console.log('\n🔍 АНАЛИЗ ОЖИДАЕМОЙ СВЯЗИ:');
      console.log(`   Пользователь ${problemUser.id} должен был ссылаться на ${referrerUser.id}`);
      console.log(`   Факт: referred_by = ${problemUser.referred_by || 'НЕТ'}`);
      console.log(`   Ожидалось: referred_by = ${referrerUser.id}`);
      
      if (problemUser.referred_by == referrerUser.id) {
        console.log('✅ Связь в users корректна');
      } else {
        console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Связь в users НЕ СОЗДАНА');
      }
    }
    
    // 3. ПРОВЕРКА ЗАПИСИ В REFERRALS
    console.log('\n🔍 3. ПРОВЕРКА ЗАПИСИ В REFERRALS');
    
    const { data: referralRecord, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', 224)
      .single();
    
    if (referralError) {
      console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Запись в referrals НЕ НАЙДЕНА');
      console.log('   Ошибка:', referralError.message);
    } else {
      console.log('✅ Запись в referrals найдена:');
      console.log(`   User ID: ${referralRecord.user_id}`);
      console.log(`   Referrer ID: ${referralRecord.referrer_id || 'НЕТ'}`);
      console.log(`   Время создания: ${new Date(referralRecord.created_at).toLocaleString('ru-RU')}`);
    }
    
    // 4. АНАЛИЗ АРХИТЕКТУРНОЙ ПРОБЛЕМЫ
    console.log('\n🏗️ 4. АНАЛИЗ АРХИТЕКТУРНОЙ ПРОБЛЕМЫ');
    
    // Проверяем время регистрации - было ли это после нашего исправления?
    const fixTime = new Date('2025-07-18T16:30:00.000Z'); // Время когда мы внесли исправления
    const userCreationTime = new Date(problemUser.created_at);
    
    console.log('Временной анализ:');
    console.log(`   Время исправления: ${fixTime.toLocaleString('ru-RU')}`);
    console.log(`   Время регистрации: ${userCreationTime.toLocaleString('ru-RU')}`);
    console.log(`   Регистрация ПОСЛЕ исправления: ${userCreationTime > fixTime ? 'ДА' : 'НЕТ'}`);
    
    if (userCreationTime > fixTime) {
      console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Пользователь зарегистрирован ПОСЛЕ исправления, но реферальная связь НЕ РАБОТАЕТ');
    } else {
      console.log('ℹ️ Пользователь зарегистрирован ДО исправления, это ожидаемо');
    }
    
    // 5. ПРОВЕРКА ПРОБЛЕМ С ДИНАМИЧЕСКИМ ИМПОРТОМ
    console.log('\n🔍 5. ПРОВЕРКА ПРОБЛЕМ С ДИНАМИЧЕСКИМ ИМПОРТОМ');
    
    console.log('Известные проблемы:');
    console.log('1. Динамический импорт await import() не работает с .ts файлами в production');
    console.log('2. TSX не перехватывает динамические импорты');
    console.log('3. Node.js требует .js расширения для динамического импорта');
    console.log('4. Статический импорт работает, но может создавать циклические зависимости');
    
    // 6. ПРОВЕРКА ЛОГИКИ НАШЕГО ИСПРАВЛЕНИЯ
    console.log('\n🔧 6. ПРОВЕРКА ЛОГИКИ ИСПРАВЛЕНИЯ');
    
    console.log('Внесенные изменения:');
    console.log('✅ processReferral() перенесен в findOrCreateFromTelegram()');
    console.log('✅ Динамический импорт заменен на статический');
    console.log('✅ Обработка происходит СРАЗУ после создания пользователя');
    console.log('✅ Try-catch защита от ошибок');
    
    // 7. ДИАГНОСТИКА СЕРВЕРНОГО СТАТУСА
    console.log('\n🔍 7. ДИАГНОСТИКА СЕРВЕРНОГО СТАТУСА');
    
    try {
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        console.log('✅ Сервер работает');
      } else {
        console.log('❌ Сервер не отвечает');
      }
    } catch (error) {
      console.log('❌ Ошибка подключения к серверу:', error.message);
    }
    
    // 8. РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ
    console.log('\n💡 8. РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ');
    
    console.log('Необходимо:');
    console.log('1. Проверить, что сервер перезапущен с новыми изменениями');
    console.log('2. Убедиться, что статический импорт работает');
    console.log('3. Протестировать с новым пользователем');
    console.log('4. Проверить серверные логи на наличие ошибок');
    console.log('5. Добавить дополнительное логирование для отслеживания');
    
    // 9. ТЕСТОВАЯ ССЫЛКА
    console.log('\n🔗 9. ТЕСТОВАЯ ССЫЛКА');
    console.log('Для проверки исправления:');
    console.log('https://t.me/UniFarming_Bot/UniFarm?startapp=REF_1750079004411_nddfp2');
    
  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error);
  }
}

diagnoseJWTReferralIssue();