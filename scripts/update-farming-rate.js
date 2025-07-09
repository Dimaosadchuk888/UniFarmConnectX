#!/usr/bin/env node

/**
 * Скрипт для установки uni_farming_rate пользователю 62
 * Решает проблему отсутствующих начислений фарминга
 */

import fetch from 'node-fetch';

async function updateFarmingRate() {
  console.log('🔧 Обновление uni_farming_rate для пользователя 62...\n');
  
  // Конфигурация
  const API_URL = 'http://localhost:3000/api/v2';
  const USER_ID = 62;
  const FARMING_RATE = '0.01'; // 0.01 UNI в час (1% в день)
  
  // JWT токен для авторизации (можно взять из localStorage браузера)
  const JWT_TOKEN = process.env.JWT_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbUlkIjo4ODg4ODg4OCwidXNlcm5hbWUiOiJ0ZXN0X3VzZXIiLCJmaXJzdE5hbWUiOiJUZXN0IiwicmVmQ29kZSI6IlJFRl8xNzUxOTcxNTYyMTI1X3M2dTFwNyIsImlhdCI6MTc1MjA3MDYzNiwiZXhwIjoxNzUyNjc1NDM2fQ.O0uJJJfwKfV2PYj9aEIDCnSLTHN7JKJCiZgRB4iT5_k';
  
  try {
    // 1. Сначала проверим текущий статус
    console.log('📊 Проверка текущего статуса пользователя...');
    const statusResponse = await fetch(`${API_URL}/farming/status?user_id=${USER_ID}`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('Текущий статус фарминга:');
      console.log(`- Активен: ${statusData.data?.uni_farming_active || false}`);
      console.log(`- Депозит: ${statusData.data?.uni_deposit_amount || 0} UNI`);
      console.log(`- Ставка: ${statusData.data?.uni_farming_rate || 'НЕ УСТАНОВЛЕНА'}`);
      console.log('');
    }
    
    // 2. Обновляем uni_farming_rate
    console.log('🚀 Отправка запроса на обновление...');
    const updateResponse = await fetch(`${API_URL}/users/${USER_ID}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uni_farming_rate: FARMING_RATE
      })
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Ошибка HTTP ${updateResponse.status}: ${errorText}`);
    }
    
    const result = await updateResponse.json();
    console.log('✅ Успешно обновлено!');
    console.log('Результат:', JSON.stringify(result, null, 2));
    
    // 3. Проверяем обновленный статус
    console.log('\n📊 Проверка обновленного статуса...');
    const newStatusResponse = await fetch(`${API_URL}/farming/status?user_id=${USER_ID}`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });
    
    if (newStatusResponse.ok) {
      const newStatusData = await newStatusResponse.json();
      console.log('Новый статус фарминга:');
      console.log(`- Активен: ${newStatusData.data?.uni_farming_active || false}`);
      console.log(`- Депозит: ${newStatusData.data?.uni_deposit_amount || 0} UNI`);
      console.log(`- Ставка: ${newStatusData.data?.uni_farming_rate || 'НЕ УСТАНОВЛЕНА'}`);
      
      if (newStatusData.data?.uni_farming_rate === FARMING_RATE) {
        console.log('\n🎉 Ставка успешно установлена!');
        console.log('Планировщик начнет начислять награды в следующем цикле (каждые 5 минут).');
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('\nВозможные причины:');
    console.error('1. Сервер не запущен (проверьте что localhost:3000 доступен)');
    console.error('2. JWT токен истек или недействителен');
    console.error('3. Нет прав доступа для обновления пользователя');
    process.exit(1);
  }
}

// Запуск скрипта
updateFarmingRate();