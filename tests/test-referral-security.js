#!/usr/bin/env node

/**
 * Тест безопасности referral endpoints
 * Проверяет, что все endpoints требуют авторизацию
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api/v2';
const VALID_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbUlkIjoxMjM0NTY3ODksInVzZXJuYW1lIjoidGVzdHVzZXIiLCJyZWZDb2RlIjoiUkVGXzE3NTA5NTI1NzY2MTRfdDkzOHZzIiwiaWF0IjoxNzM2MDA0NzM1LCJleHAiOjE3MzY2MDk1MzV9._3DiLQJvRsBm8XUrRVaI-j_FX4_f7LNVQAEXfHZhcS0';

// Endpoints для проверки
const ENDPOINTS_TO_TEST = [
  '/referral/stats',
  '/referral/debug-stats',
  '/referral/test-routing',
  '/referrals/stats',
  '/referrals/debug-stats',
  '/referrals/test-routing',
  '/referral/levels',
  '/referrals/levels'
];

async function testEndpoint(endpoint, withAuth = false) {
  const headers = withAuth ? {
    'Authorization': `Bearer ${VALID_JWT}`,
    'Content-Type': 'application/json'
  } : {
    'Content-Type': 'application/json'
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, { headers });
    const statusCode = response.status;
    const body = await response.text();
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      parsedBody = body;
    }

    return {
      endpoint,
      withAuth,
      statusCode,
      body: parsedBody
    };
  } catch (error) {
    return {
      endpoint,
      withAuth,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🔐 Тестирование безопасности referral endpoints\n');
  console.log('API Base:', API_BASE);
  console.log('=====================================\n');

  // Тест 1: Проверка без авторизации
  console.log('📋 Тест 1: Запросы БЕЗ токена авторизации');
  console.log('Ожидаемый результат: 401 Unauthorized\n');

  for (const endpoint of ENDPOINTS_TO_TEST) {
    const result = await testEndpoint(endpoint, false);
    const isSecure = result.statusCode === 401 || result.statusCode === 404;
    const icon = isSecure ? '✅' : '❌';
    
    console.log(`${icon} ${endpoint}`);
    console.log(`   Status: ${result.statusCode}`);
    if (result.body && typeof result.body === 'object') {
      console.log(`   Response: ${JSON.stringify(result.body)}`);
    }
    console.log('');
  }

  // Тест 2: Проверка с авторизацией
  console.log('\n📋 Тест 2: Запросы С токеном авторизации');
  console.log('Ожидаемый результат: 200 OK или 404 Not Found\n');

  for (const endpoint of ENDPOINTS_TO_TEST.filter(e => e.includes('/stats') || e.includes('/levels'))) {
    const result = await testEndpoint(endpoint, true);
    const icon = result.statusCode === 200 || result.statusCode === 404 ? '✅' : '❌';
    
    console.log(`${icon} ${endpoint}`);
    console.log(`   Status: ${result.statusCode}`);
    if (result.body && typeof result.body === 'object' && result.statusCode === 200) {
      console.log(`   Has data: ${result.body.success ? 'Yes' : 'No'}`);
    }
    console.log('');
  }

  // Итоговый отчет
  console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ');
  console.log('=====================================');
  
  const unsecuredEndpoints = [];
  for (const endpoint of ENDPOINTS_TO_TEST) {
    const result = await testEndpoint(endpoint, false);
    if (result.statusCode !== 401 && result.statusCode !== 404) {
      unsecuredEndpoints.push(endpoint);
    }
  }

  if (unsecuredEndpoints.length === 0) {
    console.log('✅ Все endpoints защищены!');
    console.log('   Незащищенных endpoints не обнаружено.');
  } else {
    console.log('❌ ВНИМАНИЕ: Обнаружены незащищенные endpoints!');
    unsecuredEndpoints.forEach(endpoint => {
      console.log(`   - ${endpoint}`);
    });
  }

  console.log('\n✅ Тестирование завершено');
}

// Запуск тестов
runTests().catch(console.error);