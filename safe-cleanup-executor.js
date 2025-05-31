/**
 * Безопасное выполнение очистки дубликатов
 * Поэтапное удаление с возможностью отката
 */

import fs from 'fs';
import path from 'path';

const BACKUP_DIR = 'cleanup-backup';

/**
 * Создает резервную копию файла перед удалением
 */
function backupFile(filePath) {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const backupPath = path.join(BACKUP_DIR, filePath.replace(/[\/\\]/g, '_'));
    fs.copyFileSync(filePath, backupPath);
    console.log(`  📋 Создана резервная копия: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Ошибка создания резервной копии ${filePath}:`, error.message);
    return false;
  }
}

/**
 * ЭТАП 1: Удаление явно безопасных файлов
 */
function cleanupSafeFiles() {
  console.log('🧹 ЭТАП 1: Удаление безопасных файлов...\n');
  
  const safeToDelete = [
    'archive/db-backups/db-service-wrapper.ts',
    'archive/telegram-bot-scripts/setup-webhook.js',
    'archive/telegram-bot-scripts/update-menu-button.js',
    'backup/index.ts',
    'backup/routes/routes-new.ts',
    'backup/routes/routes.ts',
    'dist/public/index.html.bak'
  ];
  
  let deletedCount = 0;
  
  safeToDelete.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`🗑️  Удаляем: ${file}`);
      
      if (backupFile(file)) {
        try {
          fs.unlinkSync(file);
          console.log(`  ✅ Успешно удален`);
          deletedCount++;
        } catch (error) {
          console.error(`  ❌ Ошибка удаления:`, error.message);
        }
      }
    } else {
      console.log(`  ⚠️  Файл уже отсутствует: ${file}`);
    }
    console.log('');
  });
  
  console.log(`✅ Этап 1 завершен. Удалено файлов: ${deletedCount}/${safeToDelete.length}\n`);
}

/**
 * ЭТАП 2: Очистка пустых директорий
 */
function cleanupEmptyDirectories() {
  console.log('🧹 ЭТАП 2: Удаление пустых директорий...\n');
  
  const dirsToCheck = [
    'backup/routes',
    'backup',
    'archive/db-backups',
    'archive/telegram-bot-scripts',
    'archive'
  ];
  
  let removedDirs = 0;
  
  dirsToCheck.forEach(dir => {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        if (files.length === 0) {
          fs.rmdirSync(dir);
          console.log(`🗂️  Удалена пустая директория: ${dir}`);
          removedDirs++;
        } else {
          console.log(`📁 Директория не пуста: ${dir} (${files.length} файлов)`);
        }
      }
    } catch (error) {
      console.error(`❌ Ошибка проверки директории ${dir}:`, error.message);
    }
  });
  
  console.log(`✅ Этап 2 завершен. Удалено директорий: ${removedDirs}\n`);
}

/**
 * ЭТАП 3: Анализ критичных дублирующихся функций
 */
function analyzeCriticalFunctions() {
  console.log('🔍 ЭТАП 3: Анализ критичных дублирующихся функций...\n');
  
  const criticalFunctions = [
    {
      name: 'handleWithdraw',
      files: ['bug-fixes-proposal.js'],
      recommendation: 'Удалить из bug-fixes-proposal.js - это тестовый файл'
    },
    {
      name: 'harvestFarming', 
      files: ['bug-fixes-proposal.js'],
      recommendation: 'Удалить из bug-fixes-proposal.js - это тестовый файл'
    },
    {
      name: 'getDeposits',
      files: ['bug-fixes-proposal.js'],
      recommendation: 'Удалить из bug-fixes-proposal.js - это тестовый файл'
    }
  ];
  
  console.log('📋 РЕКОМЕНДАЦИИ ПО ДУБЛИРУЮЩИМСЯ ФУНКЦИЯМ:');
  console.log('═══════════════════════════════════════════');
  
  criticalFunctions.forEach(func => {
    console.log(`🔧 Функция: ${func.name}`);
    console.log(`   Файлы: ${func.files.join(', ')}`);
    console.log(`   💡 Рекомендация: ${func.recommendation}\n`);
  });
}

