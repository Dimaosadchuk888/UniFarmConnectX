// Перенаправление на стабильный сервер
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Перенаправление на стабильный сервер...');

// Запуск стабильного сервера
const stableServerPath = path.join(__dirname, '..', 'stable-server.js');
const child = spawn('node', [stableServerPath], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..')
});

child.on('error', (error) => {
  console.error('Ошибка запуска стабильного сервера:', error);
  process.exit(1);
});

child.on('close', (code) => {
  console.log(`Стабильный сервер завершился с кодом ${code}`);
  process.exit(code || 0);
});

// Обработка сигналов завершения
process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
});