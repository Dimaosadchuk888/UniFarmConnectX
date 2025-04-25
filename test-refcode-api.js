/**
 * Скрипт для тестирования API создания пользователей с ref_code
 * Использует прямое соединение с базой данных для проверки результатов
 */

import fetch from 'node-fetch';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import crypto from 'crypto';

// Настройка WebSocket для Neon DB
neonConfig.webSocketConstructor = ws;

// Генерирует уникальный идентификатор для тестового пользователя
function generateGuestId() {
  return crypto.randomUUID();
}

// Функция для вызова API
async function callApi(endpoint, method = 'GET', data = null) {
  const url = `https://8ac7b219-438d-4a0b-ab0e-d8b58de37c6d-00-8ncue1micrhz.sisko.replit.dev/api${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  console.log(`Вызов API: ${method} ${url}`);
  if (data) {
    console.log(`Данные: ${JSON.stringify(data, null, 2)}`);
  }
  
  try {
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    // Проверяем, вернулся ли JSON или HTML
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      return {
        status: response.status,
        data: null,
        error: 'Ответ не является JSON',
        rawResponse: responseText.substring(0, 200) // Первые 200 символов ответа
      };
    }
    
    return {
      status: response.status,
      data: responseData
    };
  } catch (error) {
    console.error('Ошибка при вызове API:', error.message);
    return {
      status: 0,
      data: null,
      error: error.message
    };
  }
}

// Создает тестового пользователя через API
async function createUserViaApi(userData) {
  return await callApi('/users', 'POST', userData);
}

// Основная функция тестирования
async function testRefCodeApi() {
  console.log('=== Тестирование API создания пользователей с ref_code ===\n');
  
  // Создаем пул соединений с БД для проверки результатов
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // 1. Создаем пользователя без ref_code через API
    const guestId1 = generateGuestId();
    const username1 = `api_test_user_${Date.now().toString().substring(7)}`;
    
    console.log('1. Создаем пользователя через API БЕЗ указания ref_code');
    console.log(`   - guest_id: ${guestId1}`);
    console.log(`   - username: ${username1}`);
    
    const response1 = await createUserViaApi({
      guest_id: guestId1,
      username: username1
    });
    
    if (!response1.data) {
      console.error('\n❌ ОШИБКА: API вернул некорректный ответ:', response1.error || response1.status);
      if (response1.rawResponse) {
        console.error('Начало ответа:', response1.rawResponse);
      }
      return;
    }
    
    console.log('\nОтвет API:', response1.status);
    console.log(JSON.stringify(response1.data, null, 2));
    
    // Проверяем, был ли создан пользователь и сгенерирован ref_code
    if (response1.data && response1.data.ref_code) {
      console.log('\n✅ API успешно сгенерировал ref_code для пользователя');
      console.log(`   Сгенерированный ref_code: ${response1.data.ref_code}`);
      
      // Проверяем через БД, тот ли ref_code сохранен
      const dbCheck1 = await pool.query(
        'SELECT * FROM users WHERE guest_id = $1',
        [guestId1]
      );
      
      if (dbCheck1.rows.length > 0) {
        const dbUser = dbCheck1.rows[0];
        console.log('\n✅ Пользователь найден в базе данных');
        console.log(`   - ID: ${dbUser.id}`);
        console.log(`   - ref_code в БД: ${dbUser.ref_code}`);
        
        if (dbUser.ref_code === response1.data.ref_code) {
          console.log('✅ ref_code в БД совпадает с возвращенным API');
        } else {
          console.error('❌ ОШИБКА: ref_code в БД не совпадает с возвращенным API');
        }
      } else {
        console.error('❌ ОШИБКА: Пользователь не найден в базе данных');
      }
    } else {
      console.error('\n❌ ОШИБКА: API не сгенерировал ref_code для пользователя');
    }
    
    // 2. Создаем пользователя с заданным ref_code через API
    const guestId2 = generateGuestId();
    const username2 = `api_test_user_${Date.now().toString().substring(7)}`;
    const customRefCode = 'apitest' + Date.now().toString().substring(7);
    
    console.log('\n\n2. Создаем пользователя через API С указанием ref_code');
    console.log(`   - guest_id: ${guestId2}`);
    console.log(`   - username: ${username2}`);
    console.log(`   - ref_code: ${customRefCode}`);
    
    const response2 = await createUserViaApi({
      guest_id: guestId2,
      username: username2,
      ref_code: customRefCode
    });
    
    if (!response2.data) {
      console.error('\n❌ ОШИБКА: API вернул некорректный ответ:', response2.error || response2.status);
      if (response2.rawResponse) {
        console.error('Начало ответа:', response2.rawResponse);
      }
      return;
    }
    
    console.log('\nОтвет API:', response2.status);
    console.log(JSON.stringify(response2.data, null, 2));
    
    // Проверяем, был ли создан пользователь с указанным ref_code
    if (response2.data && response2.data.ref_code) {
      console.log('\n✅ API успешно обработал запрос с указанным ref_code');
      console.log(`   Полученный ref_code: ${response2.data.ref_code}`);
      
      if (response2.data.ref_code === customRefCode) {
        console.log('✅ API сохранил указанный ref_code');
      } else {
        console.log('ℹ️ API заменил указанный ref_code на новый');
      }
      
      // Проверяем через БД, что сохранилось
      const dbCheck2 = await pool.query(
        'SELECT * FROM users WHERE guest_id = $1',
        [guestId2]
      );
      
      if (dbCheck2.rows.length > 0) {
        const dbUser = dbCheck2.rows[0];
        console.log('\n✅ Пользователь найден в базе данных');
        console.log(`   - ID: ${dbUser.id}`);
        console.log(`   - ref_code в БД: ${dbUser.ref_code}`);
        
        if (dbUser.ref_code === response2.data.ref_code) {
          console.log('✅ ref_code в БД совпадает с возвращенным API');
        } else {
          console.error('❌ ОШИБКА: ref_code в БД не совпадает с возвращенным API');
        }
      } else {
        console.error('❌ ОШИБКА: Пользователь не найден в базе данных');
      }
    } else {
      console.error('\n❌ ОШИБКА: Проблема с обработкой ref_code в API');
    }
    
    // 3. Создаем пользователя с дублирующимся ref_code
    if (response1.data && response1.data.ref_code) {
      const guestId3 = generateGuestId();
      const username3 = `api_test_user_${Date.now().toString().substring(7)}`;
      const duplicateRefCode = response1.data.ref_code;
      
      console.log('\n\n3. Создаем пользователя с дублирующимся ref_code');
      console.log(`   - guest_id: ${guestId3}`);
      console.log(`   - username: ${username3}`);
      console.log(`   - ref_code: ${duplicateRefCode} (уже использован)`);
      
      const response3 = await createUserViaApi({
        guest_id: guestId3,
        username: username3,
        ref_code: duplicateRefCode
      });
      
      if (!response3.data) {
        console.error('\n❌ ОШИБКА: API вернул некорректный ответ:', response3.error || response3.status);
        if (response3.rawResponse) {
          console.error('Начало ответа:', response3.rawResponse);
        }
        return;
      }
      
      console.log('\nОтвет API:', response3.status);
      console.log(JSON.stringify(response3.data, null, 2));
      
      // Проверяем, как API обработал дублирующийся ref_code
      if (response3.data && response3.data.ref_code) {
        console.log('\n✅ API успешно обработал запрос с дублирующимся ref_code');
        console.log(`   Полученный ref_code: ${response3.data.ref_code}`);
        
        if (response3.data.ref_code === duplicateRefCode) {
          console.error('❌ ОШИБКА: API сохранил дублирующийся ref_code');
        } else {
          console.log('✅ API заменил дублирующийся ref_code на новый уникальный');
        }
        
        // Проверяем через БД
        const dbCheck3 = await pool.query(
          'SELECT * FROM users WHERE guest_id = $1',
          [guestId3]
        );
        
        if (dbCheck3.rows.length > 0) {
          const dbUser = dbCheck3.rows[0];
          console.log('\n✅ Пользователь найден в базе данных');
          console.log(`   - ID: ${dbUser.id}`);
          console.log(`   - ref_code в БД: ${dbUser.ref_code}`);
          
          if (dbUser.ref_code === response3.data.ref_code) {
            console.log('✅ ref_code в БД совпадает с возвращенным API');
          } else {
            console.error('❌ ОШИБКА: ref_code в БД не совпадает с возвращенным API');
          }
          
          if (dbUser.ref_code === duplicateRefCode) {
            console.error('❌ ОШИБКА: В БД сохранен дублирующийся ref_code');
          } else {
            console.log('✅ В БД сохранен новый уникальный ref_code');
          }
        } else {
          console.error('❌ ОШИБКА: Пользователь не найден в базе данных');
        }
      } else {
        console.error('\n❌ ОШИБКА: Проблема с обработкой дублирующегося ref_code в API');
      }
    }
    
    console.log('\n=== Тестирование завершено ===');
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении теста:', error);
  } finally {
    // Закрываем соединение с базой
    await pool.end();
  }
}

// Запускаем тестирование
testRefCodeApi();