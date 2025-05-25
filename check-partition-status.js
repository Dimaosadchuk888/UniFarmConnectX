/**
 * Скрипт для проверки статуса партиционирования и списка существующих партиций
 * 
 * Позволяет быстро проверить:
 * 1. Включено ли партиционирование таблицы transactions
 * 2. Количество и состояние созданных партиций
 * 3. Логи операций с партициями
 */

const fetch = require('node-fetch');

// URL сервера (по умолчанию локальный)
const BASE_URL = process.env.API_URL || 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app';

// Токен аутентификации для API (если требуется)
const AUTH_TOKEN = process.env.API_TOKEN || '';

/**
 * Выполняет запрос к API
 */
async function callApi(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }
  
  const options = {
    method,
    headers,
  };
  
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }
  
  const url = `${BASE_URL}${endpoint}`;
  console.log(`[API] ${method} ${url}`);
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`[API] Error ${response.status}: ${JSON.stringify(data)}`);
      throw new Error(`API error: ${response.status} ${JSON.stringify(data)}`);
    }
    
    return data;
  } catch (error) {
    console.error(`[API] Request failed: ${error.message}`);
    throw error;
  }
}

/**
 * Проверяет статус партиционирования
 */
async function checkPartitioningStatus() {
  console.log('\n=== Checking partitioning status ===');
  
  try {
    const result = await callApi('/api/system/partitions/status');
    
    if (result.success) {
      const status = result.data.is_partitioned ? 'ENABLED' : 'DISABLED';
      console.log(`Partitioning status: ${status}`);
      
      return result.data.is_partitioned;
    } else {
      console.error(`Failed to check partitioning status: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('Error checking partitioning status:', error.message);
    return false;
  }
}

/**
 * Получает список партиций
 */
async function listPartitions() {
  console.log('\n=== Getting partitions list ===');
  
  try {
    const result = await callApi('/api/system/partitions/list');
    
    if (result.success) {
      const partitions = result.data.partitions;
      console.log(`Found ${partitions.length} partitions`);
      
      // Выводим таблицу партиций
      console.log('\nPartition Name                     | Records Count | Size');
      console.log('-----------------------------------|---------------|-------------');
      
      partitions.forEach(p => {
        const paddedName = p.partition_name.padEnd(35);
        const paddedCount = (p.record_count || '0').toString().padEnd(13);
        const size = p.size || 'unknown';
        
        console.log(`${paddedName} | ${paddedCount} | ${size}`);
      });
      
      // Возвращаем список партиций
      return partitions;
    } else {
      console.error(`Failed to get partitions list: ${result.error}`);
      return [];
    }
  } catch (error) {
    console.error('Error getting partitions list:', error.message);
    return [];
  }
}

/**
 * Получает логи операций с партициями
 */
async function getPartitionLogs() {
  console.log('\n=== Getting partition logs ===');
  
  try {
    const result = await callApi('/api/system/partitions/logs');
    
    if (result.success) {
      const logs = result.data.logs;
      console.log(`Found ${logs.length} log entries`);
      
      // Выводим последние 5 логов операций
      console.log('\nRecent partition operations:');
      logs.slice(0, 5).forEach((log, index) => {
        console.log(`[${index + 1}] ${log.created_at} - ${log.operation_type} - ${log.partition_name} - ${log.status}`);
        if (log.notes) {
          console.log(`    Notes: ${log.notes}`);
        }
      });
      
      return logs;
    } else {
      console.error(`Failed to get partition logs: ${result.error}`);
      return [];
    }
  } catch (error) {
    console.error('Error getting partition logs:', error.message);
    return [];
  }
}

/**
 * Создает партиции на будущие даты
 */
async function createFuturePartitions(days = 5) {
  console.log(`\n=== Creating future partitions (${days} days ahead) ===`);
  
  try {
    const result = await callApi('/api/system/partitions/create-future', 'POST', { days_ahead: days });
    
    if (result.success) {
      console.log(`Successfully created ${result.data.createdCount} partitions`);
      
      if (result.data.errors && result.data.errors.length > 0) {
        console.log('Some partitions were not created:');
        result.data.errors.forEach(error => console.log(`- ${error}`));
      }
      
      return result.data;
    } else {
      console.error(`Failed to create future partitions: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error creating future partitions:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Запускает проверку всех функций партиционирования
 */
async function runFullCheck() {
  console.log('Starting partition status check...');
  
  try {
    // Проверяем статус партиционирования
    const isPartitioned = await checkPartitioningStatus();
    
    if (!isPartitioned) {
      console.warn('\n⚠️ WARNING: Partitioning is not enabled for transactions table');
      console.log('You need to run the appropriate migration before using partitions.');
      return;
    }
    
    // Получаем текущий список партиций
    const partitions = await listPartitions();
    
    // Получаем логи операций с партициями
    const logs = await getPartitionLogs();
    
    // Создаем партиции на будущие даты (если аргумент --create указан)
    if (process.argv.includes('--create')) {
      const daysArg = process.argv.find(arg => arg.startsWith('--days='));
      const days = daysArg ? parseInt(daysArg.split('=')[1]) : 5;
      
      await createFuturePartitions(days);
      
      // Получаем обновленный список партиций после создания новых
      console.log('\nUpdated partitions list after creation:');
      await listPartitions();
    }
    
    console.log('\n✓ Partition check completed successfully');
  } catch (error) {
    console.error('\n❌ Partition check failed:', error.message);
  }
}

// Запускаем проверку
runFullCheck();