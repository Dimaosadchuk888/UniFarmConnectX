/**
 * UniFarm - Комплексная система аудита и тестирования
 * Данный скрипт выполняет проверку всех компонентов UniFarm без изменения постоянных данных
 */

import fetch from 'node-fetch';
import { Pool } from 'pg';
import WebSocket from 'ws';
import fs from 'fs';

// Базовый URL API (используем текущий домен из окружения)
const API_BASE = process.env.API_BASE || 'https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev/api';
// ID тестового пользователя для проверки
const TEST_USER_ID = 34; // Используем существующего пользователя для проверки
// Используем существующий guest_id
const TEST_GUEST_ID = 'b6e4ada3-adac-44cb-b57e-c80e1ce04ce2';

// Подключение к БД для проверки данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Массив для хранения результатов тестирования
const testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  skippedTests: 0,
  details: []
};

// Функция для форматированного вывода
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'info': '[INFO]',
    'success': '[SUCCESS]',
    'error': '[ERROR]',
    'warning': '[WARNING]',
    'skip': '[SKIPPED]'
  }[type] || '[INFO]';
  
  console.log(`${timestamp} ${prefix} ${message}`);
}

// Выполнение API запроса
async function callApi(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    log(`Запрос ${method} ${url}`);
    const response = await fetch(url, options);
    
    // Проверяем тип контента
    const contentType = response.headers.get('content-type') || '';
    
    // Если это не JSON или статус не успешный, возвращаем текст ошибки
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      log(`Получен не JSON ответ: ${text.substring(0, 100)}...`, 'warning');
      return { 
        status: response.status, 
        ok: false, 
        error: {
          message: `Неправильный формат ответа: ${contentType}. Ожидался JSON.`
        }
      };
    }
    
    const data = await response.json();
    return { 
      status: response.status, 
      ok: response.ok, 
      data
    };
  } catch (error) {
    log(`Ошибка при запросе ${url}: ${error.message}`, 'error');
    return { 
      status: 500, 
      ok: false, 
      error: {
        message: error.message
      }
    };
  }
}

// Выполнение SQL запроса к БД
async function queryDatabase(query, params = []) {
  try {
    log(`Выполнение SQL запроса: ${query.substring(0, 100)}...`);
    const client = await pool.connect();
    const result = await client.query(query, params);
    client.release();
    return { 
      ok: true, 
      rows: result.rows, 
      rowCount: result.rowCount 
    };
  } catch (error) {
    log(`Ошибка SQL запроса: ${error.message}`, 'error');
    return { 
      ok: false, 
      error: error.message 
    };
  }
}

