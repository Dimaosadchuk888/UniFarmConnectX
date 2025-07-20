/**
 * TON Connect Transaction Validation Script
 * Полная проверка корректности приёма транзакций через TON Connect
 * Согласно техническому заданию по устранению ошибок эмуляции
 */

const fs = require('fs');
const path = require('path');

// Цвета для консоли
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`${title}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logSubsection(title) {
  log(`\n📋 ${title}`, 'yellow');
  log('-'.repeat(40), 'yellow');
}

function logCheck(item, status, details = '') {
  const statusIcon = status === 'OK' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
  const statusColor = status === 'OK' ? 'green' : status === 'WARNING' ? 'yellow' : 'red';
  log(`${statusIcon} ${item}`, statusColor);
  if (details) log(`   ${details}`, 'white');
}

// Проверка существования файлов
function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch (error) {
    return false;
  }
}

// Чтение файла
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

// Анализ tonConnectService.ts
function analyzeTonConnectService() {
  logSubsection('1. Формирование транзакции');
  
  const servicePath = 'client/src/services/tonConnectService.ts';
  const serviceContent = readFile(servicePath);
  
  if (!serviceContent) {
    logCheck('tonConnectService.ts файл', 'ERROR', 'Файл не найден');
    return;
  }
  
  // Проверка конверсии amount в нанотоны
  const amountConversionRegex = /Math\.round\(tonAmount \* 1000000000\)\.toString\(\)/;
  if (amountConversionRegex.test(serviceContent)) {
    logCheck('Конверсия amount в нанотоны', 'OK', 'Math.round(tonAmount * 1000000000).toString()');
  } else {
    logCheck('Конверсия amount в нанотоны', 'ERROR', 'Некорректная конверсия в нанотоны');
  }
  
  // Проверка формата адреса получателя
  const addressRegex = /TON_PROJECT_ADDRESS[\s\S]*?'([^']+)'/;
  const addressMatch = serviceContent.match(addressRegex);
  if (addressMatch) {
    const address = addressMatch[1];
    if (address.startsWith('UQ') || address.startsWith('EQ')) {
      logCheck('Формат адреса получателя', 'OK', `User-friendly формат: ${address.substring(0, 10)}...`);
    } else {
      logCheck('Формат адреса получателя', 'WARNING', 'Возможно raw формат');
    }
  } else {
    logCheck('Формат адреса получателя', 'ERROR', 'Адрес не найден');
  }
  
  // Проверка BOC payload
  const bocCreationRegex = /beginCell\(\)[\s\S]*?\.storeUint\(0, 32\)[\s\S]*?\.storeStringTail\(/;
  if (bocCreationRegex.test(serviceContent)) {
    logCheck('BOC payload создание', 'OK', 'beginCell() с опкодом 0 и storeStringTail()');
  } else {
    logCheck('BOC payload создание', 'ERROR', 'Некорректное создание BOC');
  }
  
  // Проверка validUntil
  const validUntilRegex = /validUntil:\s*Math\.floor\(Date\.now\(\)\s*\/\s*1000\)\s*\+\s*(\d+)/;
  const validUntilMatch = serviceContent.match(validUntilRegex);
  if (validUntilMatch) {
    const timeout = parseInt(validUntilMatch[1]);
    if (timeout >= 300 && timeout <= 3600) {
      logCheck('validUntil параметр', 'OK', `${timeout} секунд (${Math.round(timeout/60)} мин)`);
    } else {
      logCheck('validUntil параметр', 'WARNING', `${timeout} сек - рекомендуется 5-30 мин`);
    }
  } else {
    logCheck('validUntil параметр', 'ERROR', 'validUntil не найден');
  }
  
  // Проверка bounce флага
  const bounceRegex = /bounce:\s*(true|false)/;
  if (bounceRegex.test(serviceContent)) {
    const bounceMatch = serviceContent.match(bounceRegex);
    logCheck('bounce флаг', 'OK', `bounce: ${bounceMatch[1]}`);
  } else {
    logCheck('bounce флаг', 'ERROR', 'bounce флаг отсутствует - может вызывать ошибки эмуляции');
  }
  
  // Проверка принудительного отключения проверок
  const forcedBypassRegex = /return true;.*для тестирования/;
  if (forcedBypassRegex.test(serviceContent)) {
    logCheck('Принудительный обход проверок', 'ERROR', 'Найден принудительный return true');
  } else {
    logCheck('Принудительный обход проверок', 'OK', 'Принудительный обход не найден');
  }
}

// Анализ TON Connect манифестов
function analyzeTonConnectManifests() {
  logSubsection('2. TON Connect манифесты');
  
  const mainManifest = 'client/public/tonconnect-manifest.json';
  const wellKnownManifest = 'client/public/.well-known/tonconnect-manifest.json';
  
  [mainManifest, wellKnownManifest].forEach((manifestPath, index) => {
    const manifestContent = readFile(manifestPath);
    if (!manifestContent) {
      logCheck(`Манифест ${index + 1} (${manifestPath})`, 'ERROR', 'Файл не найден');
      return;
    }
    
    try {
      const manifest = JSON.parse(manifestContent);
      
      // Проверка обязательных полей
      const requiredFields = ['url', 'name', 'iconUrl'];
      requiredFields.forEach(field => {
        if (manifest[field]) {
          logCheck(`${field} в манифесте ${index + 1}`, 'OK', manifest[field]);
        } else {
          logCheck(`${field} в манифесте ${index + 1}`, 'ERROR', 'Поле отсутствует');
        }
      });
      
      // Проверка URL на актуальность
      if (manifest.url && manifest.url.includes('replit.app')) {
        logCheck(`URL актуальность манифест ${index + 1}`, 'WARNING', 'Replit URL может измениться при деплое');
      }
      
    } catch (error) {
      logCheck(`Валидность JSON манифест ${index + 1}`, 'ERROR', 'Невалидный JSON');
    }
  });
}

// Анализ структуры транзакции
function analyzeTransactionStructure() {
  logSubsection('3. Структура транзакции');
  
  const servicePath = 'client/src/services/tonConnectService.ts';
  const serviceContent = readFile(servicePath);
  
  if (!serviceContent) {
    logCheck('Файл сервиса', 'ERROR', 'Не удается прочитать файл');
    return;
  }
  
  // Поиск структуры транзакции
  const transactionStructureRegex = /const transaction = \{[\s\S]*?\}/;
  const transactionMatch = serviceContent.match(transactionStructureRegex);
  
  if (transactionMatch) {
    const transactionStr = transactionMatch[0];
    
    // Проверка обязательных полей
    const hasValidUntil = /validUntil:/.test(transactionStr);
    const hasMessages = /messages:/.test(transactionStr);
    const hasAddress = /address:/.test(transactionStr);
    const hasAmount = /amount:/.test(transactionStr);
    
    logCheck('validUntil поле', hasValidUntil ? 'OK' : 'ERROR');
    logCheck('messages массив', hasMessages ? 'OK' : 'ERROR');
    logCheck('address в message', hasAddress ? 'OK' : 'ERROR');
    logCheck('amount в message', hasAmount ? 'OK' : 'ERROR');
    
    // Проверка на лишние поля которые могут мешать эмуляции
    const hasStateInit = /stateInit:/.test(transactionStr);
    if (hasStateInit) {
      logCheck('stateInit поле', 'WARNING', 'Присутствует - может быть лишним');
    } else {
      logCheck('stateInit поле', 'OK', 'Отсутствует');
    }
    
  } else {
    logCheck('Структура транзакции', 'ERROR', 'Не найдена в коде');
  }
}

// Анализ компонента TonDepositCard
function analyzeTonDepositCard() {
  logSubsection('4. Компонент TonDepositCard');
  
  const componentPath = 'client/src/components/wallet/TonDepositCard.tsx';
  const componentContent = readFile(componentPath);
  
  if (!componentContent) {
    logCheck('TonDepositCard.tsx', 'ERROR', 'Файл не найден');
    return;
  }
  
  // Проверка вызова sendTonTransaction
  const sendTransactionRegex = /sendTonTransaction\(\s*tonConnectUI,\s*([^,]+),\s*([^)]+)\)/;
  const sendTransactionMatch = componentContent.match(sendTransactionRegex);
  
  if (sendTransactionMatch) {
    logCheck('Вызов sendTonTransaction', 'OK', 'Найден в handleDeposit');
    
    // Проверка параметров
    const amountParam = sendTransactionMatch[1].trim();
    const commentParam = sendTransactionMatch[2].trim();
    
    logCheck('Параметр amount', 'OK', amountParam);
    logCheck('Параметр comment', 'OK', commentParam);
  } else {
    logCheck('Вызов sendTonTransaction', 'ERROR', 'Не найден');
  }
  
  // Проверка обработки ошибок
  const errorHandlingRegex = /catch\s*\([^)]*\)\s*\{[\s\S]*?showError/;
  if (errorHandlingRegex.test(componentContent)) {
    logCheck('Обработка ошибок', 'OK', 'Найден try-catch с showError');
  } else {
    logCheck('Обработка ошибок', 'WARNING', 'Обработка ошибок может быть неполной');
  }
}

// Анализ App.tsx и TonConnectUIProvider
function analyzeAppStructure() {
  logSubsection('5. Структура приложения');
  
  const appPath = 'client/src/App.tsx';
  const appContent = readFile(appPath);
  
  if (!appContent) {
    logCheck('App.tsx', 'ERROR', 'Файл не найден');
    return;
  }
  
  // Проверка TonConnectUIProvider
  const tonConnectProviderRegex = /<TonConnectUIProvider\s+manifestUrl="([^"]+)"/;
  const providerMatch = appContent.match(tonConnectProviderRegex);
  
  if (providerMatch) {
    const manifestUrl = providerMatch[1];
    logCheck('TonConnectUIProvider', 'OK', `manifestUrl: ${manifestUrl}`);
    
    // Проверка URL манифеста
    if (manifestUrl.includes('replit.app')) {
      logCheck('Manifest URL', 'WARNING', 'Хардкоженный Replit URL');
    } else {
      logCheck('Manifest URL', 'OK', 'Не привязан к Replit');
    }
  } else {
    logCheck('TonConnectUIProvider', 'ERROR', 'Не найден в App.tsx');
  }
  
  // Проверка иерархии провайдеров
  const providerHierarchyRegex = /TonConnectUIProvider[\s\S]*?QueryClientProvider[\s\S]*?ErrorBoundary/;
  if (providerHierarchyRegex.test(appContent)) {
    logCheck('Иерархия провайдеров', 'OK', 'TonConnect → QueryClient → ErrorBoundary');
  } else {
    logCheck('Иерархия провайдеров', 'WARNING', 'Возможно некорректная иерархия');
  }
}

// Проверка переменных окружения
function checkEnvironmentVariables() {
  logSubsection('6. Переменные окружения');
  
  const requiredEnvVars = [
    'VITE_TON_BOOST_RECEIVER_ADDRESS',
    'VITE_APP_URL',
    'TELEGRAM_WEBAPP_URL'
  ];
  
  // Ищем использование переменных в коде
  const servicePath = 'client/src/services/tonConnectService.ts';
  const serviceContent = readFile(servicePath);
  
  if (serviceContent) {
    requiredEnvVars.forEach(envVar => {
      if (serviceContent.includes(envVar)) {
        logCheck(`${envVar}`, 'OK', 'Используется в коде');
      } else {
        logCheck(`${envVar}`, 'WARNING', 'Не найдена в коде');
      }
    });
  }
}

// Поиск потенциальных проблем эмуляции
function findEmulationIssues() {
  logSubsection('7. Потенциальные проблемы эмуляции');
  
  const servicePath = 'client/src/services/tonConnectService.ts';
  const serviceContent = readFile(servicePath);
  
  if (!serviceContent) {
    logCheck('Анализ кода', 'ERROR', 'Не удается прочитать файл сервиса');
    return;
  }
  
  const issues = [];
  
  // Проверка на отсутствие bounce флага
  if (!/bounce:\s*(true|false)/.test(serviceContent)) {
    issues.push('Отсутствует bounce флаг в транзакции');
  }
  
  // Проверка на длинный комментарий
  const commentRegex = /UniFarmBoost:\$\{userId\}:\$\{boostId\}/;
  if (commentRegex.test(serviceContent)) {
    issues.push('Длинный комментарий может превышать лимиты BOC');
  }
  
  // Проверка на принудительный обход
  if (/return true;.*тестирования/.test(serviceContent)) {
    issues.push('Принудительный обход проверок готовности');
  }
  
  // Проверка fallback BOC
  if (/fallbackPayload = 'te6/.test(serviceContent)) {
    issues.push('Хардкоженный fallback BOC может быть некорректным');
  }
  
  if (issues.length === 0) {
    logCheck('Потенциальные проблемы', 'OK', 'Критических проблем не найдено');
  } else {
    issues.forEach(issue => {
      logCheck('Проблема эмуляции', 'WARNING', issue);
    });
  }
}

// Рекомендации по исправлению
function generateRecommendations() {
  logSubsection('8. Рекомендации по исправлению');
  
  log('\n📋 Приоритетные исправления:', 'yellow');
  log('1. Добавить bounce: false в структуру транзакции', 'white');
  log('2. Сократить комментарий до "UniFarm" для уменьшения BOC', 'white');
  log('3. Убрать принудительный return true из isTonPaymentReady()', 'white');
  log('4. Проверить активность адреса получателя через TonAPI', 'white');
  log('5. Заменить хардкоженный fallback BOC на динамический', 'white');
  
  log('\n📋 Дополнительные улучшения:', 'yellow');
  log('6. Добавить валидацию адреса получателя перед отправкой', 'white');
  log('7. Использовать переменные окружения вместо хардкоженных URL', 'white');
  log('8. Добавить более детальную обработку ошибок эмуляции', 'white');
}

// Основная функция
function main() {
  logSection('🔧 TON Connect Transaction Validation Analysis');
  log('Проверка корректности приёма транзакций через TON Connect', 'white');
  log('Цель: устранить предупреждения эмуляции в Tonkeeper/Ton Space\n', 'white');
  
  try {
    analyzeTonConnectService();
    analyzeTonConnectManifests();
    analyzeTransactionStructure();
    analyzeTonDepositCard();
    analyzeAppStructure();
    checkEnvironmentVariables();
    findEmulationIssues();
    generateRecommendations();
    
    logSection('✅ Анализ завершен');
    log('Отчет создан без внесения изменений в код', 'green');
    log('Следующий шаг: обсуждение исправлений с разработчиком', 'green');
    
  } catch (error) {
    log(`❌ Ошибка анализа: ${error.message}`, 'red');
    console.error(error);
  }
}

// Запуск анализа
if (require.main === module) {
  main();
}

module.exports = {
  analyzeTonConnectService,
  analyzeTonConnectManifests,
  analyzeTransactionStructure,
  findEmulationIssues
};