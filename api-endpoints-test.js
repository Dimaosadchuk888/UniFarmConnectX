/**
 * Автоматизированный тест всех API-эндпоинтов UniFarm
 * 
 * Этот скрипт проверяет работоспособность каждого API-эндпоинта и соответствие его ответов
 * стандартизированному формату { success: true/false, data/error: ... }
 */

require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Базовый URL API
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

// Цветные логи для лучшей читаемости
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Тестовые данные
let testUser = {
  guest_id: `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}`
};

// Объект для хранения результатов тестов
const testResults = {
  endpoints: [],
  totalEndpoints: 0,
  passedEndpoints: 0,
  failedEndpoints: 0,
  standardizedResponses: 0,
  nonStandardizedResponses: 0
};

/**
 * Выполняет API-запрос
 */
async function callApi(endpoint, method = 'GET', body = null) {
  console.log(`${colors.cyan}[API Request] ${method} ${endpoint}${colors.reset}`);
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
      console.log(`${colors.cyan}[Request Body] ${JSON.stringify(body, null, 2)}${colors.reset}`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.log(`${colors.red}[API Response] Non-JSON response (Status: ${response.status}): ${responseText}${colors.reset}`);
      return {
        status: response.status,
        data: null,
        isStandardized: false,
      };
    }
    
    // Проверяем, соответствует ли ответ стандартизированному формату
    const isStandardized = 'success' in data;
    
    console.log(`${colors.cyan}[API Response] Status: ${response.status}, Standardized: ${isStandardized}${colors.reset}`);
    console.log(`${colors.cyan}[Response Body] ${JSON.stringify(data, null, 2)}${colors.reset}`);
    
    return {
      status: response.status,
      data,
      isStandardized,
    };
  } catch (error) {
    console.error(`${colors.red}[API Error] ${error.message}${colors.reset}`);
    return {
      status: 500,
      data: { error: error.message },
      isStandardized: false,
    };
  }
}

/**
 * Регистрирует результат теста
 */
function recordTestResult(endpoint, method, status, isSuccess, isStandardized, notes = '') {
  testResults.endpoints.push({
    endpoint,
    method,
    status,
    isSuccess,
    isStandardized,
    notes
  });
  
  testResults.totalEndpoints++;
  
  if (isSuccess) {
    testResults.passedEndpoints++;
  } else {
    testResults.failedEndpoints++;
  }
  
  if (isStandardized) {
    testResults.standardizedResponses++;
  } else {
    testResults.nonStandardizedResponses++;
  }
}

/**
 * Тестирует каждый API-эндпоинт
 */
