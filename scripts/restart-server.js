import { spawn } from 'child_process';
import { execSync } from 'child_process';

console.log('🔄 Перезапуск сервера UniFarm...');

// Найти PID процесса
try {
  const pids = execSync("ps aux | grep 'tsx server/index.ts' | grep -v grep | awk '{print $2}'")
    .toString()
    .split('\n')
    .filter(pid => pid);
    
  if (pids.length > 0) {
    console.log('📍 Найдены процессы:', pids);
    
    // Остановить процессы
    pids.forEach(pid => {
      if (pid) {
        try {
          process.kill(parseInt(pid), 'SIGTERM');
          console.log(`✅ Остановлен процесс ${pid}`);
        } catch (e) {
          console.log(`⚠️ Не удалось остановить процесс ${pid}`);
        }
      }
    });
    
    // Подождать
    console.log('⏳ Ожидание 3 секунды...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
} catch (e) {
  console.log('ℹ️ Процессы сервера не найдены');
}

// Запустить новый сервер
console.log('🚀 Запуск нового сервера...');
const server = spawn('npm', ['start'], {
  cwd: '/home/runner/workspace',
  stdio: 'inherit',
  detached: true
});

server.unref();

console.log('✅ Сервер перезапущен!');
console.log('⏳ Подождите 5-10 секунд для полного запуска...');