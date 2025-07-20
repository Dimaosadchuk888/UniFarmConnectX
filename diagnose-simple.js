// Простая диагностика TON баланса
const { execSync } = require('child_process');

console.log('\n🔍 ДИАГНОСТИКА TON BALANCE UPDATE');
console.log('='.repeat(50));

async function checkServer() {
  try {
    // Проверяем, запущен ли сервер
    console.log('1. Проверка статуса сервера...');
    
    const netstat = execSync('netstat -tuln | grep :3000 || echo "Port 3000 not found"', { encoding: 'utf8' });
    console.log('Статус порта 3000:', netstat.trim());
    
    const processes = execSync('ps aux | grep "npm\\|node\\|vite" | grep -v grep || echo "No processes found"', { encoding: 'utf8' });
    console.log('Активные процессы:', processes.trim());
    
    console.log('\n✅ ДИАГНОСТИКА ЗАВЕРШЕНА');
    console.log('Для полной диагностики откройте: http://localhost:3000/debug/balance-flow');
    
  } catch (error) {
    console.error('❌ Ошибка диагностики:', error.message);
  }
}

checkServer();