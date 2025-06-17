#!/usr/bin/env node

/**
 * UniFarm Web Interface Launcher
 * Запускает сервер с явным указанием веб-интерфейса для Replit Preview
 */

import { spawn } from 'child_process';
import http from 'http';

// Настройка окружения для веб-интерфейса
process.env.NODE_ENV = 'production';
process.env.PORT = '3000';
process.env.HOST = '0.0.0.0';

console.log('🌐 Запуск UniFarm Web Interface...');
console.log('📍 URL: http://localhost:3000');
console.log('🔗 Preview: https://uni-farm-connect-x-osadchukdmitro2.replit.app');

// Проверка доступности порта
function checkPort() {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(3000, '0.0.0.0', () => {
      server.close();
      resolve(true);
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

async function startWebInterface() {
  const portAvailable = await checkPort();
  
  if (!portAvailable) {
    console.log('⚠️  Порт 3000 занят, завершаем существующие процессы...');
    try {
      spawn('pkill', ['-f', 'tsx server/index.ts'], { stdio: 'pipe' });
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      // Игнорируем ошибки pkill
    }
  }

  // Запуск основного сервера
  const serverProcess = spawn('tsx', ['server/index.ts'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd(),
    env: process.env
  });

  // Буферизация вывода для более читаемых логов
  let outputBuffer = '';
  
  serverProcess.stdout.on('data', (data) => {
    outputBuffer += data.toString();
    process.stdout.write(data);
    
    // Показываем готовность веб-интерфейса
    if (outputBuffer.includes('Frontend: http://0.0.0.0:3000')) {
      console.log('\n✅ ВЕБ-ИНТЕРФЕЙС ГОТОВ!');
      console.log('🔗 Откройте Preview панель или перейдите по ссылке:');
      console.log('📱 https://uni-farm-connect-x-osadchukdmitro2.replit.app');
      console.log('💻 http://localhost:3000\n');
    }
  });

  serverProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  serverProcess.on('error', (error) => {
    console.error('❌ Ошибка запуска веб-интерфейса:', error.message);
    process.exit(1);
  });

  serverProcess.on('exit', (code) => {
    if (code === 0) {
      console.log('✅ Веб-интерфейс корректно завершен');
    } else {
      console.error(`❌ Веб-интерфейс завершен с кодом: ${code}`);
      process.exit(code);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🔄 Завершение веб-интерфейса...');
    serverProcess.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('🔄 Остановка веб-интерфейса...');
    serverProcess.kill('SIGINT');
  });
}

startWebInterface().catch(error => {
  console.error('❌ Критическая ошибка запуска:', error.message);
  process.exit(1);
});