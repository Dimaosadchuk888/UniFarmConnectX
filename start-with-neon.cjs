/**
 * Скрипт запуска для UniFarm с принудительным использованием Neon DB
 * 
 * Этот скрипт запускает приложение с настройками для использования Neon DB:
 * 1. Устанавливает принудительные флаги для Neon DB
 * 2. Загружает переменные из .env.neon
 * 3. Запускает приложение
 */

// Модули для работы с процессами, файлами и путями
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Цвета для вывода в консоль
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

/**
 * Вывод сообщения в консоль с цветом
 */
function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

/**
 * Загрузка переменных окружения для Neon DB
 */
function loadNeonEnvironment() {
  log(`\n${colors.blue}=== Загрузка переменных окружения для Neon DB ===${colors.reset}`);
  
  // Принудительно устанавливаем настройки для Neon DB
  process.env.FORCE_NEON_DB = 'true';
  process.env.DATABASE_PROVIDER = 'neon';
  process.env.DISABLE_REPLIT_DB = 'true';
  process.env.USE_LOCAL_DB_ONLY = 'false';
  process.env.NODE_ENV = 'production';
  
  // Загружаем настройки из .env.neon, если он существует
  const neonEnvPath = path.join(process.cwd(), '.env.neon');
  if (fs.existsSync(neonEnvPath)) {
    log(`📝 Загрузка переменных из .env.neon...`, colors.blue);
    const envConfig = dotenv.parse(fs.readFileSync(neonEnvPath));
    
    // Применяем переменные окружения
    for (const key in envConfig) {
      process.env[key] = envConfig[key];
    }
    
    log(`✅ Переменные окружения из .env.neon успешно загружены`, colors.green);
  } else {
    log(`❌ Файл .env.neon не найден!`, colors.red);
    log(`⚠️ Создайте файл .env.neon с настройками подключения к Neon DB`, colors.yellow);
    return false;
  }
  
  // Проверяем, что у нас есть DATABASE_URL для Neon DB
  if (!process.env.DATABASE_URL) {
    log(`❌ Ошибка: Переменная DATABASE_URL не установлена!`, colors.red);
    log(`⚠️ Убедитесь, что файл .env.neon содержит переменную DATABASE_URL`, colors.yellow);
    return false;
  }
  
  // Проверяем, что DATABASE_URL указывает на Neon DB
  if (!process.env.DATABASE_URL.includes('neon.tech')) {
    log(`⚠️ Переменная DATABASE_URL не указывает на Neon DB!`, colors.yellow);
    log(`⚠️ Текущее значение: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`, colors.yellow);
    log(`⚠️ URL должен содержать neon.tech`, colors.yellow);
    return false;
  }
  
  log(`✅ DATABASE_PROVIDER = ${process.env.DATABASE_PROVIDER}`, colors.green);
  log(`✅ FORCE_NEON_DB = ${process.env.FORCE_NEON_DB}`, colors.green);
  log(`✅ NODE_ENV = ${process.env.NODE_ENV}`, colors.green);
  
  // Пробуем протестировать соединение с Neon DB
  try {
    log(`🔍 Тестирование соединения с Neon DB...`, colors.blue);
    
    // Загружаем код для проверки соединения напрямую
    // Это более надежно, чем пытаться использовать непосредственно модули проекта
    const checkNeonCode = `
      const { Pool } = require('pg');
      
      async function testConnection() {
        const pool = new Pool({ 
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });
        
        try {
          const result = await pool.query('SELECT NOW() as time');
          console.log('✅ Соединение с Neon DB успешно установлено');
          console.log(\`✅ Время на сервере: \${result.rows[0].time}\`);
          await pool.end();
          return true;
        } catch (error) {
          console.error('❌ Ошибка соединения с Neon DB:', error.message);
          return false;
        }
      }
      
      testConnection();
    `;
    
    // Записываем временный файл
    const tempCheckPath = path.join(process.cwd(), 'temp-neon-check.cjs');
    fs.writeFileSync(tempCheckPath, checkNeonCode);
    
    // Выполняем проверку
    execSync(`node ${tempCheckPath}`, { stdio: 'inherit' });
    
    // Удаляем временный файл
    fs.unlinkSync(tempCheckPath);
    
    return true;
  } catch (error) {
    log(`⚠️ Тест соединения не выполнен: ${error.message}`, colors.yellow);
    log(`⚠️ Проверьте настройки подключения к Neon DB`, colors.yellow);
    return true; // Продолжаем несмотря на ошибку теста
  }
}

/**
 * Запуск сервера приложения
 */
function startServer() {
  log(`\n${colors.blue}=== Запуск сервера приложения с Neon DB ===${colors.reset}`);
  log(`🚀 Запуск сервера на порту ${process.env.PORT || '3000'}...`, colors.magenta);
  
  // Запускаем через npm run start (production режим)
  const serverProcess = spawn('npm', ['run', 'start'], {
    stdio: 'inherit',
    env: process.env
  });
  
  // Обработка событий
  serverProcess.on('close', (code) => {
    log(`⚠️ Сервер завершил работу с кодом ${code}`, colors.yellow);
    process.exit(code);
  });
  
  serverProcess.on('error', (error) => {
    log(`❌ Ошибка при запуске сервера: ${error.message}`, colors.red);
    process.exit(1);
  });
  
  // Обработка сигналов завершения
  process.on('SIGINT', () => {
    log(`\n👋 Завершение работы по команде пользователя...`, colors.blue);
    serverProcess.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log(`\n👋 Завершение работы...`, colors.blue);
    serverProcess.kill('SIGTERM');
    process.exit(0);
  });
}

/**
 * Основная функция
 */
async function main() {
  // Заголовок
  log(`\n${colors.magenta}====================================${colors.reset}`);
  log(`${colors.magenta}= ЗАПУСК UNIFARM С NEON DB (FORCED) =${colors.reset}`);
  log(`${colors.magenta}====================================${colors.reset}`);
  
  // Загрузка переменных окружения для Neon DB
  if (!loadNeonEnvironment()) {
    log(`\n❌ Не удалось настроить окружение для Neon DB. Завершение работы.`, colors.red);
    process.exit(1);
  }
  
  // Запуск сервера
  startServer();
}

// Запуск основной функции
main().catch(error => {
  log(`\n❌ Критическая ошибка: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});