async function testAllEndpoints() {
  console.log(`${colors.magenta}====================================${colors.reset}`);
  console.log(`${colors.magenta}Тестирование всех API-эндпоинтов UniFarm${colors.reset}`);
  console.log(`${colors.magenta}====================================${colors.reset}`);
  
  try {
    // Тест #1: Регистрация пользователя (гостя)
    console.log(`\n${colors.green}==== Тест #1: /auth/register-guest ====${colors.reset}`);
    const registerResponse = await callApi('/auth/register-guest', 'POST', { guest_id: testUser.guest_id });
    
    const registerSuccess = registerResponse.status === 200 && 
                            registerResponse.data && 
                            (registerResponse.isStandardized ? registerResponse.data.success : true);
    
    if (registerSuccess) {
      console.log(`${colors.green}✓ Регистрация пользователя успешна${colors.reset}`);
      // Сохраняем данные пользователя для последующих тестов
      if (registerResponse.isStandardized) {
        testUser.id = registerResponse.data.data?.user?.id;
        testUser.ref_code = registerResponse.data.data?.user?.ref_code;
      } else {
        testUser.id = registerResponse.data.user?.id;
        testUser.ref_code = registerResponse.data.user?.ref_code;
      }
    } else {
      console.log(`${colors.red}✘ Регистрация пользователя не удалась${colors.reset}`);
    }
    
    recordTestResult('/auth/register-guest', 'POST', registerResponse.status, registerSuccess, registerResponse.isStandardized);
    
    // Тест #2: Получить данные пользователя
    console.log(`\n${colors.green}==== Тест #2: /users/me ====${colors.reset}`);
    const userResponse = await callApi(`/users/me?user_id=${testUser.id}`, 'GET');
    
    const userSuccess = userResponse.status === 200 && 
                        userResponse.data && 
                        (userResponse.isStandardized ? userResponse.data.success : true);
    
    if (userSuccess) {
      console.log(`${colors.green}✓ Получение данных пользователя успешно${colors.reset}`);
    } else {
      console.log(`${colors.red}✘ Получение данных пользователя не удалось${colors.reset}`);
    }
    
    recordTestResult('/users/me', 'GET', userResponse.status, userSuccess, userResponse.isStandardized);
    
    // Тест #3: Создание депозита в фарминг
    console.log(`\n${colors.green}==== Тест #3: /uni-farming/deposit ====${colors.reset}`);
    const depositResponse = await callApi('/uni-farming/deposit', 'POST', {
      user_id: testUser.id,
      amount: "5"
    });
    
    const depositSuccess = depositResponse.status === 200 && 
                           depositResponse.data && 
                           (depositResponse.isStandardized ? depositResponse.data.success : true);
    
    if (depositSuccess) {
      console.log(`${colors.green}✓ Создание депозита в фарминг успешно${colors.reset}`);
    } else {
      console.log(`${colors.red}✘ Создание депозита в фарминг не удалось${colors.reset}`);
    }
    
    recordTestResult('/uni-farming/deposit', 'POST', depositResponse.status, depositSuccess, depositResponse.isStandardized);
    
    // Тест #4: Получение списка депозитов
    console.log(`\n${colors.green}==== Тест #4: /uni-farming/deposits ====${colors.reset}`);
    const depositsResponse = await callApi(`/uni-farming/deposits?user_id=${testUser.id}`, 'GET');
    
    const depositsSuccess = depositsResponse.status === 200 && 
                            depositsResponse.data && 
                            (depositsResponse.isStandardized ? depositsResponse.data.success : true);
    
    if (depositsSuccess) {
      console.log(`${colors.green}✓ Получение списка депозитов успешно${colors.reset}`);
    } else {
      console.log(`${colors.red}✘ Получение списка депозитов не удалось${colors.reset}`);
    }
    
    recordTestResult('/uni-farming/deposits', 'GET', depositsResponse.status, depositsSuccess, depositsResponse.isStandardized);
    
    // Ожидаем накопления фарминга
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Тест #5: Сбор фарминга
    console.log(`\n${colors.green}==== Тест #5: /uni-farming/harvest ====${colors.reset}`);
    const harvestResponse = await callApi('/uni-farming/harvest', 'POST', {
      user_id: testUser.id
    });
    
    const harvestSuccess = harvestResponse.status === 200 && 
                           harvestResponse.data && 
                           (harvestResponse.isStandardized ? harvestResponse.data.success : true);
    
    if (harvestSuccess) {
      console.log(`${colors.green}✓ Сбор фарминга успешен${colors.reset}`);
    } else {
      console.log(`${colors.red}✘ Сбор фарминга не удался${colors.reset}`);
    }
    
    recordTestResult('/uni-farming/harvest', 'POST', harvestResponse.status, harvestSuccess, harvestResponse.isStandardized);
    
    // Тест #6: Запрос на вывод средств
    console.log(`\n${colors.green}==== Тест #6: /withdraw ====${colors.reset}`);
    const withdrawResponse = await callApi('/withdraw', 'POST', {
      user_id: testUser.id,
      amount: "1",
      currency: "UNI",
      address: "UQExampleTonAddressForTestingPurposesOnly12345"
    });
    
    const withdrawSuccess = withdrawResponse.status === 200 && 
                            withdrawResponse.data && 
                            (withdrawResponse.isStandardized ? withdrawResponse.data.success : true);
    
    if (withdrawSuccess) {
      console.log(`${colors.green}✓ Запрос на вывод средств успешен${colors.reset}`);
    } else {
      console.log(`${colors.red}✘ Запрос на вывод средств не удался${colors.reset}`);
    }
    
    recordTestResult('/withdraw', 'POST', withdrawResponse.status, withdrawSuccess, withdrawResponse.isStandardized);
    
    // Тест #7: Получение истории транзакций
    console.log(`\n${colors.green}==== Тест #7: /transactions ====${colors.reset}`);
    const transactionsResponse = await callApi(`/transactions?user_id=${testUser.id}`, 'GET');
    
    const transactionsSuccess = transactionsResponse.status === 200 && 
                                transactionsResponse.data && 
                                (transactionsResponse.isStandardized ? transactionsResponse.data.success : true);
    
    if (transactionsSuccess) {
      console.log(`${colors.green}✓ Получение истории транзакций успешно${colors.reset}`);
    } else {
      console.log(`${colors.red}✘ Получение истории транзакций не удалось${colors.reset}`);
    }
    
    recordTestResult('/transactions', 'GET', transactionsResponse.status, transactionsSuccess, transactionsResponse.isStandardized);
    
    // Тест #8: Привязка адреса кошелька
    console.log(`\n${colors.green}==== Тест #8: /wallet/link-address ====${colors.reset}`);
    const linkWalletResponse = await callApi('/wallet/link-address', 'POST', {
      user_id: testUser.id,
      wallet_address: "UQExampleTonAddressForTestingPurposesOnly12345"
    });
    
    const linkWalletSuccess = linkWalletResponse.status === 200 && 
                              linkWalletResponse.data && 
                              (linkWalletResponse.isStandardized ? linkWalletResponse.data.success : true);
    
    if (linkWalletSuccess) {
      console.log(`${colors.green}✓ Привязка адреса кошелька успешна${colors.reset}`);
    } else {
      console.log(`${colors.red}✘ Привязка адреса кошелька не удалась${colors.reset}`);
    }
    
    recordTestResult('/wallet/link-address', 'POST', linkWalletResponse.status, linkWalletSuccess, linkWalletResponse.isStandardized);
    
    // Тест #9: Получение адреса кошелька
    console.log(`\n${colors.green}==== Тест #9: /wallet/address ====${colors.reset}`);
    const walletAddressResponse = await callApi(`/wallet/address?user_id=${testUser.id}`, 'GET');
    
    const walletAddressSuccess = walletAddressResponse.status === 200 && 
                                 walletAddressResponse.data && 
                                 (walletAddressResponse.isStandardized ? walletAddressResponse.data.success : true);
    
    if (walletAddressSuccess) {
      console.log(`${colors.green}✓ Получение адреса кошелька успешно${colors.reset}`);
    } else {
      console.log(`${colors.red}✘ Получение адреса кошелька не удалось${colors.reset}`);
    }
    
    recordTestResult('/wallet/address', 'GET', walletAddressResponse.status, walletAddressSuccess, walletAddressResponse.isStandardized);
    
    // Тест #10: Получение реферального дерева
    console.log(`\n${colors.green}==== Тест #10: /referral/tree ====${colors.reset}`);
    const refTreeResponse = await callApi(`/referral/tree?user_id=${testUser.id}`, 'GET');
    
    const refTreeSuccess = refTreeResponse.status === 200 && 
                           refTreeResponse.data && 
                           (refTreeResponse.isStandardized ? refTreeResponse.data.success : true);
    
    if (refTreeSuccess) {
      console.log(`${colors.green}✓ Получение реферального дерева успешно${colors.reset}`);
    } else {
      console.log(`${colors.red}✘ Получение реферального дерева не удалось${colors.reset}`);
    }
    
    recordTestResult('/referral/tree', 'GET', refTreeResponse.status, refTreeSuccess, refTreeResponse.isStandardized);
    
    // Тест #11: Генерация реферальной ссылки
    console.log(`\n${colors.green}==== Тест #11: /referral/link ====${colors.reset}`);
    const refLinkResponse = await callApi('/referral/link', 'POST', {
      ref_code: testUser.ref_code
    });
    
    const refLinkSuccess = refLinkResponse.status === 200 && 
                           refLinkResponse.data && 
                           (refLinkResponse.isStandardized ? refLinkResponse.data.success : true);
    
    if (refLinkSuccess) {
      console.log(`${colors.green}✓ Генерация реферальной ссылки успешна${colors.reset}`);
    } else {
      console.log(`${colors.red}✘ Генерация реферальной ссылки не удалась${colors.reset}`);
    }
    
    recordTestResult('/referral/link', 'POST', refLinkResponse.status, refLinkSuccess, refLinkResponse.isStandardized);
    
    // Формируем итоговый отчет
    generateReport();
    
  } catch (error) {
    console.error(`${colors.red}[Критическая ошибка] ${error.message}${colors.reset}`);
    console.error(error.stack);
  }
}

