/**
 * Скрипт для проверки подключения к базе данных PostgreSQL
 * Можно использовать перед запуском сервера для проверки доступности БД
 */

// Импортируем необходимые модули
import pg from 'pg';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const { Pool } = pg;

// Цвета для вывода в консоль
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Функция для проверки подключения к базе данных
async function checkDatabaseConnection() {
  console.log(`${COLORS.blue}📊 Проверка подключения к базе данных...${COLORS.reset}`);

  // Проверяем наличие переменной окружения DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error(`${COLORS.red}❌ Ошибка: Переменная окружения DATABASE_URL не установлена${COLORS.reset}`);
    return false;
  }

  // Создаем пул подключений к PostgreSQL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Пытаемся подключиться к базе данных
    const client = await pool.connect();
    
    console.log(`${COLORS.green}✅ Успешное подключение к базе данных${COLORS.reset}`);
    
    // Получаем информацию о базе данных
    const dbInfoResult = await client.query(`
      SELECT
        current_database() as db_name,
        current_user as db_user,
        version() as db_version,
        pg_size_pretty(pg_database_size(current_database())) as db_size;
    `);
    
    const dbInfo = dbInfoResult.rows[0];
    console.log(`${COLORS.cyan}📌 Информация о базе данных:${COLORS.reset}`);
    console.log(`   - Название: ${dbInfo.db_name}`);
    console.log(`   - Пользователь: ${dbInfo.db_user}`);
    console.log(`   - Версия PostgreSQL: ${dbInfo.db_version}`);
    console.log(`   - Размер: ${dbInfo.db_size}`);
    
    // Получаем список таблиц
    const tablesResult = await client.query(`
      SELECT 
        table_name 
      FROM 
        information_schema.tables 
      WHERE 
        table_schema = 'public' 
      ORDER BY 
        table_name;
    `);
    
    console.log(`${COLORS.cyan}📋 Таблицы в базе данных (${tablesResult.rows.length}):${COLORS.reset}`);
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
    // Проверяем количество пользователей в таблице users
    try {
      const usersResult = await client.query('SELECT COUNT(*) as user_count FROM users');
      const userCount = usersResult.rows[0].user_count;
      console.log(`${COLORS.cyan}👤 Количество пользователей: ${userCount}${COLORS.reset}`);
    } catch (userError) {
      console.log(`${COLORS.yellow}⚠️ Не удалось получить количество пользователей: ${userError.message}${COLORS.reset}`);
    }
    
    // Освобождаем клиента
    client.release();
    await pool.end();
    
    return true;
  } catch (error) {
    console.error(`${COLORS.red}❌ Ошибка подключения к базе данных: ${error.message}${COLORS.reset}`);
    
    // Дополнительные рекомендации при ошибке подключения
    console.log(`${COLORS.yellow}💡 Рекомендации:${COLORS.reset}`);
    console.log('   - Проверьте правильность переменной окружения DATABASE_URL');
    console.log('   - Убедитесь, что сервер PostgreSQL запущен и доступен');
    console.log('   - Проверьте, что порт PostgreSQL (обычно 5432) не заблокирован фаерволом');
    console.log('   - Проверьте правильность имени пользователя и пароля');
    
    try {
      await pool.end();
    } catch (endError) {
      // Игнорируем ошибки закрытия пула
    }
    
    return false;
  }
}

// Запускаем проверку подключения
checkDatabaseConnection()
  .then(isConnected => {
    if (isConnected) {
      console.log(`${COLORS.green}🎉 Подключение к базе данных успешно установлено${COLORS.reset}`);
      process.exit(0);
    } else {
      console.error(`${COLORS.red}❌ Не удалось подключиться к базе данных${COLORS.reset}`);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(`${COLORS.red}❌ Непредвиденная ошибка: ${error.message}${COLORS.reset}`);
    process.exit(1);
  });