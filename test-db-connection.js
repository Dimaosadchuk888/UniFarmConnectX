/**
 * Тестовий скрипт для перевірки підключення до бази даних
 * Використовує встановлені модулі з db-connect-unified
 */

// Імпортуємо необхідні модулі для ES Module
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Запуск тесту підключення до бази даних...');

// Функція для логування результатів
function log(message, isError = false) {
  console[isError ? 'error' : 'log'](message);
}

// Читаємо змінні оточення з .env файлу
async function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    const content = await fs.promises.readFile(envPath, 'utf8');
    const lines = content.split('\n');

    console.log('Зчитуємо змінні з файлу .env');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const match = /^([^=]+)=(.*)$/.exec(trimmedLine);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          
          // Видаляємо лапки на початку та в кінці, якщо є
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
          }
          
          process.env[key] = value;
        }
      }
    }
    
    log('Змінні оточення успішно завантажено');
  } catch (err) {
    log(`Помилка при зчитуванні .env файлу: ${err.message}`, true);
    
    // Додаткова перевірка: спробуємо зчитати .env.unified
    try {
      const unifiedEnvPath = path.resolve(process.cwd(), '.env.unified');
      const unifiedContent = await fs.promises.readFile(unifiedEnvPath, 'utf8');
      log('Знайдено .env.unified, спробуємо зчитати з нього');
      
      const lines = unifiedContent.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const match = /^([^=]+)=(.*)$/.exec(trimmedLine);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.substring(1, value.length - 1);
            }
            
            process.env[key] = value;
          }
        }
      }
      
      log('Змінні оточення успішно завантажено з .env.unified');
    } catch (unifiedErr) {
      log(`Не вдалося зчитати й альтернативний файл .env.unified: ${unifiedErr.message}`, true);
    }
  }
}

// Завантажуємо змінні оточення з .env файлу - запускаємо асинхронно
await loadEnv();

// Функція для тестування підключення
async function testConnection() {
  let pool = null;
  
  try {
    // Перевіряємо, чи визначена змінна DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      log('Змінна DATABASE_URL не визначена', true);
      return false;
    }
    
    log(`Використовуємо DATABASE_URL=${databaseUrl.substring(0, databaseUrl.indexOf('@') + 1)}...`);
    
    // Створюємо пул підключень
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 5000  // 5 секунд таймаут
    });
    
    log('Пул підключень створено, пробуємо підключитися...');
    
    // Перевіряємо підключення
    const client = await pool.connect();
    log('✓ Підключення успішно встановлено');
    
    // Виконуємо простий запит
    const result = await client.query('SELECT current_database(), current_user, version()');
    log('✓ Запит виконано успішно');
    log('Інформація про базу даних:');
    log(JSON.stringify(result.rows[0], null, 2));
    
    // Перевіряємо існування необхідних таблиць
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    log(`Знайдено ${tablesResult.rowCount} таблиць у базі даних:`);
    tablesResult.rows.forEach((row, index) => {
      log(`${index + 1}. ${row.table_name}`);
    });
    
    // Закриваємо клієнт
    client.release();
    
    return true;
  } catch (error) {
    log(`❌ Помилка підключення до бази даних: ${error.message}`, true);
    
    if (error.message.includes('timeout')) {
      log('Помилка таймауту підключення. Перевірте, чи доступна база даних.', true);
    } else if (error.message.includes('no pg_hba.conf entry')) {
      log('Помилка доступу: ваш IP не дозволений для підключення.', true);
    } else if (error.message.includes('password authentication failed')) {
      log('Помилка автентифікації: неправильний пароль.', true);
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      log('Вказана база даних не існує.', true);
    }
    
    return false;
  } finally {
    // Закриваємо пул підключень
    if (pool) {
      try {
        await pool.end();
        log('Пул підключень закрито');
      } catch (err) {
        log(`Помилка при закритті пулу: ${err.message}`, true);
      }
    }
  }
}

// Перевіряємо також запасне підключення
async function testBackupConnection() {
  let pool = null;
  
  try {
    // Перевіряємо, чи визначена змінна BACKUP_DATABASE_URL
    const backupDatabaseUrl = process.env.BACKUP_DATABASE_URL;
    if (!backupDatabaseUrl) {
      log('Змінна BACKUP_DATABASE_URL не визначена', true);
      return false;
    }
    
    // Замінюємо змінні оточення
    const processedUrl = backupDatabaseUrl.replace(/\${([^}]+)}/g, (match, varName) => {
      return process.env[varName] || match;
    });
    
    log(`Використовуємо BACKUP_DATABASE_URL=${processedUrl.substring(0, processedUrl.indexOf('@') + 1)}...`);
    
    // Створюємо пул підключень
    pool = new Pool({
      connectionString: processedUrl,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 5000  // 5 секунд таймаут
    });
    
    log('Пул підключень для резервної БД створено, пробуємо підключитися...');
    
    // Перевіряємо підключення
    const client = await pool.connect();
    log('✓ Підключення до резервної БД успішно встановлено');
    
    // Виконуємо простий запит
    const result = await client.query('SELECT current_database(), current_user, version()');
    log('✓ Запит до резервної БД виконано успішно');
    log('Інформація про резервну базу даних:');
    log(JSON.stringify(result.rows[0], null, 2));
    
    // Закриваємо клієнт
    client.release();
    
    return true;
  } catch (error) {
    log(`❌ Помилка підключення до резервної бази даних: ${error.message}`, true);
    return false;
  } finally {
    // Закриваємо пул підключень
    if (pool) {
      try {
        await pool.end();
        log('Пул підключень до резервної БД закрито');
      } catch (err) {
        log(`Помилка при закритті пулу резервної БД: ${err.message}`, true);
      }
    }
  }
}

// Функція для запуску всіх тестів
async function runAllTests() {
  log('======== Початок тестування підключення до бази даних ========');
  
  log('\n----- Перевірка основного підключення -----');
  const mainResult = await testConnection();
  
  log('\n----- Перевірка резервного підключення -----');
  const backupResult = await testBackupConnection();
  
  log('\n======== Результати тестування ========');
  log(`Основне підключення: ${mainResult ? '✓ Працює' : '❌ Не працює'}`);
  log(`Резервне підключення: ${backupResult ? '✓ Працює' : '❌ Не працює'}`);
  
  if (!mainResult && !backupResult) {
    log('\n⚠️ Жодне підключення не працює. Перевірте налаштування бази даних.', true);
  } else if (!mainResult) {
    log('\n⚠️ Основне підключення не працює, але резервне працює. Буде використовуватися резервне.', true);
  } else if (!backupResult) {
    log('\n⚠️ Резервне підключення не працює, але основне працює. Буде використовуватися основне.', true);
  } else {
    log('\n✓ Обидва підключення працюють. Система налаштована правильно!');
  }
}

// Запускаємо всі тести як асинхронну функцію головного модуля
try {
  await runAllTests();
} catch (error) {
  log(`Помилка при виконанні тестів: ${error.message}`, true);
}