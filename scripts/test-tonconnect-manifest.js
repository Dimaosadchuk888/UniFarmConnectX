import fetch from 'node-fetch';

const BASE_URL = 'https://uni-farm-connect-unifarm01010101.replit.app';

async function testTonConnectManifest() {
  console.log('🔍 Детальная проверка TON Connect манифеста...\n');
  
  // 1. Прямой запрос к манифесту
  console.log('1️⃣ Прямой запрос к /tonconnect-manifest.json:');
  try {
    const response = await fetch(`${BASE_URL}/tonconnect-manifest.json`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    console.log(`   Статус: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const text = await response.text();
      console.log(`   Размер ответа: ${text.length} байт`);
      try {
        const json = JSON.parse(text);
        console.log(`   ✅ JSON валидный:`);
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        console.log(`   ❌ Ошибка парсинга JSON:`, e.message);
        console.log(`   Полученный контент:`, text.substring(0, 200));
      }
    } else {
      const text = await response.text();
      console.log(`   ❌ Ошибка ${response.status}:`);
      console.log(`   Тело ответа:`, text.substring(0, 500));
    }
  } catch (error) {
    console.log(`   ❌ Ошибка запроса:`, error.message);
  }
  
  // 2. Проверка через HEAD запрос
  console.log('\n2️⃣ HEAD запрос к манифесту:');
  try {
    const response = await fetch(`${BASE_URL}/tonconnect-manifest.json`, {
      method: 'HEAD'
    });
    console.log(`   Статус: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    console.log(`   Content-Length: ${response.headers.get('content-length')}`);
  } catch (error) {
    console.log(`   ❌ Ошибка:`, error.message);
  }
  
  // 3. Проверка альтернативных путей
  console.log('\n3️⃣ Проверка альтернативных путей:');
  const paths = [
    '/tonconnect-manifest.json',
    '/.well-known/tonconnect-manifest.json',
    '/api/tonconnect-manifest.json',
    '/public/tonconnect-manifest.json'
  ];
  
  for (const path of paths) {
    try {
      const response = await fetch(`${BASE_URL}${path}`, { method: 'HEAD' });
      console.log(`   ${path}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`   ${path}: Ошибка запроса`);
    }
  }
  
  // 4. Проверка статических ресурсов
  console.log('\n4️⃣ Проверка статических ресурсов:');
  const resources = [
    '/assets/unifarm-icon.svg',
    '/test-ton-connect.html',
    '/health'
  ];
  
  for (const resource of resources) {
    try {
      const response = await fetch(`${BASE_URL}${resource}`, { method: 'HEAD' });
      console.log(`   ${resource}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`   ${resource}: Ошибка запроса`);
    }
  }
}

testTonConnectManifest().catch(console.error);