// Тестирование WebSocket соединения
async function testWebSocketConnection() {
  return new Promise((resolve) => {
    try {
      log('Тестирование WebSocket соединения...');
      const wsUrl = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://').replace('/api', '/ws');
      log(`Подключение к WebSocket: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        resolve({
          ok: false,
          error: 'Превышено время ожидания WebSocket соединения'
        });
      }, 5000);
      
      ws.on('open', () => {
        log('WebSocket соединение установлено', 'success');
        clearTimeout(timeout);
        
        // Отправляем ping для проверки
        ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
        
        // Закрываем через 2 секунды
        setTimeout(() => {
          ws.close();
          resolve({ 
            ok: true, 
            message: 'WebSocket соединение работает корректно' 
          });
        }, 2000);
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        log(`Получено WebSocket сообщение: ${JSON.stringify(message)}`);
      });
      
      ws.on('error', (error) => {
        log(`Ошибка WebSocket: ${error.message}`, 'error');
        clearTimeout(timeout);
        ws.close();
        resolve({ 
          ok: false, 
          error: error.message 
        });
      });
    } catch (error) {
      log(`Ошибка создания WebSocket: ${error.message}`, 'error');
      resolve({ 
        ok: false, 
        error: error.message 
      });
    }
  });
}

// Проверка системы восстановления сессии
async function testSessionRestore() {
  try {
    log('Тестирование восстановления сессии...');
    
    const response = await callApi('/session/restore', 'POST', { guest_id: TEST_GUEST_ID });
    
    if (response.ok && response.data.success) {
      log('Сессия успешно восстановлена', 'success');
      return { 
        ok: true, 
        userId: response.data.data?.user_id || null,
        userData: response.data.data
      };
    } else {
      const errorMessage = response.error?.message || response.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка восстановления сессии: ${errorMessage}`, 'error');
      return { 
        ok: false, 
        error: errorMessage 
      };
    }
  } catch (error) {
    log(`Исключение при восстановлении сессии: ${error.message}`, 'error');
    return { 
      ok: false, 
      error: error.message 
    };
  }
}

// Проверка получения баланса
async function testBalanceFetching(userId) {
  try {
    log(`Тестирование получения баланса для пользователя ${userId}...`);
    
    // Проверяем обычный запрос баланса
    const normalResponse = await callApi(`/wallet/balance?user_id=${userId}`);
    
    if (!normalResponse.ok) {
      const errorMessage = normalResponse.error?.message || normalResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка получения баланса: ${errorMessage}`, 'error');
      return { 
        ok: false, 
        error: errorMessage 
      };
    }
    
    log('Баланс успешно получен', 'success');
    const balance = normalResponse.data.data;
    
    // Проверка данных баланса в БД
    const dbResult = await queryDatabase(
      'SELECT balance_uni, balance_ton FROM users WHERE id = $1',
      [userId]
    );
    
    if (!dbResult.ok || dbResult.rowCount === 0) {
      log('Не удалось проверить баланс в БД', 'warning');
      return { 
        ok: true, 
        balance, 
        warning: 'Не удалось проверить совпадение с БД' 
      };
    }
    
    const dbBalance = dbResult.rows[0];
    const balanceMatch = 
      parseFloat(dbBalance.balance_uni) === parseFloat(balance.uniBalance) &&
      parseFloat(dbBalance.balance_ton) === parseFloat(balance.tonBalance);
    
    if (balanceMatch) {
      log('Баланс API и БД совпадают', 'success');
    } else {
      log('Несоответствие между API и БД данными баланса', 'warning');
    }
    
    return { 
      ok: true, 
      balance,
      dbBalance,
      balanceMatch
    };
  } catch (error) {
    log(`Исключение при проверке баланса: ${error.message}`, 'error');
    return { 
      ok: false, 
      error: error.message 
    };
  }
}

// Проверка форсированного обновления баланса
async function testBalanceForceRefresh(userId) {
  try {
    log(`Тестирование форсированного обновления баланса для пользователя ${userId}...`);
    
    // Тестируем запрос баланса с параметром forceRefresh
    const forceResponse = await callApi(`/wallet/balance?user_id=${userId}&forceRefresh=true`);
    
    if (!forceResponse.ok) {
      const errorMessage = forceResponse.error?.message || forceResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка при форсированном обновлении баланса: ${errorMessage}`, 'error');
      return { 
        ok: false, 
        error: errorMessage 
      };
    }
    
    log('Форсированное обновление баланса выполнено успешно', 'success');
    
    return { 
      ok: true, 
      balance: forceResponse.data.data
    };
  } catch (error) {
    log(`Исключение при форсированном обновлении баланса: ${error.message}`, 'error');
    return { 
      ok: false, 
      error: error.message 
    };
  }
}

