#!/usr/bin/env tsx

/**
 * ТЕСТИРОВАНИЕ ИСПРАВЛЕНИЯ JWT АВТОРИЗАЦИИ ДЛЯ WITHDRAWAL СИСТЕМЫ
 * Дата: 29 июля 2025
 * 
 * Цель: Проверить, что JWT авторизация теперь работает правильно
 * и возвращает корректные сообщения об ошибках вместо "Network Error"
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api/v2';

console.log('🔍 ТЕСТИРОВАНИЕ ИСПРАВЛЕНИЯ JWT АВТОРИЗАЦИИ');
console.log('='.repeat(60));

async function testJWTAuth() {
  console.log('\n1. Тестирование недействительного JWT токена...');
  
  try {
    const response = await fetch(`${API_BASE}/wallet/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_jwt_token_test'
      },
      body: JSON.stringify({
        amount: '1',
        wallet_address: 'EQTest',
        currency: 'TON'
      })
    });
    
    const data = await response.json() as any;
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    // Проверяем правильность ответа
    if (response.status === 401) {
      console.log('✅ Статус 401 корректный');
      
      if (data.error && data.error.includes('Authentication required') || 
          data.error?.includes('Invalid') || 
          data.error?.includes('JWT token') ||
          data.need_jwt_token === true) {
        console.log('✅ Сообщение об ошибке корректное');
        console.log('✅ ИСПРАВЛЕНИЕ JWT АВТОРИЗАЦИИ РАБОТАЕТ!');
        return true;
      } else {
        console.log('❌ Неправильное сообщение об ошибке');
        return false;
      }
    } else {
      console.log('❌ Неправильный статус ответа');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Ошибка при тестировании:', error);
    return false;
  }
}

async function testWithoutToken() {
  console.log('\n2. Тестирование без JWT токена...');
  
  try {
    const response = await fetch(`${API_BASE}/wallet/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: '1',
        wallet_address: 'EQTest',
        currency: 'TON'
      })
    });
    
    const data = await response.json() as any;
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 401 && data.need_jwt_token) {
      console.log('✅ Правильная обработка отсутствующего токена');
      return true;
    } else {
      console.log('❌ Неправильная обработка отсутствующего токена');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Ошибка при тестировании:', error);
    return false;
  }
}

async function main() {
  const test1 = await testJWTAuth();
  const test2 = await testWithoutToken();
  
  console.log('\n' + '='.repeat(60));
  console.log('РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
  console.log(`Недействительный JWT: ${test1 ? '✅ ПРОЙДЕН' : '❌ ПРОВАЛЕН'}`);
  console.log(`Отсутствующий JWT: ${test2 ? '✅ ПРОЙДЕН' : '❌ ПРОВАЛЕН'}`);
  
  if (test1 && test2) {
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!');
    console.log('✅ JWT авторизация исправлена и работает корректно');
    console.log('✅ Пользователи больше не видят "Network Error"');
    console.log('✅ Система возвращает правильные сообщения об авторизации');
  } else {
    console.log('\n❌ ТЕСТЫ НЕ ПРОЙДЕНЫ');
    console.log('Требуются дополнительные исправления');
  }
}

main().catch(console.error);