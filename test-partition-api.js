/**
 * Тестовый скрипт для проверки API маршрутов партиционирования
 * 
 * Позволяет выполнить все основные методы API:
 * 1. GET /api/partitions - список партиций
 * 2. GET /api/partitions/status - статус партиционирования
 * 3. GET /api/partitions/logs - логи партиционирования
 * 4. POST /api/partitions - создание партиции
 * 5. DELETE /api/partitions/:id - удаление партиции
 */

// Настройка параметров запросов
// const API_HOST = 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app'; // Локальный хост для тестирования
const API_HOST = 'https://uni-farm-connect-x-lukyanenkolawfa.replit.appsisko.replit.dev'; // URL в Replit для тестирования
const ADMIN_USER_ID = 1; // ID пользователя с правами админа

// Импортируем необходимые модули
import fetch from 'node-fetch';

/**
 * Выполняет HTTP запрос к API
 */
async function callApi(endpoint, method = 'GET', body = null) {
  const url = `${API_HOST}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-User-ID': ADMIN_USER_ID.toString(), // Добавляем заголовок для админской авторизации
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`Выполняем ${method} запрос к ${url}`);
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    console.log(`Статус ответа: ${response.status}`);
    console.log('Ответ:', JSON.stringify(data, null, 2));
    
    return { status: response.status, data };
  } catch (error) {
    console.error(`Ошибка при запросе к ${url}:`, error);
    return { status: 500, data: { success: false, error: error.message } };
  }
}

/**
 * Получение статуса партиционирования
 */
async function getPartitioningStatus() {
  console.log('\n=== Получение статуса партиционирования ===');
  return await callApi('/api/partitions/status');
}

/**
 * Получение списка партиций
 */
async function listPartitions() {
  console.log('\n=== Получение списка партиций ===');
  return await callApi('/api/partitions');
}

/**
 * Получение логов партиционирования
 */
async function getPartitionLogs() {
  console.log('\n=== Получение логов партиционирования ===');
  return await callApi('/api/partitions/logs');
}

/**
 * Создание партиции
 */
async function createPartition(date) {
  console.log('\n=== Создание партиции ===');
  return await callApi('/api/partitions', 'POST', { date });
}

/**
 * Удаление партиции
 */
async function dropPartition(partitionId) {
  console.log('\n=== Удаление партиции ===');
  return await callApi(`/api/partitions/${partitionId}`, 'DELETE');
}

/**
 * Запуск всех тестов
 */
async function runAllTests() {
  console.log('Начало тестирования API маршрутов партиционирования...\n');
  
  // Получаем статус партиционирования
  await getPartitioningStatus();
  
  // Получаем список партиций
  await listPartitions();
  
  // Получаем логи партиционирования
  await getPartitionLogs();
  
  // Создаем партицию на завтрашний день
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0]; // Формат YYYY-MM-DD
  await createPartition(tomorrowStr);
  
  // Получаем обновленный список партиций
  const { data: partitionsData } = await listPartitions();
  
  // Если есть партиции, пытаемся удалить последнюю
  if (partitionsData.success && partitionsData.data && partitionsData.data.partitions && partitionsData.data.partitions.length > 0) {
    const lastPartition = partitionsData.data.partitions[partitionsData.data.partitions.length - 1];
    const partitionId = lastPartition.name.replace('transactions_', '');
    
    console.log(`Найдена партиция для удаления: ${lastPartition.name} (ID: ${partitionId})`);
    await dropPartition(partitionId);
  } else {
    console.log('Нет партиций для удаления');
  }
  
  console.log('\nТестирование API маршрутов партиционирования завершено');
}

// Запускаем все тесты
runAllTests();