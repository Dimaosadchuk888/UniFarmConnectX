#!/bin/bash
# Скрипт восстановления автоматически удаленных файлов

echo "🔄 Восстановление файлов из cleanup-backup-automated..."

if [ ! -d "cleanup-backup-automated" ]; then
  echo "❌ Директория резервных копий не найдена!"
  exit 1
fi

cd cleanup-backup-automated
for backup_file in *; do
  if [ -f "$backup_file" ]; then
    # Убираем префикс категории из имени файла
    original_name="${backup_file#*_}"
    cp "$backup_file" "../$original_name"
    echo "✅ Восстановлен: $original_name"
  fi
done

echo "🎉 Восстановление завершено!"
