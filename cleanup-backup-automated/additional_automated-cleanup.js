/**
 * Автоматизированная очистка неиспользуемых файлов UniFarm
 */

import fs from 'fs';
import path from 'path';

const BACKUP_DIR = 'cleanup-backup-automated';

// Категории файлов для удаления
const filesToDelete = {
  // Тестовые скрипты
  testScripts: [
    'SQL_db_inspection.js',
    'add-test-balance-bonus.js',
    'add-test-balance-cli.js', 
    'add-test-balance.js',
    'api-audit.js',
    'api-consolidated-test.js',
    'api-controller-db-audit.js',
    'api-endpoints-test.js',
    'check-bot-settings.js',
    'check-current-user.js',
    'check-db-connection.js',
    'check-db-details.js',
    'check-deposits.js',
    'check-mini-app-url.js',
    'check-missions.js',
    'check-neon-components.js',
    'check-neon-connection.js',
    'check-neon-db-connection.js',
    'check-neon-settings.js',
    'check-production-url.js',
    'check-replit-db.js',
    'check-table-status.js',
    'check-telegram-auth.js',
    'check-telegram-webhook.js',
    'check-ton-boosts.js',
    'check-ton-farming.js',
    'check-users.js'
  ],
  
  // Утилитарные скрипты
  utilityScripts: [
    'analyze-file-naming.js',
    'analyze-refcodes.js',
    'api-routes-checker.js',
    'api-validation-report.js',
    'auth-flow-diagnosis.js',
    'benchmark-referral-bonus.js',
    'browser-access.js',
    'comprehensive-api-db-audit.js',
    'comprehensive-system-audit.js',
    'cors-fix-diagnosis.js',
    'create-multiple-users.js',
    'create-test-referral.js',
    'create-test-user.js',
    'create-test-users-api.js',
    'db-connection-diagnosis.js',
    'db-health-check.js',
    'db-schema-diagnosis.js',
    'db-status.js',
    'debug-bot-commands.js',
    'debug-deposit-direct.js',
    'debug-missions.js',
    'display-env-vars.js'
  ],
  
  // Скрипты деплоя и настройки
  deployScripts: [
    'deploy-build.js',
    'deploy-config.js', 
    'deploy-fix.js',
    'deploy-server.js',
    'deploy-to-replit.js',
    'deploy-with-neon.js',
    'deploy.js',
    'dev-production.js',
    'final-bot-setup.js',
    'final-bot-test.js',
    'fix-api-endpoints.js',
    'fix-balance-display.js',
    'fix-controller-names.js',
    'fix-mini-app-settings.js',
    'fix-telegram-miniapp-url.js',
    'fix-webhook-final.js',
    'fix-webhook-urgent.js',
    'fix-webhook.js',
    'setup-webhook.js',
    'update-menu-button.js'
  ],
  
  // Скрипты миграции и инициализации  
  migrationScripts: [
    'migrate-db.js',
    'migrate-guest-id.js',
    'migrate-neon-db.js',
    'migrate-replit-db.js',
    'init-neon-db.js',
    'initialize-replit-database.mjs',
    'create-neon-partitions.js',
    'create-partition-quick.cjs',
    'create-test-referral.mjs',
    'direct-neon-connection.cjs',
    'direct-neon-schema.js',
    'direct-neon-start.js',
    'neon-app-start.js',
    'neon-connection-test.js',
    'neon-start.js'
  ]
};

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function backupAndDelete(filePath, category) {
  if (!fs.existsSync(filePath)) {
    return { status: 'not_found', message: `Файл не найден: ${filePath}` };
  }
  
  try {
    // Создаем резервную копию
    const backupPath = path.join(BACKUP_DIR, `${category}_${path.basename(filePath)}`);
    fs.copyFileSync(filePath, backupPath);
    
    // Удаляем оригинал
    fs.unlinkSync(filePath);
    
    return { status: 'deleted', message: `Удален: ${filePath}` };
  } catch (error) {
    return { status: 'error', message: `Ошибка: ${filePath} - ${error.message}` };
  }
}

