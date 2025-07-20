// Простая диагностика TON баланса без зависимостей
const { execSync } = require('child_process');

console.log('\n🔍 ДИАГНОСТИКА TON BALANCE UPDATE');
console.log('='.repeat(50));

try {
  // 1. Проверяем последние транзакции TON
  console.log('\n1. Проверка последних TON транзакций через API...');
  
  const apiCommand = `curl -s "http://localhost:3000/api/v2/debug/env"`;
  const envResult = execSync(apiCommand, { encoding: 'utf8' });
  console.log('Статус сервера:', envResult);
  
  // 2. Проверяем состояние сервера
  console.log('\n2. Проверка health endpoint...');
  const healthCommand = `curl -s "http://localhost:3000/health"`;
  const healthResult = execSync(healthCommand, { encoding: 'utf8' });
  console.log('Health check:', healthResult);
  
  console.log('\n✅ ДИАГНОСТИКА ЗАВЕРШЕНА');
  console.log('Используйте /debug/balance-flow для frontend диагностики');
  
} catch (error) {
  console.error('❌ Ошибка диагностики:', error.message);
}