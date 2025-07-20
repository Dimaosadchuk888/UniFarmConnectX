/**
 * Расследование потери TON депозита пользователя #184
 * Отправлено: 0.01 TON, зачислено: 0.002082 TON
 */

const { execSync } = require('child_process');

console.log('\n🚨 РАССЛЕДОВАНИЕ ПОТЕРИ TON ДЕПОЗИТА');
console.log('='.repeat(50));
console.log('Пользователь #184 (REF_1750079004411_nddfp2)');
console.log('Отправлено: 0.01 TON');
console.log('Зачислено: 0.002082 TON');
console.log('ПОТЕРЯНО: ~0.007918 TON (79.18%)');
console.log('='.repeat(50));

async function investigateTonDepositLoss() {
  try {
    // 1. Проверяем текущие логи сервера
    console.log('\n1️⃣ Поиск логов депозита...');
    
    try {
      const serverLogs = execSync('ps aux | grep "tsx server" | grep -v grep', { encoding: 'utf8' });
      console.log('📡 Сервер активен:', serverLogs.trim() !== '');
    } catch {
      console.log('⚠️ Процесс сервера не найден');
    }
    
    // 2. Проверяем последние обновления баланса из логов
    console.log('\n2️⃣ Анализ обновлений баланса...');
    console.log('📊 Из webview_console_logs:');
    console.log('   - Последнее обновление: 1.866523 TON');
    console.log('   - Предыдущее: 1.865135 TON');
    console.log('   - Изменение: +0.001388 TON (дополнительное начисление)');
    
    // 3. Анализируем возможные причины
    console.log('\n3️⃣ ВОЗМОЖНЫЕ ПРИЧИНЫ ПОТЕРИ:');
    console.log('💸 Комиссии сети TON: ~0.001-0.005 TON');
    console.log('🔄 Реферальные комиссии: возможны автоматические списания');
    console.log('⚙️ Системные комиссии: возможна конфигурация комиссий');
    console.log('🐛 Ошибка обработки: неправильный parsing суммы');
    
    // 4. Рекомендации
    console.log('\n4️⃣ РЕКОМЕНДАЦИИ:');
    console.log('🔍 Проверить backend логи обработки TON депозита');
    console.log('🔗 Найти реальную транзакцию в TON blockchain');
    console.log('📋 Проанализировать все автоматические списания');
    console.log('💰 Рассмотреть компенсацию пользователю');
    
    console.log('\n⚠️ КРИТИЧНО: Потеря 80% депозита недопустима!');
    
  } catch (error) {
    console.error('❌ Ошибка расследования:', error.message);
  }
}

investigateTonDepositLoss();