/**
 * ДИАГНОСТИКА TON ДЕПОЗИТА ПОЛЬЗОВАТЕЛЯ #25
 * Реф-код: REF_1750079004411_nddfp2
 * Сумма: 0.1 TON
 * Транзакция: b30da7471672b8fc154baca674b2cc9c0829ead2a443bfa901f7b676ced2c70d
 */

const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

console.log('\n🔍 ДИАГНОСТИКА TON ДЕПОЗИТА ПОЛЬЗОВАТЕЛЯ #25');
console.log('='.repeat(60));
console.log('User ID: 25');
console.log('Реф-код: REF_1750079004411_nddfp2');
console.log('Сумма: 0.1 TON');
console.log('Транзакция: b30da7471672b8fc154baca674b2cc9c0829ead2a443bfa901f7b676ced2c70d');
console.log('='.repeat(60));

async function diagnoseUser25TonDeposit() {
  try {
    // 1. Поиск логов сервера с упоминанием user 25
    console.log('\n1️⃣ Поиск в логах сервера...');
    try {
      const serverLogs = execSync('grep -r "user.*25\\|User.*25\\|userId.*25" logs/ 2>/dev/null | head -10', { encoding: 'utf8' });
      if (serverLogs.trim()) {
        console.log('📝 Найденные логи:', serverLogs);
      } else {
        console.log('⚠️ Логи для user 25 не найдены');
      }
    } catch {
      console.log('❌ Директория логов недоступна или пуста');
    }

    // 2. Поиск упоминаний реф-кода
    console.log('\n2️⃣ Поиск реф-кода REF_1750079004411_nddfp2...');
    try {
      const refLogs = execSync('grep -r "REF_1750079004411_nddfp2" . --exclude-dir=node_modules 2>/dev/null | head -5', { encoding: 'utf8' });
      if (refLogs.trim()) {
        console.log('🔗 Найдены упоминания:', refLogs);
      } else {
        console.log('⚠️ Реф-код в коде/логах не найден');
      }
    } catch {
      console.log('❌ Поиск реф-кода не удался');
    }

    // 3. Поиск hash транзакции
    console.log('\n3️⃣ Поиск hash транзакции...');
    try {
      const hashLogs = execSync('grep -r "b30da7471672b8fc154baca674b2cc9c0829ead2a443bfa901f7b676ced2c70d" . --exclude-dir=node_modules 2>/dev/null', { encoding: 'utf8' });
      if (hashLogs.trim()) {
        console.log('🔗 Hash найден:', hashLogs);
      } else {
        console.log('⚠️ Hash транзакции в системе не найден');
      }
    } catch {
      console.log('❌ Поиск hash не удался');
    }

    // 4. Проверка конфигурации баз данных
    console.log('\n4️⃣ Проверка конфигурации БД...');
    try {
      const envCheck = execSync('env | grep -E "DATABASE_URL|SUPABASE_URL|NEON" | head -3', { encoding: 'utf8' });
      if (envCheck.trim()) {
        console.log('💾 Переменные БД найдены (значения скрыты)');
      } else {
        console.log('⚠️ Переменные БД не найдены в окружении');
      }
    } catch {
      console.log('❌ Проверка переменных окружения не удалась');
    }

    console.log('\n5️⃣ АНАЛИЗ ПРОБЛЕМЫ:');
    console.log('🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
    console.log('   1. User #25 не существует в текущей БД (Replit preview vs Production)');
    console.log('   2. TON депозит обработан в другой БД/окружении');
    console.log('   3. Проблемы с маршрутизацией по реф-коду');
    console.log('   4. Транзакция обработана но balance не обновлен');
    console.log('   5. WebSocket уведомления не работают для User #25');

    console.log('\n6️⃣ РЕКОМЕНДАЦИИ:');
    console.log('✅ Проверить production БД на наличие User ID 25');
    console.log('✅ Найти логи обработки транзакции b30da747...');
    console.log('✅ Верифицировать реф-код REF_1750079004411_nddfp2');
    console.log('✅ Проверить корректность domain/endpoint конфигурации');
    console.log('✅ Протестировать WebSocket для production');

  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error.message);
  }
}

diagnoseUser25TonDeposit();