/**
 * ЗАПУСК СЕРВЕРА С ИСПРАВЛЕННОЙ ЛОГИКОЙ REFERRALSERVICE
 * Быстрый запуск с применением исправлений
 */

require('dotenv').config();
const { exec } = require('child_process');

async function startFixedServer() {
  console.log('🚀 Запуск UniFarm сервера с исправленной логикой...');
  
  // Очистка старых процессов
  exec('pkill -f "tsx.*server" || true', () => {
    console.log('🧹 Очистка старых процессов');
    
    // Запуск сервера
    setTimeout(() => {
      const serverProcess = exec('tsx server/index.ts', {
        cwd: '/home/runner/workspace',
        stdio: 'inherit'
      });
      
      serverProcess.stdout?.on('data', (data) => {
        console.log('📡 SERVER:', data.toString());
      });
      
      serverProcess.stderr?.on('data', (data) => {
        console.error('❌ SERVER ERROR:', data.toString());
      });
      
      serverProcess.on('close', (code) => {
        console.log(`🔚 Сервер завершен с кодом ${code}`);
      });
      
      console.log('✅ Сервер запущен (PID:', serverProcess.pid, ')');
      
      // Тест через 10 секунд
      setTimeout(async () => {
        console.log('\n🔧 Тестирование исправленного API...');
        
        const { spawn } = require('child_process');
        const testProcess = spawn('curl', [
          '-X', 'GET',
          'http://localhost:3000/api/v2/referrals/debug-stats',
          '-H', 'Content-Type: application/json'
        ]);
        
        let output = '';
        testProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        testProcess.on('close', (code) => {
          console.log('📊 Результат тестирования API:');
          console.log(output || 'Нет ответа');
          
          if (output.includes('total_uni_earned')) {
            console.log('✅ API РАБОТАЕТ! Реферальная система исправлена');
          } else {
            console.log('⚠️  Требуется дополнительная проверка');
          }
        });
        
      }, 10000);
      
    }, 2000);
  });
}

startFixedServer();