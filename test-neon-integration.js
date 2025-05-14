#!/usr/bin/env node
/**
 * Скрипт для тестирования интеграции UniFarm с Neon DB
 * 
 * Этот скрипт проверяет основные операции приложения с Neon DB:
 * 1. Подключение к БД и чтение данных
 * 2. Выполнение базовых операций CRUD
 * 3. Проверка работы основных компонентов (пользователи, транзакции, фарминг)
 * 4. Проверка производительности
 */

import fs from 'fs';
import { Pool } from 'pg';
import 'dotenv/config';
import crypto from 'crypto';

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Логирование с цветами
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Загружаем переменные окружения из .env.neon
function loadEnvFromFile() {
  try {
    const envFile = fs.readFileSync('.env.neon', 'utf8');
    const envVars = {};
    
    envFile.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim();
          
          if (key && value) {
            envVars[key] = value;
            process.env[key] = value;
          }
        }
      }
    });
    
    return envVars;
  } catch (error) {
    log(`Ошибка при загрузке .env.neon: ${error.message}`, colors.red);
    return {};
  }
}

// Класс для тестирования
class NeonDBTester {
  constructor() {
    this.pool = null;
    this.testResults = {
      connection: false,
      tables: {},
      users: false,
      transactions: false,
      farming: false,
      performance: {}
    };
  }

  // Инициализация подключения
  async init() {
    log('🚀 Запуск тестов интеграции UniFarm с Neon DB...', colors.blue);
    
    // Загружаем настройки
    loadEnvFromFile();
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL не найден в .env.neon');
    }
    