function cleanupCategory(categoryName, files) {
  console.log(`\n🧹 Очистка категории: ${categoryName}`);
  console.log('═'.repeat(50));
  
  let deletedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;
  
  files.forEach(file => {
    const result = backupAndDelete(file, categoryName);
    
    switch (result.status) {
      case 'deleted':
        console.log(`✅ ${result.message}`);
        deletedCount++;
        break;
      case 'not_found':
        console.log(`⚪ ${result.message}`);
        notFoundCount++;
        break;
      case 'error':
        console.log(`❌ ${result.message}`);
        errorCount++;
        break;
    }
  });
  
  console.log(`\n📊 Итого по категории ${categoryName}:`);
  console.log(`   Удалено: ${deletedCount}`);
  console.log(`   Не найдено: ${notFoundCount}`);
  console.log(`   Ошибки: ${errorCount}`);
  
  return { deleted: deletedCount, notFound: notFoundCount, errors: errorCount };
}

function generateCleanupReport(results) {
  const totalDeleted = Object.values(results).reduce((sum, r) => sum + r.deleted, 0);
  const totalNotFound = Object.values(results).reduce((sum, r) => sum + r.notFound, 0);
  const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalDeleted,
      totalNotFound,
      totalErrors,
      backupLocation: BACKUP_DIR
    },
    categoryResults: results,
    nextSteps: [
      'Проверить работоспособность приложения',
      'Удалить дублирующиеся API роуты',
      'Исправить мертвые импорты в активных файлах',
      'Очистить неиспользуемые папки'
    ]
  };
  
  fs.writeFileSync('automated-cleanup-report.json', JSON.stringify(report, null, 2));
  
  console.log('\n📋 ИТОГОВЫЙ ОТЧЕТ АВТОМАТИЧЕСКОЙ ОЧИСТКИ');
  console.log('═'.repeat(60));
  console.log(`🗑️  Всего удалено файлов: ${totalDeleted}`);
  console.log(`⚪ Файлов не найдено: ${totalNotFound}`);
  console.log(`❌ Ошибок при удалении: ${totalErrors}`);
  console.log(`💾 Резервные копии: ${BACKUP_DIR}/`);
  console.log('\n✅ Отчет сохранен в automated-cleanup-report.json');
}

function createRestoreScript() {
  const restoreScript = `#!/bin/bash
# Скрипт восстановления автоматически удаленных файлов

echo "🔄 Восстановление файлов из ${BACKUP_DIR}..."

if [ ! -d "${BACKUP_DIR}" ]; then
  echo "❌ Директория резервных копий не найдена!"
  exit 1
fi

cd ${BACKUP_DIR}
for backup_file in *; do
  if [ -f "$backup_file" ]; then
    # Убираем префикс категории из имени файла
    original_name="\${backup_file#*_}"
    cp "$backup_file" "../$original_name"
    echo "✅ Восстановлен: $original_name"
  fi
done

echo "🎉 Восстановление завершено!"
`;

  fs.writeFileSync('restore-automated-cleanup.sh', restoreScript);
  console.log('\n🛟 Создан скрипт восстановления: restore-automated-cleanup.sh');
}

function runAutomatedCleanup() {
  console.log('🚀 Запуск автоматизированной очистки UniFarm');
  console.log('⚠️  Все удаляемые файлы будут сохранены в backup\n');
  
  ensureBackupDir();
  
  const results = {};
  
  // Очищаем каждую категорию
  for (const [categoryName, files] of Object.entries(filesToDelete)) {
    results[categoryName] = cleanupCategory(categoryName, files);
  }
  
  generateCleanupReport(results);
  createRestoreScript();
  
  console.log('\n🎉 Автоматизированная очистка завершена!');
  console.log('📁 Проект значительно очищен от неиспользуемых файлов');
  console.log('🛟 При проблемах: bash restore-automated-cleanup.sh');
}

// Запуск очистки
runAutomatedCleanup();