// Проверка фарминга
async function testFarming(userId) {
  try {
    log(`Тестирование статуса фарминга для пользователя ${userId}...`);
    
    // Получаем информацию о фарминге
    const farmingResponse = await callApi(`/uni-farming/status?user_id=${userId}`);
    
    if (!farmingResponse.ok) {
      const errorMessage = farmingResponse.error?.message || farmingResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка получения статуса фарминга: ${errorMessage}`, 'error');
      return { 
        ok: false, 
        error: errorMessage 
      };
    }
    
    log('Статус фарминга успешно получен', 'success');
    const farmingStatus = farmingResponse.data.data;
    
    // Проверяем депозиты
    const depositsResponse = await callApi(`/uni-farming/deposits?user_id=${userId}`);
    
    if (!depositsResponse.ok) {
      const errorMessage = depositsResponse.error?.message || depositsResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка получения депозитов: ${errorMessage}`, 'warning');
    } else {
      log(`Получено ${depositsResponse.data.data?.length || 0} депозитов`, 'success');
    }
    
    // Проверяем историю фарминга
    const historyResponse = await callApi(`/uni-farming/history?user_id=${userId}`);
    
    if (!historyResponse.ok) {
      const errorMessage = historyResponse.error?.message || historyResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка получения истории фарминга: ${errorMessage}`, 'warning');
    } else {
      log(`Получено ${historyResponse.data.data?.length || 0} записей истории фарминга`, 'success');
    }
    
    return { 
      ok: true, 
      farmingStatus,
      deposits: depositsResponse.ok ? depositsResponse.data.data : null,
      history: historyResponse.ok ? historyResponse.data.data : null
    };
  } catch (error) {
    log(`Исключение при проверке фарминга: ${error.message}`, 'error');
    return { 
      ok: false, 
      error: error.message 
    };
  }
}

// Проверка типов бустов
async function testBoosts(userId) {
  try {
    log(`Тестирование системы бустов для пользователя ${userId}...`);
    
    // Получаем информацию о бустах
    const boostsResponse = await callApi(`/boosts?user_id=${userId}`);
    
    if (!boostsResponse.ok) {
      log(`Ошибка получения информации о бустах: ${boostsResponse.data.error?.message || 'Неизвестная ошибка'}`, 'error');
      return { 
        ok: false, 
        error: boostsResponse.data.error?.message || 'Неизвестная ошибка' 
      };
    }
    
    const boosts = boostsResponse.data.data;
    log(`Получено ${boosts.length} бустов`, 'success');
    
    // Проверяем разные типы бустов
    const boostTypes = {};
    boosts.forEach(boost => {
      if (!boostTypes[boost.type]) {
        boostTypes[boost.type] = 0;
      }
      boostTypes[boost.type]++;
    });
    
    Object.entries(boostTypes).forEach(([type, count]) => {
      log(`Найдено ${count} бустов типа ${type}`, 'info');
    });
    
    return { 
      ok: true, 
      boosts,
      boostTypes
    };
  } catch (error) {
    log(`Исключение при проверке бустов: ${error.message}`, 'error');
    return { 
      ok: false, 
      error: error.message 
    };
  }
}

// Проверка транзакций
async function testTransactions(userId) {
  try {
    log(`Тестирование транзакций для пользователя ${userId}...`);
    
    // Получаем историю транзакций
    const transactionsResponse = await callApi(`/transactions?user_id=${userId}`);
    
    if (!transactionsResponse.ok) {
      log(`Ошибка получения транзакций: ${transactionsResponse.data.error?.message || 'Неизвестная ошибка'}`, 'error');
      return { 
        ok: false, 
        error: transactionsResponse.data.error?.message || 'Неизвестная ошибка' 
      };
    }
    
    const transactions = transactionsResponse.data.data;
    log(`Получено ${transactions.length} транзакций`, 'success');
    
    // Проверяем последние транзакции в БД
    const dbResult = await queryDatabase(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [userId]
    );
    
    if (!dbResult.ok) {
      log('Не удалось проверить транзакции в БД', 'warning');
      return { 
        ok: true, 
        transactions,
        warning: 'Не удалось проверить совпадение с БД' 
      };
    }
    
    log(`Найдено ${dbResult.rowCount} транзакций в БД`, 'success');
    
    return { 
      ok: true, 
      transactions,
      dbTransactions: dbResult.rows
    };
  } catch (error) {
    log(`Исключение при проверке транзакций: ${error.message}`, 'error');
    return { 
      ok: false, 
      error: error.message 
    };
  }
}

// Проверка реферальной системы
async function testReferralSystem(userId) {
  try {
    log(`Тестирование реферальной системы для пользователя ${userId}...`);
    
    // Получаем информацию о рефералах
    const referralInfoResponse = await callApi(`/referrals/info?user_id=${userId}`);
    
    if (!referralInfoResponse.ok) {
      log(`Ошибка получения информации о рефералах: ${referralInfoResponse.data.error?.message || 'Неизвестная ошибка'}`, 'error');
      return { 
        ok: false, 
        error: referralInfoResponse.data.error?.message || 'Неизвестная ошибка' 
      };
    }
    
    log('Информация о рефералах успешно получена', 'success');
    
    // Получаем реферальное дерево (если доступно)
    const treeResponse = await callApi(`/referrals/tree?user_id=${userId}`);
    
    if (!treeResponse.ok) {
      log(`Ошибка получения реферального дерева: ${treeResponse.data.error?.message || 'Неизвестная ошибка'}`, 'warning');
    } else {
      log('Реферальное дерево успешно получено', 'success');
    }
    
    // Получаем статистику рефералов по уровням
    const levelsResponse = await callApi(`/referrals/levels?user_id=${userId}`);
    
    if (!levelsResponse.ok) {
      log(`Ошибка получения статистики по уровням: ${levelsResponse.data.error?.message || 'Неизвестная ошибка'}`, 'warning');
    } else {
      log('Статистика по уровням успешно получена', 'success');
      
      // Проверяем 20 уровней реферальной системы
      const levels = levelsResponse.data.data;
      const maxLevel = Math.max(...levels.map(level => level.level));
      
      log(`Максимальный обнаруженный уровень: ${maxLevel}`, 'info');
      if (maxLevel >= 20) {
        log('Система поддерживает 20 уровней рефералов', 'success');
      } else {
        log(`Система поддерживает только ${maxLevel} уровней рефералов`, 'warning');
      }
    }
    
    return { 
      ok: true, 
      referralInfo: referralInfoResponse.data.data,
      tree: treeResponse.ok ? treeResponse.data.data : null,
      levels: levelsResponse.ok ? levelsResponse.data.data : null
    };
  } catch (error) {
    log(`Исключение при проверке реферальной системы: ${error.message}`, 'error');
    return { 
      ok: false, 
      error: error.message 
    };
  }
}

// Проверка системы миссий
async function testMissions(userId) {
  try {
    log(`Тестирование системы миссий для пользователя ${userId}...`);
    
    // Получаем доступные миссии
    const missionsResponse = await callApi(`/missions/available?user_id=${userId}`);
    
    if (!missionsResponse.ok) {
      log(`Ошибка получения доступных миссий: ${missionsResponse.data.error?.message || 'Неизвестная ошибка'}`, 'error');
      return { 
        ok: false, 
        error: missionsResponse.data.error?.message || 'Неизвестная ошибка' 
      };
    }
    
    log(`Получено ${missionsResponse.data.data?.length || 0} доступных миссий`, 'success');
    
    // Получаем выполненные миссии
    const completedResponse = await callApi(`/missions/completed?user_id=${userId}`);
    
    if (!completedResponse.ok) {
      log(`Ошибка получения выполненных миссий: ${completedResponse.data.error?.message || 'Неизвестная ошибка'}`, 'warning');
    } else {
      log(`Получено ${completedResponse.data.data?.length || 0} выполненных миссий`, 'success');
    }
    
    return { 
      ok: true, 
      availableMissions: missionsResponse.data.data,
      completedMissions: completedResponse.ok ? completedResponse.data.data : null
    };
  } catch (error) {
    log(`Исключение при проверке системы миссий: ${error.message}`, 'error');
    return { 
      ok: false, 
      error: error.message 
    };
  }
}

// Проверка программ лояльности и бонусов
async function testLoyaltyAndBonuses(userId) {
  try {
    log(`Тестирование программ лояльности и бонусов для пользователя ${userId}...`);
    
    // Получаем информацию о ежедневных бонусах
    const dailyBonusResponse = await callApi(`/daily-bonus/status?user_id=${userId}`);
    
    if (!dailyBonusResponse.ok) {
      log(`Ошибка получения информации о ежедневных бонусах: ${dailyBonusResponse.data.error?.message || 'Неизвестная ошибка'}`, 'warning');
    } else {
      log('Информация о ежедневных бонусах успешно получена', 'success');
    }
    
    // Получаем историю начислений по программе лояльности
    const loyaltyHistoryResponse = await callApi(`/loyalty/history?user_id=${userId}`);
    
    if (!loyaltyHistoryResponse.ok) {
      log(`Ошибка получения истории программы лояльности: ${loyaltyHistoryResponse.data.error?.message || 'Неизвестная ошибка'}`, 'warning');
    } else {
      log(`Получено ${loyaltyHistoryResponse.data.data?.length || 0} записей по программе лояльности`, 'success');
    }
    
    // Получаем доступные акции/активности
    const promotionsResponse = await callApi(`/promotions?user_id=${userId}`);
    
    if (!promotionsResponse.ok) {
      log(`Ошибка получения информации о акциях: ${promotionsResponse.data.error?.message || 'Неизвестная ошибка'}`, 'warning');
    } else {
      log(`Получено ${promotionsResponse.data.data?.length || 0} активных акций/активностей`, 'success');
    }
    
    return { 
      ok: true, 
      dailyBonus: dailyBonusResponse.ok ? dailyBonusResponse.data.data : null,
      loyaltyHistory: loyaltyHistoryResponse.ok ? loyaltyHistoryResponse.data.data : null,
      promotions: promotionsResponse.ok ? promotionsResponse.data.data : null
    };
  } catch (error) {
    log(`Исключение при проверке программ лояльности: ${error.message}`, 'error');
    return { 
      ok: false, 
      error: error.message 
    };
  }
}

// Основная функция тестирования
async function runTests() {
  log('Начало комплексного тестирования UniFarm системы...');
  
  // Проверка восстановления сессии
  const sessionResult = await testSessionRestore();
  testResults.details.push({
    name: 'Восстановление сессии',
    result: sessionResult.ok ? 'PASSED' : 'FAILED',
    details: sessionResult
  });
  
  if (sessionResult.ok) {
    testResults.passedTests++;
  } else {
    testResults.failedTests++;
  }
  testResults.totalTests++;
  
  // Получаем ID пользователя для дальнейших тестов
  const userId = sessionResult.ok ? sessionResult.userId : TEST_USER_ID;
  log(`Используем пользователя ID: ${userId} для тестирования`);
  
  // Проверка WebSocket соединения
  const wsResult = await testWebSocketConnection();
  testResults.details.push({
    name: 'WebSocket соединение',
    result: wsResult.ok ? 'PASSED' : 'FAILED',
    details: wsResult
  });
  
  if (wsResult.ok) {
    testResults.passedTests++;
  } else {
    testResults.failedTests++;
  }
  testResults.totalTests++;
  
  // Тестирование баланса
  const balanceResult = await testBalanceFetching(userId);
  testResults.details.push({
    name: 'Получение баланса',
    result: balanceResult.ok ? 'PASSED' : 'FAILED',
    details: balanceResult
  });
  
  if (balanceResult.ok) {
    testResults.passedTests++;
  } else {
    testResults.failedTests++;
  }
  testResults.totalTests++;
  
  // Тестирование форсированного обновления баланса
  const forceRefreshResult = await testBalanceForceRefresh(userId);
  testResults.details.push({
    name: 'Форсированное обновление баланса',
    result: forceRefreshResult.ok ? 'PASSED' : 'FAILED',
    details: forceRefreshResult
  });
  
  if (forceRefreshResult.ok) {
    testResults.passedTests++;
  } else {
    testResults.failedTests++;
  }
  testResults.totalTests++;
  
  // Тестирование фарминга
  const farmingResult = await testFarming(userId);
  testResults.details.push({
    name: 'Система фарминга',
    result: farmingResult.ok ? 'PASSED' : 'FAILED',
    details: farmingResult
  });
  
  if (farmingResult.ok) {
    testResults.passedTests++;
  } else {
    testResults.failedTests++;
  }
  testResults.totalTests++;
  
  // Тестирование бустов
  const boostsResult = await testBoosts(userId);
  testResults.details.push({
    name: 'Система бустов',
    result: boostsResult.ok ? 'PASSED' : 'FAILED',
    details: boostsResult
  });
  
  if (boostsResult.ok) {
    testResults.passedTests++;
  } else {
    testResults.failedTests++;
  }
  testResults.totalTests++;
  
  // Тестирование транзакций
  const transactionsResult = await testTransactions(userId);
  testResults.details.push({
    name: 'Транзакции',
    result: transactionsResult.ok ? 'PASSED' : 'FAILED',
    details: transactionsResult
  });
  
  if (transactionsResult.ok) {
    testResults.passedTests++;
  } else {
    testResults.failedTests++;
  }
  testResults.totalTests++;
  
  // Тестирование реферальной системы
  const referralResult = await testReferralSystem(userId);
  testResults.details.push({
    name: 'Реферальная система',
    result: referralResult.ok ? 'PASSED' : 'FAILED',
    details: referralResult
  });
  
  if (referralResult.ok) {
    testResults.passedTests++;
  } else {
    testResults.failedTests++;
  }
  testResults.totalTests++;
  
  // Тестирование миссий
  const missionsResult = await testMissions(userId);
  testResults.details.push({
    name: 'Система миссий',
    result: missionsResult.ok ? 'PASSED' : 'FAILED',
    details: missionsResult
  });
  
  if (missionsResult.ok) {
    testResults.passedTests++;
  } else {
    testResults.failedTests++;
  }
  testResults.totalTests++;
  
  // Тестирование программ лояльности и бонусов
  const loyaltyResult = await testLoyaltyAndBonuses(userId);
  testResults.details.push({
    name: 'Программы лояльности и бонусы',
    result: loyaltyResult.ok ? 'PASSED' : 'FAILED',
    details: loyaltyResult
  });
  
  if (loyaltyResult.ok) {
    testResults.passedTests++;
  } else {
    testResults.failedTests++;
  }
  testResults.totalTests++;
  
  // Формируем итоговый отчет
  generateSummaryReport();
}

// Генерация итогового отчета
function generateSummaryReport() {
  log('\n------ ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ ------');
  log(`Всего тестов: ${testResults.totalTests}`);
  log(`Успешно: ${testResults.passedTests}`, 'success');
  log(`Неудачно: ${testResults.failedTests}`, 'error');
  log(`Пропущено: ${testResults.skippedTests}`, 'skip');
  
  log('\nДетальные результаты:');
  testResults.details.forEach((test, index) => {
    const statusIcon = test.result === 'PASSED' ? '✅' : '❌';
    log(`${index + 1}. ${statusIcon} ${test.name}: ${test.result}`);
  });
  
  // Сохраняем отчет в файл
  const reportJson = JSON.stringify(testResults, null, 2);
  fs.writeFileSync('unifarm-test-report.json', reportJson);
  log('\nПолный отчет сохранен в файл: unifarm-test-report.json');
}

// Запуск тестирования
runTests().catch(error => {
  log(`Критическая ошибка при выполнении тестов: ${error.message}`, 'error');
  log(error.stack);
});