/**
 * Скрипт для тестирования миграции депозитов из таблицы users в uni_farming_deposits
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev';

async function testMigration(dryRun = true, forceOverwrite = false) {
  try {
    console.log(`[i] Запрос на миграцию депозитов (dry_run=${dryRun}, force_overwrite=${forceOverwrite})`);
    
    const response = await fetch(`${API_BASE_URL}/api/uni-farming/migrate-deposits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dry_run: dryRun,
        force_overwrite: forceOverwrite
      })
    });

    console.log(`[i] HTTP ответ: ${response.status} ${response.statusText}`);
    
    const result = await response.json();
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('Ошибка при запросе миграции:', error);
    return null;
  }
}

async function main() {
  // Сначала выполняем пробный запуск без реальной миграции
  await testMigration(true, false);
  
  // После подтверждения, выполняем реальную миграцию (закомментировано для безопасности)
  // console.log('\n----- ВЫПОЛНЯЕМ РЕАЛЬНУЮ МИГРАЦИЮ ЧЕРЕЗ 3 СЕКУНДЫ -----\n');
  // await new Promise(resolve => setTimeout(resolve, 3000));
  // await testMigration(false, false);
}

main().catch(console.error);