    // Создаем пул соединений
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 5
    });
    
    // Проверяем подключение
    const result = await this.pool.query('SELECT 1 as connected');
    this.testResults.connection = result.rows[0].connected === 1;
    
    if (this.testResults.connection) {
      log('✅ Подключение к Neon DB успешно установлено', colors.green);
    } else {
      throw new Error('Не удалось подключиться к Neon DB');
    }
  }
  
  // Закрытие соединения
  async close() {
    if (this.pool) {
      await this.pool.end();
      log('👋 Соединение с Neon DB закрыто', colors.yellow);
    }
  }
  
  // Тест 1: Проверка всех таблиц
  async testTables() {
    log('\n🔍 Тест 1: Проверка таблиц...', colors.blue);
    
    // Получаем список таблиц
    const tablesResult = await this.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    // Проверяем наличие ключевых таблиц
    const requiredTables = [
      'users', 
      'transactions', 
      'farming_deposits', 
      'referrals',
      'missions',
      'user_missions',
      'auth_users'
    ];
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      log(`❌ Отсутствуют таблицы: ${missingTables.join(', ')}`, colors.red);
    } else {
      log('✅ Все обязательные таблицы существуют', colors.green);
    }
    
    // Получаем количество записей в каждой таблице
    for (const table of existingTables) {
      try {
        const countResult = await this.pool.query(`SELECT COUNT(*) FROM "${table}"`);
        const count = parseInt(countResult.rows[0].count);
        this.testResults.tables[table] = count;
        
        const status = count > 0 ? colors.green : colors.yellow;
        log(`📊 ${table}: ${count} записей`, status);
      } catch (error) {
        log(`❌ Ошибка при подсчете записей в таблице ${table}: ${error.message}`, colors.red);
        this.testResults.tables[table] = null;
      }
    }
  }
  
  // Тест 2: Проверка пользователей
  async testUsers() {
    log('\n🔍 Тест 2: Проверка работы с пользователями...', colors.blue);
    
    try {
      // Создаем тестового пользователя с уникальным именем
      const testUsername = `test_user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const refCode = crypto.randomBytes(6).toString('hex');
      
      // Вставляем пользователя
      log(`📝 Создание тестового пользователя: ${testUsername}`, colors.cyan);
      const insertResult = await this.pool.query(`
        INSERT INTO users (username, ref_code, balance_uni, balance_ton, created_at)
        VALUES ($1, $2, 100, 10, NOW())
        RETURNING id, username, ref_code
      `, [testUsername, refCode]);
      
      const userId = insertResult.rows[0].id;
      log(`✅ Пользователь создан, ID: ${userId}`, colors.green);
      
      // Обновляем пользователя
      log('📝 Обновление данных пользователя...', colors.cyan);
      await this.pool.query(`
        UPDATE users
        SET balance_uni = balance_uni + 50
        WHERE id = $1
      `, [userId]);
      
      // Проверяем обновление
      const userResult = await this.pool.query(`
        SELECT id, username, ref_code, balance_uni, balance_ton
        FROM users WHERE id = $1
      `, [userId]);
      
      const user = userResult.rows[0];
      if (user && user.balance_uni === 150) {
        log('✅ Обновление баланса пользователя успешно', colors.green);
      } else {
        log('❌ Ошибка при обновлении баланса пользователя', colors.red);
      }
      
      // Удаляем тестового пользователя
      log('🧹 Удаление тестового пользователя...', colors.cyan);
      await this.pool.query('DELETE FROM users WHERE id = $1', [userId]);
      
      const checkDeleted = await this.pool.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (checkDeleted.rowCount === 0) {
        log('✅ Пользователь успешно удален', colors.green);
        this.testResults.users = true;
      } else {
        log('❌ Ошибка при удалении пользователя', colors.red);
      }
    } catch (error) {
      log(`❌ Ошибка при тестировании пользователей: ${error.message}`, colors.red);
      console.error(error);
    }
  }
  
  // Тест 3: Проверка транзакций
  async testTransactions() {
    log('\n🔍 Тест 3: Проверка работы с транзакциями...', colors.blue);
    
    try {
      // Проверяем партиционирование
      log('📊 Проверка партиционирования таблицы transactions...', colors.cyan);
      
      const partitioningCheck = await this.pool.query(`
        SELECT pg_get_partkeydef(c.oid) as partition_key
        FROM pg_class c
        WHERE c.relname = 'transactions'
        AND c.relkind = 'p'
        LIMIT 1
      `);
      
      const isPartitioned = partitioningCheck.rowCount > 0 && partitioningCheck.rows[0]?.partition_key;
      
      if (isPartitioned) {
        log(`✅ Таблица transactions партиционирована по ключу: ${partitioningCheck.rows[0].partition_key}`, colors.green);
        
        // Проверяем партиции
        const partitionsCheck = await this.pool.query(`
          SELECT child.relname AS partition_name
          FROM pg_inherits
          JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
          JOIN pg_class child ON pg_inherits.inhrelid = child.oid
          WHERE parent.relname = 'transactions'
          ORDER BY partition_name
        `);
        
        if (partitionsCheck.rowCount > 0) {
          log(`📋 Найдено ${partitionsCheck.rowCount} партиций:`, colors.cyan);
          partitionsCheck.rows.slice(0, 5).forEach(row => {
            log(`   - ${row.partition_name}`, colors.reset);
          });
          
          if (partitionsCheck.rowCount > 5) {
            log(`   ... и ещё ${partitionsCheck.rowCount - 5} партиций`, colors.reset);
          }
        } else {
          log('⚠️ Таблица transactions партиционирована, но партиции не найдены', colors.yellow);
        }
      } else {
        log('⚠️ Таблица transactions НЕ партиционирована', colors.yellow);
      }
      
      // Создаем тестовую транзакцию (для не-партиционированных таблиц)
      const testUserId = 1; // Используем существующего пользователя
      
      // Проверяем существование пользователя
      const userCheck = await this.pool.query('SELECT id FROM users WHERE id = $1', [testUserId]);
      
      if (userCheck.rowCount === 0) {
        log(`⚠️ Пользователь с ID ${testUserId} не найден, создаем временного пользователя`, colors.yellow);
        
        // Создаем временного пользователя
        const tempUserResult = await this.pool.query(`
          INSERT INTO users (username, ref_code, balance_uni, created_at)
          VALUES ($1, $2, 100, NOW())
          RETURNING id
        `, [`temp_user_${Date.now()}`, `temp_${crypto.randomBytes(4).toString('hex')}`]);
        
        testUserId = tempUserResult.rows[0].id;
      }
      
      log(`📝 Создание тестовой транзакции для пользователя ${testUserId}...`, colors.cyan);
      
      const insertResult = await this.pool.query(`
        INSERT INTO transactions 
        (user_id, type, currency, amount, status, source, description, created_at)
        VALUES 
        ($1, 'deposit', 'UNI', 25.5, 'confirmed', 'test', 'Test transaction', NOW())
        RETURNING id
      `, [testUserId]);
      
      const transactionId = insertResult.rows[0].id;
      
      if (transactionId) {
        log(`✅ Транзакция создана, ID: ${transactionId}`, colors.green);
        
        // Проверяем создание транзакции
        const transactionCheck = await this.pool.query(`
          SELECT id, user_id, amount, currency, type
          FROM transactions
          WHERE id = $1
        `, [transactionId]);
        
        if (transactionCheck.rowCount > 0) {
          const transaction = transactionCheck.rows[0];
          log(`✅ Транзакция проверена: ${transaction.amount} ${transaction.currency} (${transaction.type})`, colors.green);
          this.testResults.transactions = true;
        }
      } else {
        log('❌ Ошибка при создании транзакции', colors.red);
      }
    } catch (error) {
      log(`❌ Ошибка при тестировании транзакций: ${error.message}`, colors.red);
      console.error(error);
    }
  }
  
  // Тест 4: Проверка работы с фармингом
  async testFarming() {
    log('\n🔍 Тест 4: Проверка работы с фармингом...', colors.blue);
    
    try {
      // Проверяем структуру таблицы farming_deposits
      const farmingTableCheck = await this.pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'farming_deposits'
        ORDER BY ordinal_position
      `);
      
      if (farmingTableCheck.rowCount > 0) {
        log('✅ Структура таблицы farming_deposits проверена', colors.green);
        
        // Берем существующего пользователя
        const userCheck = await this.pool.query(`
          SELECT id FROM users 
          ORDER BY id 
          LIMIT 1
        `);
        
        if (userCheck.rowCount > 0) {
          const userId = userCheck.rows[0].id;
          
          // Создаем тестовый депозит
          log(`📝 Создание тестового депозита для пользователя ${userId}...`, colors.cyan);
          
          const depositResult = await this.pool.query(`
            INSERT INTO farming_deposits 
            (user_id, amount_uni, rate_uni, rate_ton, created_at, last_claim)
            VALUES 
            ($1, 100, 0.5, 0.1, NOW(), NOW())
            RETURNING id
          `, [userId]);
          
          const depositId = depositResult.rows[0].id;
          
          if (depositId) {
            log(`✅ Депозит создан, ID: ${depositId}`, colors.green);
            
            // Проверяем депозит
            const depositCheck = await this.pool.query(`
              SELECT id, user_id, amount_uni, rate_uni
              FROM farming_deposits
              WHERE id = $1
            `, [depositId]);
            
            if (depositCheck.rowCount > 0) {
              const deposit = depositCheck.rows[0];
              log(`✅ Депозит проверен: ${deposit.amount_uni} UNI (ставка: ${deposit.rate_uni}%)`, colors.green);
              
              // Обновляем депозит
              await this.pool.query(`
                UPDATE farming_deposits
                SET last_claim = NOW()
                WHERE id = $1
              `, [depositId]);
              
              // Удаляем тестовый депозит
              await this.pool.query(`
                DELETE FROM farming_deposits
                WHERE id = $1
              `, [depositId]);
              
              log('✅ Тестовый депозит успешно удален', colors.green);
              this.testResults.farming = true;
            }
          } else {
            log('❌ Ошибка при создании депозита', colors.red);
          }
        } else {
          log('⚠️ Не найдено пользователей для тестирования фарминга', colors.yellow);
        }
      } else {
        log('❌ Структура таблицы farming_deposits не найдена', colors.red);
      }
    } catch (error) {
      log(`❌ Ошибка при тестировании фарминга: ${error.message}`, colors.red);
      console.error(error);
    }
  }
  
  // Тест 5: Проверка производительности
  async testPerformance() {
    log('\n🔍 Тест 5: Проверка производительности...', colors.blue);
    
    // Тестируем SELECT запросы
    log('🔄 Тестирование SELECT запросов...', colors.cyan);
    
    // Простой запрос
    try {
      const startTime1 = Date.now();
      for (let i = 0; i < 100; i++) {
        await this.pool.query('SELECT 1');
      }
      const endTime1 = Date.now();
      const duration1 = endTime1 - startTime1;
      
      this.testResults.performance.simpleSelect = duration1 / 100; // мс на запрос
      
      log(`✅ Простой SELECT: ${this.testResults.performance.simpleSelect.toFixed(2)} мс/запрос`, colors.green);
    } catch (error) {
      log(`❌ Ошибка при тестировании простого SELECT: ${error.message}`, colors.red);
    }
    
    // Запрос с JOIN
    try {
      const startTime2 = Date.now();
      for (let i = 0; i < 10; i++) {
        await this.pool.query(`
          SELECT u.id, u.username, t.amount, t.currency
          FROM users u
          LEFT JOIN transactions t ON u.id = t.user_id
          ORDER BY u.id
          LIMIT 10
        `);
      }
      const endTime2 = Date.now();
      const duration2 = endTime2 - startTime2;
      
      this.testResults.performance.joinSelect = duration2 / 10; // мс на запрос
      
      log(`✅ SELECT с JOIN: ${this.testResults.performance.joinSelect.toFixed(2)} мс/запрос`, colors.green);
    } catch (error) {
      log(`❌ Ошибка при тестировании SELECT с JOIN: ${error.message}`, colors.red);
    }
    
    // Тестируем INSERT запросы в отдельной транзакции
    log('🔄 Тестирование INSERT запросов...', colors.cyan);
    
    try {
      // Начинаем транзакцию
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Создаем временную таблицу для тестов
        await client.query(`
          CREATE TEMP TABLE test_performance (
            id SERIAL PRIMARY KEY,
            text_data TEXT,
            num_data INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
        
        // Тестируем INSERT
        const startTime3 = Date.now();
        for (let i = 0; i < 100; i++) {
          await client.query(`
            INSERT INTO test_performance (text_data, num_data)
            VALUES ($1, $2)
          `, [`test_${i}`, i]);
        }
        const endTime3 = Date.now();
        const duration3 = endTime3 - startTime3;
        
        this.testResults.performance.insert = duration3 / 100; // мс на запрос
        
        log(`✅ INSERT: ${this.testResults.performance.insert.toFixed(2)} мс/запрос`, colors.green);
        
        // Откатываем транзакцию
        await client.query('ROLLBACK');
      } finally {
        // Возвращаем клиента в пул
        client.release();
      }
    } catch (error) {
      log(`❌ Ошибка при тестировании INSERT: ${error.message}`, colors.red);
    }
  }
  
  // Общий результат тестирования
  printSummary() {
    log('\n📋 Сводка результатов тестирования:', colors.magenta);
    
    // Подключение
    log(`Подключение к Neon DB: ${this.testResults.connection ? '✅ Успешно' : '❌ Ошибка'}`, 
        this.testResults.connection ? colors.green : colors.red);
    
    // Таблицы
    log(`Проверка таблиц: ${Object.keys(this.testResults.tables).length} таблиц найдено`, colors.green);
    
    // Операции CRUD
    log(`Операции с пользователями: ${this.testResults.users ? '✅ Успешно' : '❌ Ошибка'}`,
        this.testResults.users ? colors.green : colors.red);
    
    log(`Операции с транзакциями: ${this.testResults.transactions ? '✅ Успешно' : '❌ Ошибка'}`,
        this.testResults.transactions ? colors.green : colors.red);
    
    log(`Операции с фармингом: ${this.testResults.farming ? '✅ Успешно' : '❌ Ошибка'}`,
        this.testResults.farming ? colors.green : colors.red);
    
    // Производительность
    if (Object.keys(this.testResults.performance).length > 0) {
      log('\nПроизводительность:', colors.cyan);
      
      if (this.testResults.performance.simpleSelect) {
        log(`Простой SELECT: ${this.testResults.performance.simpleSelect.toFixed(2)} мс/запрос`, colors.reset);
      }
      
      if (this.testResults.performance.joinSelect) {
        log(`SELECT с JOIN: ${this.testResults.performance.joinSelect.toFixed(2)} мс/запрос`, colors.reset);
      }
      
      if (this.testResults.performance.insert) {
        log(`INSERT: ${this.testResults.performance.insert.toFixed(2)} мс/запрос`, colors.reset);
      }
    }
    
    // Общий результат
    const allSuccess = 
      this.testResults.connection && 
      this.testResults.users && 
      this.testResults.transactions && 
      this.testResults.farming;
    
    log(`\n${allSuccess ? '🎉 Все тесты прошли успешно!' : '⚠️ Некоторые тесты не пройдены.'}`, 
        allSuccess ? colors.green : colors.yellow);
        
    // Рекомендации
    log('\n📝 Рекомендации:', colors.blue);
    
    if (!this.testResults.transactions) {
      log('- Проверьте настройку партиционирования таблицы transactions', colors.yellow);
      log('  Запустите скрипт create-neon-partitions.js для создания партиций', colors.yellow);
    }
    
    if (this.testResults.performance.joinSelect && this.testResults.performance.joinSelect > 100) {
      log('- Производительность JOIN запросов низкая. Рекомендуется настроить индексы', colors.yellow);
    }
    
    log('- Для оптимальной производительности используйте эндпоинт Neon DB с постфиксом -pooler', colors.reset);
    log('- Регулярно запускайте create_future_transaction_partitions() для создания новых партиций', colors.reset);
  }
  
  // Запуск всех тестов
  async runAllTests() {
    try {
      // Инициализация подключения
      await this.init();
      
      // Проверка таблиц
      await this.testTables();
      
      // Проверка пользователей
      await this.testUsers();
      
      // Проверка транзакций
      await this.testTransactions();
      
      // Проверка фарминга
      await this.testFarming();
      
      // Проверка производительности
      await this.testPerformance();
      
      // Сводка результатов
      this.printSummary();
    } catch (error) {
      log(`\n💥 Критическая ошибка: ${error.message}`, colors.red);
      console.error(error);
    } finally {
      // Закрываем соединение
      await this.close();
    }
  }
}

// Запуск скрипта
const tester = new NeonDBTester();
tester.runAllTests();