/**
 * Генерирует отчет о результатах тестирования
 */
function generateReport() {
  console.log(`\n${colors.magenta}====================================${colors.reset}`);
  console.log(`${colors.magenta}Отчет о результатах тестирования API${colors.reset}`);
  console.log(`${colors.magenta}====================================${colors.reset}`);
  
  console.log(`\n${colors.blue}Всего протестировано эндпоинтов: ${testResults.totalEndpoints}${colors.reset}`);
  console.log(`${colors.green}Успешных тестов: ${testResults.passedEndpoints} (${Math.round(testResults.passedEndpoints / testResults.totalEndpoints * 100)}%)${colors.reset}`);
  console.log(`${colors.red}Неуспешных тестов: ${testResults.failedEndpoints} (${Math.round(testResults.failedEndpoints / testResults.totalEndpoints * 100)}%)${colors.reset}`);
  console.log(`${colors.yellow}Стандартизированных ответов: ${testResults.standardizedResponses} (${Math.round(testResults.standardizedResponses / testResults.totalEndpoints * 100)}%)${colors.reset}`);
  console.log(`${colors.yellow}Нестандартизированных ответов: ${testResults.nonStandardizedResponses} (${Math.round(testResults.nonStandardizedResponses / testResults.totalEndpoints * 100)}%)${colors.reset}`);
  
  console.log(`\n${colors.blue}Детали по каждому эндпоинту:${colors.reset}`);
  console.log(`${colors.blue}+------------------------+--------+--------+----------+---------------+${colors.reset}`);
  console.log(`${colors.blue}| Эндпоинт               | Метод  | Статус | Успешно  | Стандартный   |${colors.reset}`);
  console.log(`${colors.blue}+------------------------+--------+--------+----------+---------------+${colors.reset}`);
  
  for (const result of testResults.endpoints) {
    const statusColor = result.status >= 200 && result.status < 300 ? colors.green : colors.red;
    const successColor = result.isSuccess ? colors.green : colors.red;
    const standardizedColor = result.isStandardized ? colors.green : colors.yellow;
    
    console.log(
      `${colors.white}| ${result.endpoint.padEnd(22)} | ${result.method.padEnd(6)} | ` + 
      `${statusColor}${result.status}${colors.white.padEnd(8 - result.status.toString().length)} | ` + 
      `${successColor}${result.isSuccess ? 'Да' : 'Нет'}${colors.white.padEnd(8)} | ` + 
      `${standardizedColor}${result.isStandardized ? 'Да' : 'Нет'}${colors.white.padEnd(13)} |${colors.reset}`
    );
  }
  console.log(`${colors.blue}+------------------------+--------+--------+----------+---------------+${colors.reset}`);
  
  // Записываем результаты в JSON-файл
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalEndpoints: testResults.totalEndpoints,
      passedEndpoints: testResults.passedEndpoints,
      failedEndpoints: testResults.failedEndpoints,
      standardizedResponses: testResults.standardizedResponses,
      nonStandardizedResponses: testResults.nonStandardizedResponses
    },
    endpoints: testResults.endpoints
  };
  
  const reportFile = path.join(__dirname, 'api-test-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
  
  console.log(`\n${colors.green}Отчет сохранен в файл: ${reportFile}${colors.reset}`);
  
  // Анализируем проблемы и даем рекомендации
  provideRecommendations();
}

