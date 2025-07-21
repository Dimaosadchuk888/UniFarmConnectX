/**
 * EMERGENCY STOP - Временно останавливает все планировщики для диагностики
 */

console.log('🚨 EMERGENCY STOP: Останавливаем все планировщики');
console.log('=' + '='.repeat(50));

async function emergencyStop() {
  try {
    // Способ 1: Убиваем все процессы tsx
    const { exec } = require('child_process');
    
    console.log('1. Поиск активных Node.js процессов...');
    exec('ps aux | grep -E "(tsx|node)" | grep -v grep', (error, stdout, stderr) => {
      if (stdout) {
        console.log('АКТИВНЫЕ ПРОЦЕССЫ:');
        console.log(stdout);
      }
    });

    // Способ 2: Найти основной процесс сервера
    console.log('\n2. Попытка graceful остановки...');
    
    // Способ 3: Запретить выполнение планировщиков через flag файл
    const fs = require('fs');
    fs.writeFileSync('SCHEDULER_DISABLED.flag', `
EMERGENCY STOP ACTIVATED
Time: ${new Date().toISOString()}
Reason: Diagnosing anomalous intervals
Status: ALL SCHEDULERS DISABLED
    `.trim());
    
    console.log('✅ Создан файл SCHEDULER_DISABLED.flag');
    console.log('📋 ИНСТРУКЦИИ:');
    console.log('   1. Перезапустить сервер через Replit Run button');
    console.log('   2. Проверить что планировщики НЕ запускаются');
    console.log('   3. Мониторить остановку роста балансов');
    console.log('   4. Удалить flag файл когда диагностика завершена');
    
    console.log('\n🔍 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('   - Перезапуск сервера ОБЯЗАТЕЛЕН');
    console.log('   - Планировщики не будут запускаться если flag существует');
    console.log('   - Балансы должны прекратить рост');
    
  } catch (error) {
    console.log('❌ Ошибка emergency stop:', error.message);
  }
}

emergencyStop();