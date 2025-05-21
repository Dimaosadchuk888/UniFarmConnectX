// Точка входа для Replit
// Просто перенаправляем выполнение на наш стабильный запускной скрипт
import { spawn } from 'child_process';

console.log('🚀 Запуск UniFarm через index.js...');
console.log('⏱️ Переадресация на run.cjs...');

// Запускаем run.cjs через spawn
const child = spawn('node', ['run.cjs'], {
  stdio: 'inherit'
});

// Держим процесс активным
setInterval(() => {}, 10000);