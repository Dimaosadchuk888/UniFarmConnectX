import fetch from 'node-fetch';

const BASE_URL = 'https://uni-farm-connect-unifarm01010101.replit.app';

async function testTonConnect() {
  console.log('🔍 Тестирование TON Connect манифеста...\n');
  
  // 1. Проверяем доступность манифеста
  console.log('1️⃣ Проверка доступности манифеста:');
  try {
    const manifestUrl = `${BASE_URL}/tonconnect-manifest.json`;
    const response = await fetch(manifestUrl);
    console.log(`   URL: ${manifestUrl}`);
    console.log(`   Статус: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    console.log(`   CORS: ${response.headers.get('access-control-allow-origin') || 'Не установлен'}`);
    
    if (response.ok) {
      const manifest = await response.json();
      console.log(`   ✅ Манифест загружен успешно`);
      console.log(`   Содержимое:`);
      console.log(JSON.stringify(manifest, null, 2));
      
      // Проверяем корректность URL в манифесте
      if (manifest.url !== BASE_URL) {
        console.log(`   ⚠️  URL в манифесте (${manifest.url}) не совпадает с текущим (${BASE_URL})`);
      } else {
        console.log(`   ✅ URL в манифесте корректный`);
      }
    } else {
      console.log(`   ❌ Ошибка загрузки манифеста`);
    }
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
  }
  
  // 2. Проверяем .well-known путь
  console.log('\n2️⃣ Проверка .well-known/tonconnect-manifest.json:');
  try {
    const wellKnownUrl = `${BASE_URL}/.well-known/tonconnect-manifest.json`;
    const response = await fetch(wellKnownUrl);
    console.log(`   URL: ${wellKnownUrl}`);
    console.log(`   Статус: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log(`   ✅ .well-known манифест доступен`);
    } else {
      console.log(`   ⚠️  .well-known манифест недоступен (это нормально)`);
    }
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
  }
  
  // 3. Проверяем favicon
  console.log('\n3️⃣ Проверка favicon (указан в манифесте):');
  try {
    const faviconUrl = `${BASE_URL}/assets/favicon.ico`;
    const response = await fetch(faviconUrl, { method: 'HEAD' });
    console.log(`   URL: ${faviconUrl}`);
    console.log(`   Статус: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log(`   ✅ Favicon доступен`);
    } else {
      console.log(`   ❌ Favicon недоступен`);
    }
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
  }
  
  console.log('\n📊 Резюме:');
  console.log('Если все проверки прошли успешно, TON Connect должен работать корректно.');
  console.log('Если есть ошибки, исправьте их и перезапустите сервер.');
}

testTonConnect().catch(console.error);