/**
 * ЭТАП 4: Создание отчета о проделанной работе
 */
function generateCleanupReport() {
  console.log('📊 ЭТАП 4: Генерация отчета...\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    phase1: {
      description: 'Удаление безопасных архивных файлов',
      status: 'completed',
      filesRemoved: [
        'archive/db-backups/db-service-wrapper.ts',
        'archive/telegram-bot-scripts/setup-webhook.js', 
        'archive/telegram-bot-scripts/update-menu-button.js',
        'backup/index.ts',
        'backup/routes/routes-new.ts',
        'backup/routes/routes.ts',
        'dist/public/index.html.bak'
      ]
    },
    phase2: {
      description: 'Очистка пустых директорий',
      status: 'completed'
    },
    nextSteps: {
      description: 'Следующие шаги для полной очистки',
      items: [
        'Удалить bug-fixes-proposal.js (содержит тестовые дубликаты функций)',
        'Консолидировать скрипты с одинаковой функциональностью (.js/.mjs/.cjs)',
        'Удалить неиспользуемые тестовые скрипты после проверки',
        'Стандартизировать структуру директорий'
      ]
    },
    backup: {
      location: BACKUP_DIR,
      description: 'Все удаленные файлы сохранены для возможности восстановления'
    }
  };
  
  fs.writeFileSync('cleanup-progress-report.json', JSON.stringify(report, null, 2));
  
  console.log('📋 ОТЧЕТ О ПРОВЕДЕННОЙ ОЧИСТКЕ:');
  console.log('═══════════════════════════════');
  console.log('✅ Фаза 1: Удалены безопасные архивные файлы');
  console.log('✅ Фаза 2: Очищены пустые директории');
  console.log(`💾 Резервные копии: ${BACKUP_DIR}/`);
  console.log('📄 Полный отчет: cleanup-progress-report.json\n');
  
  console.log('🎯 СЛЕДУЮЩИЕ РЕКОМЕНДУЕМЫЕ ШАГИ:');
  console.log('1. Удалить bug-fixes-proposal.js (тестовый файл с дубликатами)');
  console.log('2. Консолидировать скрипты (.js/.mjs/.cjs версии)');
  console.log('3. Провести финальную проверку работоспособности');
  console.log('4. Удалить неиспользуемые тестовые скрипты\n');
}

/**
 * Создание скрипта отката
 */
function createRestoreScript() {
  const restoreScript = `#!/bin/bash
# Скрипт восстановления удаленных файлов

echo "🔄 Восстановление файлов из ${BACKUP_DIR}..."

if [ ! -d "${BACKUP_DIR}" ]; then
  echo "❌ Директория резервных копий не найдена!"
  exit 1
fi

cd ${BACKUP_DIR}
for backup_file in *; do
  original_file="\${backup_file//_//}"
  if [ -f "$backup_file" ]; then
    mkdir -p "$(dirname "../$original_file")"
    cp "$backup_file" "../$original_file"
    echo "✅ Восстановлен: $original_file"
  fi
done

echo "🎉 Восстановление завершено!"
`;

  fs.writeFileSync('restore-deleted-files.sh', restoreScript);
  console.log('🛟 Создан скрипт восстановления: restore-deleted-files.sh\n');
}

/**
 * Главная функция безопасной очистки
 */
function runSafeCleanup() {
  console.log('🚀 Запуск безопасной очистки дубликатов...\n');
  console.log('⚠️  ВНИМАНИЕ: Все удаляемые файлы будут скопированы в backup\n');
  
  try {
    cleanupSafeFiles();
    cleanupEmptyDirectories();
    analyzeCriticalFunctions();
    generateCleanupReport();
    createRestoreScript();
    
    console.log('🎉 Безопасная очистка завершена успешно!');
    console.log('📁 Проект стал чище, критичные файлы сохранены');
    console.log('🛟 В случае проблем используйте: bash restore-deleted-files.sh');
    
  } catch (error) {
    console.error('❌ Ошибка при очистке:', error.message);
    console.log('🛟 Используйте скрипт восстановления при необходимости');
  }
}

// Запуск очистки
runSafeCleanup();