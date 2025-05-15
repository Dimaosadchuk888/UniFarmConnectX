/**
 * Neon Workflow Launcher
 * 
 * Скрипт для запуска UniFarm с принудительным использованием Neon DB
 * Создан специально для использования в workflow
 */

// Устанавливаем переменные окружения для Neon DB до импорта любых модулей
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';
process.env.OVERRIDE_DB_PROVIDER = 'neon';
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '3000';

console.log('🚀 Запуск UniFarm с ПРИНУДИТЕЛЬНЫМ использованием Neon DB');
console.log('✅ DATABASE_PROVIDER = neon');
console.log('✅ FORCE_NEON_DB = true');
console.log('✅ NODE_ENV = production');

// Используем spawn для запуска npm скрипта
const { spawn } = require('child_process');

// Запускаем приложение в production режиме напрямую, избегая npm скрипт
console.log('📦 Запуск приложения напрямую через node...');
// Используем путь из package.json script "start"
const child = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    DATABASE_PROVIDER: 'neon',
    FORCE_NEON_DB: 'true',
    DISABLE_REPLIT_DB: 'true',
    OVERRIDE_DB_PROVIDER: 'neon'
  }
});

// Обработка завершения процесса
child.on('close', (code) => {
  console.log(`⚠️ Процесс завершился с кодом ${code}`);
  process.exit(code);
});

// Обработка ошибок
child.on('error', (err) => {
  console.error(`❌ Ошибка при запуске: ${err.message}`);
  process.exit(1);
});

// Корректная обработка сигналов завершения
process.on('SIGINT', () => {
  child.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
  process.exit(0);
});