/**
 * Анализирует проблемы и дает рекомендации по исправлению
 */
function provideRecommendations() {
  console.log(`\n${colors.magenta}====================================${colors.reset}`);
  console.log(`${colors.magenta}Рекомендации по результатам тестов${colors.reset}`);
  console.log(`${colors.magenta}====================================${colors.reset}`);
  
  // Если есть неуспешные тесты
  if (testResults.failedEndpoints > 0) {
    console.log(`\n${colors.yellow}Проблемы в работе API:${colors.reset}`);
    
    const failedEndpoints = testResults.endpoints.filter(e => !e.isSuccess);
    for (const endpoint of failedEndpoints) {
      console.log(`${colors.red}✘ Эндпоинт ${endpoint.method} ${endpoint.endpoint} вернул ошибку (статус ${endpoint.status})${colors.reset}`);
      console.log(`  Необходимо проверить контроллер, обрабатывающий этот эндпоинт, на корректность логики и валидации параметров.`);
    }
  }
  
  // Если есть нестандартизированные ответы
  if (testResults.nonStandardizedResponses > 0) {
    console.log(`\n${colors.yellow}Проблемы со стандартизацией ответов API:${colors.reset}`);
    
    const nonStandardEndpoints = testResults.endpoints.filter(e => !e.isStandardized);
    for (const endpoint of nonStandardEndpoints) {
      console.log(`${colors.yellow}✘ Эндпоинт ${endpoint.method} ${endpoint.endpoint} не использует стандартизированный формат ответа${colors.reset}`);
      console.log(`  Рекомендуется обновить контроллер для использования формата { success: true/false, data/error: ... }`);
    }
  }
  
  // Общие рекомендации
  console.log(`\n${colors.green}Общие рекомендации:${colors.reset}`);
  console.log(`${colors.green}1. Стандартизировать все API-ответы с помощью middleware${colors.reset}`);
  console.log(`${colors.green}2. Улучшить обработку ошибок и валидацию параметров${colors.reset}`);
  console.log(`${colors.green}3. Обеспечить согласованность HTTP-кодов ответа${colors.reset}`);
  console.log(`${colors.green}4. Внедрить механизм идемпотентности для предотвращения дублирования операций${colors.reset}`);
  console.log(`${colors.green}5. Реализовать централизованный механизм логирования API-запросов${colors.reset}`);
}

// Запускаем тестирование всех эндпоинтов
testAllEndpoints();