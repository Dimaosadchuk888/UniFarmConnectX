const fetch = require('node-fetch');

const JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4NDgsInVzZXJuYW1lIjoicHJldmlld190ZXN0IiwiZmlyc3RfbmFtZSI6IlByZXZpZXciLCJyZWZfY29kZSI6IlJFRl8xNzUxNzgwNTIxOTE4X2UxdjYyZCIsImlhdCI6MTc1MTg3MTA2MywiZXhwIjoxNzUyNDc1ODYzfQ.NKbyJiXtLnGzyr0w-C1oR658X5TzDO6EkKU8Ie5zgE0";
const BASE_URL = "http://localhost:3001/api/v2";

console.log("🔍 ПРОВЕРКА РАБОТОСПОСОБНОСТИ СИСТЕМЫ ПОСЛЕ ОЧИСТКИ");
console.log("=" * 60);

const results = {
  passed: 0,
  failed: 0,
  errors: []
};

async function checkEndpoint(name, url, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok && data.success !== false) {
      console.log(`✅ ${name}: ${response.status} OK`);
      results.passed++;
      return true;
    } else {
      console.log(`❌ ${name}: ${response.status} ${data.error || 'FAIL'}`);
      results.failed++;
      results.errors.push(`${name}: ${data.error || response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    results.failed++;
    results.errors.push(`${name}: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log("\n1️⃣ ПРОВЕРКА ОСНОВНЫХ МОДУЛЕЙ:");
  await checkEndpoint("User Profile", `${BASE_URL}/users/profile`);
  await checkEndpoint("Wallet Balance", `${BASE_URL}/wallet/balance`);
  await checkEndpoint("UNI Farming Status", `${BASE_URL}/uni-farming/status`);
  await checkEndpoint("Referral Stats", `${BASE_URL}/referrals/stats`);
  await checkEndpoint("Missions List", `${BASE_URL}/missions/list`);
  await checkEndpoint("Daily Bonus", `${BASE_URL}/daily-bonus/status`);
  
  console.log("\n2️⃣ ПРОВЕРКА ЗАЩИЩЁННЫХ DEBUG ENDPOINTS:");
  await checkEndpoint("Debug Check User (должен быть 403)", `${BASE_URL}/debug/check-user/62`);
  await checkEndpoint("Debug Decode JWT (должен быть 403)", `${BASE_URL}/debug/decode-jwt`, 'POST', {token: JWT_TOKEN});
  
  console.log("\n3️⃣ ПРОВЕРКА ДОПОЛНИТЕЛЬНЫХ МОДУЛЕЙ:");
  await checkEndpoint("TON Boost Status", `${BASE_URL}/boost/farming-status`);
  await checkEndpoint("Transactions History", `${BASE_URL}/transactions/history`);
  await checkEndpoint("Monitor Health", `${BASE_URL}/monitor/health`);
  
  console.log("\n" + "=" * 60);
  console.log("📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ:");
  console.log(`✅ Успешно: ${results.passed}`);
  console.log(`❌ Ошибок: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log("\n⚠️ ДЕТАЛИ ОШИБОК:");
    results.errors.forEach(err => console.log(`  - ${err}`));
  }
  
  const successRate = (results.passed / (results.passed + results.failed) * 100).toFixed(1);
  console.log(`\n🎯 Готовность системы: ${successRate}%`);
  
  if (successRate >= 80) {
    console.log("✅ Система работает стабильно после очистки!");
  } else {
    console.log("⚠️ Обнаружены проблемы, требуется дополнительная проверка");
  }
}

runTests().catch(console.error);