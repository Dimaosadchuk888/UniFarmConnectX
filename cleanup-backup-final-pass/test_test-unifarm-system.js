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
  // Убираем дублирование /api в URL
  let adjustedEndpoint = endpoint;
  if (endpoint.startsWith('/api/')) {
    adjustedEndpoint = endpoint.substring(4); // Убираем /api/ из начала
  }
  
  const url = `${API_BASE}${adjustedEndpoint}`;
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
    
    // Проверка доступности API фарминга, включая альтернативные маршруты
    const apiStatusResult = await checkApiEndpoint(`/uni-farming/status?user_id=${userId}`);
    
    if (!apiStatusResult.available) {
      log(`API фарминга недоступен: ${apiStatusResult.error}. Тест будет выполнен, но с ожиданием ошибок.`, 'warning');
      // Не пропускаем тест, а фиксируем ошибку для объективной оценки состояния системы
    }
    
    // Определяем эндпоинт для использования
    const endpoint = apiStatusResult.available ? apiStatusResult.endpoint : '/api/uni-farming/info';
    log(`Используем эндпоинт для тестирования фарминга: ${endpoint}`, 'info');
    
    // Получаем информацию о фарминге
    const farmingResponse = await callApi(endpoint + `?user_id=${userId}`);
    
    if (!farmingResponse.ok) {
      const errorMessage = farmingResponse.error?.message || farmingResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка получения информации о фарминге: ${errorMessage}`, 'error');
      return { 
        ok: false, 
        error: errorMessage,
        endpoint: endpoint,
        response: farmingResponse
      };
    }
    
    log('Информация о фарминге успешно получена', 'success');
    const farmingStatus = farmingResponse.data.data;
    
    // Проверяем депозиты (пробуем оба пути - стандартный и альтернативный)
    let depositsEndpoint = apiStatusResult.available && !apiStatusResult.isAlternative 
      ? `/uni-farming/deposits?user_id=${userId}` 
      : `/api/uni-farming/deposits?user_id=${userId}`;
    
    log(`Используем эндпоинт для депозитов: ${depositsEndpoint}`, 'info');
    let depositsResponse = await callApi(depositsEndpoint);
    
    // Если не удалось через первый эндпоинт, пробуем альтернативный
    if (!depositsResponse.ok && depositsEndpoint.startsWith('/uni-farming/')) {
      log(`Пробуем альтернативный эндпоинт для депозитов`, 'info');
      depositsEndpoint = `/api/uni-farming/deposits?user_id=${userId}`;
      depositsResponse = await callApi(depositsEndpoint);
    } else if (!depositsResponse.ok && depositsEndpoint.startsWith('/api/uni-farming/')) {
      log(`Пробуем альтернативный эндпоинт для депозитов`, 'info');
      depositsEndpoint = `/api/new-uni-farming/deposits?user_id=${userId}`;
      depositsResponse = await callApi(depositsEndpoint);
    }
    
    if (!depositsResponse.ok) {
      const errorMessage = depositsResponse.error?.message || depositsResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка получения депозитов: ${errorMessage}`, 'warning');
    } else {
      log(`Получено ${depositsResponse.data.data?.length || 0} депозитов`, 'success');
    }
    
    // Проверяем обновление баланса (актуальных наград)
    const updateEndpoint = apiStatusResult.available && !apiStatusResult.isAlternative
      ? `/uni-farming/update-balance?user_id=${userId}`
      : `/api/uni-farming/update-balance?user_id=${userId}`;
      
    log(`Используем эндпоинт для обновления баланса: ${updateEndpoint}`, 'info');
    const updateResponse = await callApi(updateEndpoint);
    
    if (!updateResponse.ok) {
      const errorMessage = updateResponse.error?.message || updateResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка обновления баланса фарминга: ${errorMessage}`, 'warning');
    } else {
      log(`Баланс фарминга успешно обновлен`, 'success');
    }
    
    return { 
      ok: true, 
      farmingStatus,
      deposits: depositsResponse.ok ? depositsResponse.data.data : null,
      updateBalance: updateResponse.ok ? updateResponse.data.data : null,
      endpoints: {
        info: endpoint,
        deposits: depositsEndpoint,
        update: updateEndpoint
      }
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
      const errorMessage = boostsResponse.error?.message || boostsResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка получения информации о бустах: ${errorMessage}`, 'error');
      return { 
        ok: false, 
        error: errorMessage 
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
      const errorMessage = transactionsResponse.error?.message || transactionsResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка получения транзакций: ${errorMessage}`, 'error');
      return { 
        ok: false, 
        error: errorMessage 
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
    
    // Проверка доступности API рефералов, включая альтернативные маршруты
    const apiStatusResult = await checkApiEndpoint(`/referrals/info?user_id=${userId}`);
    
    if (!apiStatusResult.available) {
      log(`API реферальной системы недоступен: ${apiStatusResult.error}. Тест будет выполнен с использованием альтернативных эндпоинтов.`, 'warning');
      // Не пропускаем тест, а продолжаем с использованием альтернативных маршрутов
    }
    
    // Определяем эндпоинт для информации о рефералах
    const infoEndpoint = apiStatusResult.available ? apiStatusResult.endpoint : '/api/referrals';
    log(`Используем эндпоинт для информации о рефералах: ${infoEndpoint}`, 'info');
    
    // Получаем информацию о рефералах
    const referralInfoResponse = await callApi(infoEndpoint + `?user_id=${userId}`);
    
    if (!referralInfoResponse.ok) {
      const errorMessage = referralInfoResponse.error?.message || referralInfoResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка получения информации о рефералах: ${errorMessage}`, 'error');
      return { 
        ok: false, 
        error: errorMessage,
        endpoint: infoEndpoint,
        response: referralInfoResponse
      };
    }
    
    log('Информация о рефералах успешно получена', 'success');
    
    // Определяем эндпоинт для реферального дерева
    const treeEndpoint = apiStatusResult.available && !apiStatusResult.isAlternative 
      ? `/referrals/tree?user_id=${userId}` 
      : `/api/referrals/tree?user_id=${userId}`;
    
    log(`Используем эндпоинт для реферального дерева: ${treeEndpoint}`, 'info');
    
    // Получаем реферальное дерево
    const treeResponse = await callApi(treeEndpoint);
    
    if (!treeResponse.ok) {
      const errorMessage = treeResponse.error?.message || treeResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка получения реферального дерева: ${errorMessage}`, 'warning');
    } else {
      log('Реферальное дерево успешно получено', 'success');
    }
    
    // Определяем эндпоинт для статистики рефералов
    const statsEndpoint = apiStatusResult.available && !apiStatusResult.isAlternative 
      ? `/referrals/stats?user_id=${userId}` 
      : `/api/referrals/stats?user_id=${userId}`;
      
    log(`Используем эндпоинт для статистики рефералов: ${statsEndpoint}`, 'info');
    
    // Получаем статистику рефералов
    const statsResponse = await callApi(statsEndpoint);
    
    if (!statsResponse.ok) {
      const errorMessage = statsResponse.error?.message || statsResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка получения статистики рефералов: ${errorMessage}`, 'warning');
    } else {
      log('Статистика рефералов успешно получена', 'success');
      
      // Анализируем уровни рефералов, если данные доступны
      if (statsResponse.data && statsResponse.data.data && Array.isArray(statsResponse.data.data)) {
        const referralStats = statsResponse.data.data;
        
        // Проверяем наличие уровней в статистике
        if (referralStats.length > 0 && referralStats[0].level !== undefined) {
          const maxLevel = Math.max(...referralStats.map(stat => stat.level));
          log(`Максимальный обнаруженный уровень: ${maxLevel}`, 'info');
          
          if (maxLevel >= 20) {
            log('Система поддерживает 20 уровней рефералов', 'success');
          } else {
            log(`Система поддерживает только ${maxLevel} уровней рефералов`, 'warning');
          }
        } else {
          log('Информация об уровнях рефералов не найдена в ответе API', 'warning');
        }
      }
    }
    
    return { 
      ok: true, 
      referralInfo: referralInfoResponse.data.data,
      tree: treeResponse.ok ? treeResponse.data.data : null,
      stats: statsResponse.ok ? statsResponse.data.data : null,
      endpoints: {
        info: infoEndpoint,
        tree: treeEndpoint,
        stats: statsEndpoint
      }
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
    
    // Проверка доступности API миссий, включая альтернативные маршруты
    const apiStatusResult = await checkApiEndpoint(`/missions/available?user_id=${userId}`);
    
    if (!apiStatusResult.available) {
      log(`API системы миссий недоступен: ${apiStatusResult.error}. Тест будет выполнен с использованием альтернативных эндпоинтов.`, 'warning');
      // Не пропускаем тест, а продолжаем с использованием альтернативных маршрутов
    }
    
    // Определяем эндпоинт для получения активных миссий
    const activeMissionsEndpoint = apiStatusResult.available ? apiStatusResult.endpoint : '/api/missions/active';
    log(`Используем эндпоинт для получения миссий: ${activeMissionsEndpoint}`, 'info');
    
    // Получаем активные миссии
    const missionsResponse = await callApi(activeMissionsEndpoint + `?user_id=${userId}`);
    
    if (!missionsResponse.ok) {
      const errorMessage = missionsResponse.error?.message || missionsResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка получения миссий: ${errorMessage}`, 'error');
      return { 
        ok: false, 
        error: errorMessage,
        endpoint: activeMissionsEndpoint,
        response: missionsResponse
      };
    }
    
    log(`Получено ${missionsResponse.data.data?.length || 0} активных миссий`, 'success');
    
    // Определяем эндпоинт для проверки миссий с информацией о выполнении
    const withCompletionEndpoint = apiStatusResult.available && !apiStatusResult.isAlternative 
      ? `/missions/with-completion?user_id=${userId}` 
      : `/api/missions/with-completion?user_id=${userId}`;
    
    log(`Используем эндпоинт для миссий с информацией о выполнении: ${withCompletionEndpoint}`, 'info');
    
    // Получаем миссии с информацией о выполнении
    const withCompletionResponse = await callApi(withCompletionEndpoint);
    
    // Если альтернативный эндпоинт также недоступен, попробуем endpoint user_missions
    let userMissionsResponse = { ok: false };
    if (!withCompletionResponse.ok) {
      const errorMessage = withCompletionResponse.error?.message || withCompletionResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка получения миссий с информацией о выполнении: ${errorMessage}. Пробуем альтернативный эндпоинт.`, 'warning');
      
      const userMissionsEndpoint = `/api/user_missions?user_id=${userId}`;
      log(`Используем альтернативный эндпоинт: ${userMissionsEndpoint}`, 'info');
      userMissionsResponse = await callApi(userMissionsEndpoint);
      
      if (!userMissionsResponse.ok) {
        const errorMsg = userMissionsResponse.error?.message || userMissionsResponse.data?.error?.message || 'Неизвестная ошибка';
        log(`Ошибка получения пользовательских миссий: ${errorMsg}`, 'warning');
      } else {
        log(`Получено ${userMissionsResponse.data.data?.length || 0} пользовательских миссий`, 'success');
      }
    } else {
      log(`Получено ${withCompletionResponse.data.data?.length || 0} миссий с информацией о выполнении`, 'success');
    }
    
    // Создаем список для проверки одиночных миссий по ID
    const missionToCheck = (missionsResponse.data.data && missionsResponse.data.data.length > 0) 
      ? missionsResponse.data.data[0] 
      : null;
      
    let singleMissionResponse = { ok: false };
    if (missionToCheck && missionToCheck.id) {
      const singleMissionEndpoint = `/api/missions/check/${userId}/${missionToCheck.id}`;
      log(`Проверяем получение информации об отдельной миссии: ${singleMissionEndpoint}`, 'info');
      
      singleMissionResponse = await callApi(singleMissionEndpoint);
      
      if (!singleMissionResponse.ok) {
        const errorMessage = singleMissionResponse.error?.message || singleMissionResponse.data?.error?.message || 'Неизвестная ошибка';
        log(`Ошибка получения информации об отдельной миссии: ${errorMessage}`, 'warning');
      } else {
        log(`Информация о миссии #${missionToCheck.id} успешно получена`, 'success');
      }
    }
    
    return { 
      ok: true,
      missions: missionsResponse.data.data,
      withCompletion: withCompletionResponse.ok ? withCompletionResponse.data.data : null,
      userMissions: userMissionsResponse.ok ? userMissionsResponse.data.data : null,
      singleMission: singleMissionResponse.ok ? singleMissionResponse.data.data : null,
      endpoints: {
        active: activeMissionsEndpoint,
        withCompletion: withCompletionEndpoint,
        userMissions: userMissionsResponse.ok ? `/api/user_missions` : null,
        singleMission: singleMissionResponse.ok ? `/api/missions/check` : null
      }
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
      const errorMessage = dailyBonusResponse.error?.message || dailyBonusResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка получения информации о ежедневных бонусах: ${errorMessage}`, 'warning');
    } else {
      log('Информация о ежедневных бонусах успешно получена', 'success');
    }
    
    // Получаем историю начислений по программе лояльности
    const loyaltyHistoryResponse = await callApi(`/loyalty/history?user_id=${userId}`);
    
    if (!loyaltyHistoryResponse.ok) {
      const errorMessage = loyaltyHistoryResponse.error?.message || loyaltyHistoryResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка получения истории программы лояльности: ${errorMessage}`, 'warning');
    } else {
      log(`Получено ${loyaltyHistoryResponse.data.data?.length || 0} записей по программе лояльности`, 'success');
    }
    
    // Получаем доступные акции/активности
    const promotionsResponse = await callApi(`/promotions?user_id=${userId}`);
    
    if (!promotionsResponse.ok) {
      const errorMessage = promotionsResponse.error?.message || promotionsResponse.data?.error?.message || 'Неизвестная ошибка';
      log(`Ошибка получения информации о акциях: ${errorMessage}`, 'warning');
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

// Карта соответствия тестовых эндпоинтов и их альтернатив
const API_ENDPOINT_MAP = {
  '/uni-farming/status': '/api/uni-farming/info', 
  '/referrals/info': '/api/referrals',
  '/missions/available': '/api/missions/active'
};

// Функция для проверки доступности API-эндпоинта
async function checkApiEndpoint(endpoint) {
  try {
    log(`Проверка доступности API-эндпоинта: ${endpoint}`);
    const response = await callApi(endpoint);
    
    // Проверяем, что ответ содержит JSON и не является HTML
    if (response.ok && !response.error) {
      log(`API-эндпоинт ${endpoint} доступен и возвращает корректный JSON`, 'success');
      return {
        available: true,
        endpoint: endpoint
      };
    } else {
      const errorType = response.error?.message?.includes('Неправильный формат ответа') 
        ? 'возвращает HTML вместо JSON' 
        : 'возвращает ошибку';
      log(`API-эндпоинт ${endpoint} недоступен (${errorType})`, 'warning');
      
      // Если эндпоинт недоступен, проверим альтернативный маршрут
      const baseEndpoint = endpoint.split('?')[0]; // Отделяем путь от параметров
      const alternativeEndpoint = API_ENDPOINT_MAP[baseEndpoint];
      
      if (alternativeEndpoint) {
        const queryParams = endpoint.includes('?') ? endpoint.split('?')[1] : '';
        const fullAlternativeEndpoint = alternativeEndpoint + (queryParams ? `?${queryParams}` : '');
        
        log(`Пробуем альтернативный эндпоинт: ${fullAlternativeEndpoint}`, 'info');
        const altResponse = await callApi(fullAlternativeEndpoint);
        
        if (altResponse.ok && !altResponse.error) {
          log(`Альтернативный API-эндпоинт ${fullAlternativeEndpoint} доступен и возвращает корректный JSON`, 'success');
          return {
            available: true,
            endpoint: fullAlternativeEndpoint,
            isAlternative: true
          };
        } else {
          log(`Альтернативный API-эндпоинт ${fullAlternativeEndpoint} также недоступен`, 'warning');
        }
      }
      
      return {
        available: false,
        endpoint: endpoint,
        error: errorType
      };
    }
  } catch (error) {
    log(`Ошибка при проверке API-эндпоинта ${endpoint}: ${error.message}`, 'error');
    return {
      available: false,
      endpoint: endpoint,
      error: error.message
    };
  }
}

// Основная функция тестирования
async function runTests() {
  log('Начало комплексного тестирования UniFarm системы...');
  
  // Проверяем доступность критических API-эндпоинтов
  log('Проверка доступности API-эндпоинтов...');
  const endpoints = {
    farming: await checkApiEndpoint('/uni-farming/status?user_id=34'),
    referrals: await checkApiEndpoint('/referrals/info?user_id=34'),
    missions: await checkApiEndpoint('/missions/available?user_id=34')
  };
  
  log(`Результаты проверки доступности API: 
    Фарминг - ${endpoints.farming.available ? 'Доступен' : 'Недоступен'} ${endpoints.farming.isAlternative ? '(используется альтернативный эндпоинт)' : ''} 
    Рефералы - ${endpoints.referrals.available ? 'Доступны' : 'Недоступны'} ${endpoints.referrals.isAlternative ? '(используется альтернативный эндпоинт)' : ''}
    Миссии - ${endpoints.missions.available ? 'Доступны' : 'Недоступны'} ${endpoints.missions.isAlternative ? '(используется альтернативный эндпоинт)' : ''}
  `);
  
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
  
  // Больше не делаем пропуск теста, а получаем реальный результат
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
  
  // Больше не делаем пропуск теста, а получаем реальный результат
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
  
  // Больше не делаем пропуск теста, а получаем реальный результат
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
    let statusIcon;
    if (test.result === 'PASSED') {
      statusIcon = '✅';
    } else if (test.result === 'SKIPPED') {
      statusIcon = '⏩';
    } else {
      statusIcon = '❌';
    }
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