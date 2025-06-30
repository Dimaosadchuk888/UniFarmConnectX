#!/usr/bin/env node

// Скрипт для проверки API endpoints которые возвращают 404

const baseUrl = 'http://localhost:3000';
const endpoints = [
  '/api/v2/monitor/health',
  '/api/v2/farming/stats',
  '/api/v2/boost/active',
  '/api/ton-boosts/active',
  '/api/ton-boosts',
  '/api/ton-boosts/check-payment',
  '/api/v2/users/profile',
  '/api/v2/farming/data',
  '/api/v2/boost/packages',
  '/api/v2/boost/user/1'
];

async function checkEndpoints() {
  console.log('Проверка API endpoints на 404 ошибки:\n');
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(baseUrl + endpoint, {
        headers: {
          'Authorization': 'Bearer test',
          'Content-Type': 'application/json'
        }
      });
      
      const status = response.status;
      const statusText = response.statusText;
      
      if (status === 404) {
        console.log(`❌ ${endpoint} - 404 Not Found`);
      } else if (status === 401) {
        console.log(`🔒 ${endpoint} - 401 Unauthorized (нужна авторизация)`);
      } else if (status === 200) {
        console.log(`✅ ${endpoint} - 200 OK`);
      } else {
        console.log(`⚠️  ${endpoint} - ${status} ${statusText}`);
      }
    } catch (error) {
      console.log(`💥 ${endpoint} - Ошибка: ${error.message}`);
    }
  }
}

checkEndpoints();