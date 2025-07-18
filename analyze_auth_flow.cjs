/**
 * Анализ потока аутентификации для выявления проблем с JWT и рефералами
 * Проверяем порядок операций и возможные прерывания
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeAuthenticationFlow() {
  console.log('=== АНАЛИЗ ПОТОКА АУТЕНТИФИКАЦИИ ===\n');
  
  try {
    // 1. Проверяем архитектуру системы
    console.log('🏗️ 1. АРХИТЕКТУРНЫЙ АНАЛИЗ');
    
    console.log('Поток аутентификации должен быть:');
    console.log('1. Frontend: getReferrerIdFromURL() -> извлечение ref_code');
    console.log('2. Frontend: correctApiRequest() -> JWT проверка/обновление');
    console.log('3. Backend: authenticateFromTelegram() -> создание/поиск пользователя');
    console.log('4. Backend: processReferral() -> создание реферальной связи');
    console.log('5. Backend: JWT generation -> возврат токена');
    
    // 2. Проверяем критические точки сбоя
    console.log('\n⚠️ 2. КРИТИЧЕСКИЕ ТОЧКИ СБОЯ');
    
    // Проверяем последние user_sessions для анализа JWT проблем
    const { data: sessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('user_id, created_at, ip_address, user_agent')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (sessionsError) {
      console.log('❌ Таблица user_sessions недоступна:', sessionsError.message);
    } else {
      console.log(`Последние сессии: ${sessions.length} записей`);
      sessions.forEach((session, index) => {
        const time = new Date(session.created_at).toLocaleString('ru-RU');
        console.log(`${index + 1}. User ${session.user_id} - ${time}`);
      });
    }
    
    // 3. Проверяем timing проблемы
    console.log('\n⏱️ 3. АНАЛИЗ TIMING ПРОБЛЕМ');
    
    // Получаем последние записи из разных таблиц для анализа синхронизации
    const queries = await Promise.all([
      supabase.from('users').select('id, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('referrals').select('referred_user_id, created_at').order('created_at', { ascending: false }).limit(5)
    ]);
    
    const [usersResult, referralsResult] = queries;
    
    console.log('Последние пользователи:');
    if (usersResult.data) {
      usersResult.data.forEach(user => {
        const time = new Date(user.created_at).toLocaleString('ru-RU');
        console.log(`  User ${user.id} - ${time}`);
      });
    }
    
    console.log('Последние реферальные связи:');
    if (referralsResult.data && referralsResult.data.length > 0) {
      referralsResult.data.forEach(ref => {
        const time = new Date(ref.created_at).toLocaleString('ru-RU');
        console.log(`  Referral ${ref.referred_user_id} - ${time}`);
      });
    } else {
      console.log('  ❌ НЕТ РЕФЕРАЛЬНЫХ СВЯЗЕЙ!');
    }
    
    // 4. Проверяем корреляцию между JWT ошибками и пропущенными рефералами
    console.log('\n🔍 4. КОРРЕЛЯЦИЯ JWT ОШИБОК И ПРОПУЩЕННЫХ РЕФЕРАЛОВ');
    
    // Анализируем временные интервалы
    if (usersResult.data && usersResult.data.length > 0) {
      const user1Time = new Date(usersResult.data[0].created_at);
      const user2Time = usersResult.data[1] ? new Date(usersResult.data[1].created_at) : null;
      
      if (user2Time) {
        const timeDiff = (user1Time - user2Time) / 1000; // в секундах
        console.log(`Интервал между последними регистрациями: ${timeDiff} секунд`);
        
        if (timeDiff < 60) {
          console.log('⚠️ БЫСТРЫЕ РЕГИСТРАЦИИ: Возможна проблема с JWT кешированием');
        }
      }
    }
    
    // 5. Проверяем состояние JWT токенов
    console.log('\n🔐 5. АНАЛИЗ JWT СОСТОЯНИЯ');
    
    // Проверяем, не связано ли это с проблемами в correctApiRequest
    console.log('Известные проблемы с JWT:');
    console.log('1. correctApiRequest может выбрасывать ошибки авторизации');
    console.log('2. Это может прерывать процесс до вызова processReferral');
    console.log('3. Frontend может показывать уведомление "Ошибка авторизации"');
    console.log('4. Пользователь создается, но referral не обрабатывается');
    
    // 6. Проверяем архитектурные проблемы
    console.log('\n🏗️ 6. АРХИТЕКТУРНЫЕ ПРОБЛЕМЫ');
    
    console.log('Потенциальные проблемы:');
    console.log('1. processReferral() вызывается ПОСЛЕ создания пользователя');
    console.log('2. Если JWT ошибка происходит ДО processReferral, связь не создается');
    console.log('3. Frontend может прерывать процесс при ошибке авторизации');
    console.log('4. Отсутствие атомарности транзакций');
    
    // 7. Проверяем конкретный случай
    console.log('\n🎯 7. АНАЛИЗ КОНКРЕТНОГО СЛУЧАЯ');
    
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, telegram_id, username, referred_by, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (targetError) {
      console.log('❌ Не удалось получить последнего пользователя:', targetError.message);
    } else {
      console.log('Последний зарегистрированный пользователь:');
      console.log(`  ID: ${targetUser.id}`);
      console.log(`  Telegram ID: ${targetUser.telegram_id}`);
      console.log(`  Username: ${targetUser.username}`);
      console.log(`  Referred by: ${targetUser.referred_by || 'НЕТ'}`);
      console.log(`  Время регистрации: ${new Date(targetUser.created_at).toLocaleString('ru-RU')}`);
      
      // Проверяем, есть ли запись в referrals
      const { data: referralRecord, error: referralError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_user_id', targetUser.id)
        .single();
      
      if (referralError) {
        console.log('  ❌ Запись в referrals: ОТСУТСТВУЕТ');
        console.log('  🔍 Это подтверждает проблему с processReferral()');
      } else {
        console.log('  ✅ Запись в referrals: ЕСТЬ');
        console.log(`     Referrer ID: ${referralRecord.referrer_user_id}`);
      }
    }
    
    // 8. Рекомендации
    console.log('\n💡 8. РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ');
    
    console.log('Для решения проблемы необходимо:');
    console.log('1. Проверить, всегда ли вызывается processReferral при наличии ref_code');
    console.log('2. Убедиться, что JWT ошибки не прерывают процесс регистрации');
    console.log('3. Добавить логирование в критические точки');
    console.log('4. Рассмотреть использование транзакций для атомарности');
    console.log('5. Проверить порядок операций в authenticateFromTelegram');
    
  } catch (error) {
    console.error('❌ Критическая ошибка анализа:', error);
  }
}

// Запуск анализа
analyzeAuthenticationFlow();