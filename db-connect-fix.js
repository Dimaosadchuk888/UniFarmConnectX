/**
 * Скрипт для исправления проблем с подключением к Neon DB
 * 
 * Этот файл должен быть импортирован в server/db.ts и в любые другие
 * скрипты, которые подключаются к базе данных
 */

// Принудительно отключаем Unix сокеты для PostgreSQL
process.env.PGHOST = process.env.PGHOST || 'localhost';  // Использовать TCP вместо сокета 
process.env.PGSSLMODE = 'prefer';
process.env.PGSOCKET = ''; // Пустая строка для отключения сокетов
process.env.PGCONNECT_TIMEOUT = '10';

// Принудительно переключаем на Neon DB
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';
process.env.OVERRIDE_DB_PROVIDER = 'neon';