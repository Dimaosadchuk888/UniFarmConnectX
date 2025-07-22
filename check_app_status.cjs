/**
 * Проверка статуса приложения перед тестированием
 */

const https = require('https');

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body.length > 200 ? body.substring(0, 200) + '...' : body
        });
      });
    });
    req.on('error', (error) => {
      resolve({ error: error.message });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ error: 'Timeout' });
    });
  });
}

async function checkAppStatus() {
  console.log(`${CYAN}🔍 ПРОВЕРКА СТАТУСА ПРИЛОЖЕНИЯ${RESET}`);
  console.log('='.repeat(50));

  const urls = [
    'https://uni-farm-connect-x-w81846064.replit.app',
    'https://uni-farm-connect-x-w81846064.replit.app/api/health',
    'https://uni-farm-connect-x-w81846064.replit.app/api/v2/status'
  ];

  for (const url of urls) {
    console.log(`\nПроверка: ${url}`);
    const result = await checkUrl(url);
    
    if (result.error) {
      console.log(`   ${RED}❌ Ошибка: ${result.error}${RESET}`);
    } else {
      console.log(`   ${GREEN}✅ HTTP ${result.status}${RESET}`);
      if (result.body) {
        console.log(`   📄 Ответ: ${result.body}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`${CYAN}📋 ЗАКЛЮЧЕНИЕ:${RESET}`);
  console.log('Если приложение не отвечает, запустите его через Replit workflow.');
  console.log('Финальное решение TON депозитов готово к тестированию,');
  console.log('когда приложение будет доступно.');
}

checkAppStatus();