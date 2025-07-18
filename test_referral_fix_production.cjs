/**
 * ТЕСТ ИСПРАВЛЕННОЙ РЕФЕРАЛЬНОЙ СИСТЕМЫ
 * Проверка работы реферальных связей после исправления
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Симуляция Telegram initData для тестирования
const createTestInitData = (telegramId, username, refCode) => {
  const userData = {
    id: telegramId,
    username: username,
    first_name: username,
    language_code: 'en',
    start_param: refCode
  };
  
  // Простая симуляция initData (в реальности используется HMAC)
  const initData = `user=${encodeURIComponent(JSON.stringify(userData))}&start_param=${refCode}`;
  return initData;
};

async function testReferralFixProduction() {
  console.log('=== ТЕСТ ИСПРАВЛЕННОЙ РЕФЕРАЛЬНОЙ СИСТЕМЫ ===\n');
  
  try {
    // 1. Проверяем статус сервера
    console.log('🔍 1. ПРОВЕРКА СТАТУСА СЕРВЕРА');
    
    try {
      const healthResponse = await fetch('http://localhost:3000/health');
      const healthData = await healthResponse.json();
      console.log('✅ Сервер работает:', healthData.status);
    } catch (error) {
      console.log('❌ Сервер не отвечает:', error.message);
      return;
    }
    
    // 2. Проверяем исходное состояние
    console.log('\n📊 2. ПРОВЕРКА ИСХОДНОГО СОСТОЯНИЯ');
    
    const referrerCode = 'REF_1750079004411_nddfp2';
    const { data: referrer, error: referrerError } = await supabase
      .from('users')
      .select('*')
      .eq('ref_code', referrerCode)
      .single();
    
    if (referrerError) {
      console.log('❌ Реферер не найден:', referrerError.message);
      return;
    }
    
    console.log('✅ Реферер найден:');
    console.log(`   ID: ${referrer.id}`);
    console.log(`   Username: ${referrer.username}`);
    console.log(`   Реферальный код: ${referrer.ref_code}`);
    
    // 3. Считаем текущие рефералы
    const { data: currentReferrals, error: currentReferralsError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', referrer.id);
    
    if (currentReferralsError) {
      console.log('❌ Ошибка получения рефералов:', currentReferralsError.message);
      return;
    }
    
    console.log(`📊 Текущее количество рефералов: ${currentReferrals.length}`);
    
    // 4. Создаем тестовый запрос аутентификации
    console.log('\n🧪 4. ТЕСТ АУТЕНТИФИКАЦИИ С РЕФЕРАЛЬНЫМ КОДОМ');
    
    const testTelegramId = 999999224; // Тестовый ID
    const testUsername = 'TestReferralUser';
    const testInitData = createTestInitData(testTelegramId, testUsername, referrerCode);
    
    console.log('Тестовые данные:');
    console.log(`   Telegram ID: ${testTelegramId}`);
    console.log(`   Username: ${testUsername}`);
    console.log(`   Ref Code: ${referrerCode}`);
    
    // 5. Отправляем запрос на аутентификацию
    try {
      const authResponse = await fetch('http://localhost:3000/api/v2/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initData: testInitData,
          ref_by: referrerCode
        })
      });
      
      const authData = await authResponse.json();
      console.log('\n🔍 5. РЕЗУЛЬТАТ АУТЕНТИФИКАЦИИ:');
      console.log('Статус:', authResponse.status);
      console.log('Ответ:', JSON.stringify(authData, null, 2));
      
      if (authData.success && authData.user) {
        const newUserId = authData.user.id;
        console.log(`✅ Пользователь создан с ID: ${newUserId}`);
        
        // 6. Проверяем, создалась ли реферальная связь
        console.log('\n🔍 6. ПРОВЕРКА РЕФЕРАЛЬНОЙ СВЯЗИ');
        
        // Проверяем поле referred_by
        const { data: createdUser, error: createdUserError } = await supabase
          .from('users')
          .select('*')
          .eq('id', newUserId)
          .single();
        
        if (createdUserError) {
          console.log('❌ Ошибка получения созданного пользователя:', createdUserError.message);
        } else {
          console.log('Данные созданного пользователя:');
          console.log(`   ID: ${createdUser.id}`);
          console.log(`   Telegram ID: ${createdUser.telegram_id}`);
          console.log(`   Username: ${createdUser.username}`);
          console.log(`   Referred by: ${createdUser.referred_by || 'НЕТ'}`);
          
          if (createdUser.referred_by == referrer.id) {
            console.log('✅ Поле referred_by заполнено КОРРЕКТНО');
          } else {
            console.log('❌ Поле referred_by НЕ заполнено или неверно');
          }
        }
        
        // Проверяем запись в referrals
        const { data: referralRecord, error: referralRecordError } = await supabase
          .from('referrals')
          .select('*')
          .eq('user_id', newUserId)
          .single();
        
        if (referralRecordError) {
          console.log('❌ Запись в referrals НЕ НАЙДЕНА:', referralRecordError.message);
        } else {
          console.log('✅ Запись в referrals найдена:');
          console.log(`   User ID: ${referralRecord.user_id}`);
          console.log(`   Referrer ID: ${referralRecord.referrer_id}`);
          console.log(`   Создана: ${new Date(referralRecord.created_at).toLocaleString('ru-RU')}`);
        }
        
        // 7. Считаем новое количество рефералов
        const { data: newReferrals, error: newReferralsError } = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', referrer.id);
        
        if (newReferralsError) {
          console.log('❌ Ошибка получения обновленных рефералов:', newReferralsError.message);
        } else {
          console.log(`📊 Новое количество рефералов: ${newReferrals.length}`);
          console.log(`📈 Изменение: +${newReferrals.length - currentReferrals.length}`);
        }
        
        // 8. Заключение
        console.log('\n🎯 8. ЗАКЛЮЧЕНИЕ ТЕСТА');
        
        const referralWorking = createdUser?.referred_by == referrer.id && referralRecord;
        
        if (referralWorking) {
          console.log('✅ РЕФЕРАЛЬНАЯ СИСТЕМА РАБОТАЕТ КОРРЕКТНО!');
          console.log('✅ Исправление успешно применено');
          console.log('✅ JWT ошибки больше не блокируют создание связей');
        } else {
          console.log('❌ РЕФЕРАЛЬНАЯ СИСТЕМА НЕ РАБОТАЕТ');
          console.log('❌ Требуется дополнительная диагностика');
        }
        
        // 9. Очистка тестовых данных
        console.log('\n🧹 9. ОЧИСТКА ТЕСТОВЫХ ДАННЫХ');
        
        // Удаляем тестового пользователя
        await supabase
          .from('users')
          .delete()
          .eq('id', newUserId);
        
        // Удаляем тестовую реферальную связь
        if (referralRecord) {
          await supabase
            .from('referrals')
            .delete()
            .eq('user_id', newUserId);
        }
        
        console.log('✅ Тестовые данные очищены');
        
      } else {
        console.log('❌ Ошибка аутентификации:', authData.error || 'Неизвестная ошибка');
      }
      
    } catch (error) {
      console.log('❌ Ошибка при отправке запроса аутентификации:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка теста:', error);
  }
}

testReferralFixProduction();