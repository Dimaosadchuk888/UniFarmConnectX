#!/bin/bash
# Скрипт восстановления удаленных файлов

echo "🔄 Восстановление файлов из cleanup-backup..."

if [ ! -d "cleanup-backup" ]; then
  echo "❌ Директория резервных копий не найдена!"
  exit 1
fi

cd cleanup-backup
for backup_file in *; do
  original_file="${backup_file//_//}"
  if [ -f "$backup_file" ]; then
    mkdir -p "$(dirname "../$original_file")"
    cp "$backup_file" "../$original_file"
    echo "✅ Восстановлен: $original_file"
  fi
done

echo "🎉 Восстановление завершено!"
