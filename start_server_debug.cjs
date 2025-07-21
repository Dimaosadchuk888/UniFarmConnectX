// Простой тест запуска сервера для диагностики
const { spawn } = require('child_process');

console.log('🔍 ДИАГНОСТИКА ЗАПУСКА СЕРВЕРА');
console.log('==============================');

const serverProcess = spawn('tsx', ['server/index.ts'], {
  stdio: 'pipe',
  cwd: process.cwd()
});

serverProcess.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
});

serverProcess.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString());
});

serverProcess.on('close', (code) => {
  console.log(`Процесс сервера завершился с кодом: ${code}`);
});

serverProcess.on('error', (error) => {
  console.log('ОШИБКА запуска сервера:', error.message);
});

setTimeout(() => {
  console.log('Остановка через 15 секунд...');
  serverProcess.kill();
}, 15000);