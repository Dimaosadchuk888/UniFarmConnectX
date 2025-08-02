import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface FieldUsage {
  field: string;
  usageCount: number;
  locations: string[];
  canRemove: boolean;
  recommendation: string;
}

async function checkFieldUsageInCode() {
  console.log('🔍 АНАЛИЗ ИСПОЛЬЗОВАНИЯ ПОЛЕЙ В КОДЕ\n');
  console.log('================================================================================\n');

  // Поля для анализа (на основе результатов предыдущего анализа)
  const fieldsToCheck = [
    // Поля-кандидаты на удаление (пустые)
    { field: 'uni_farming_balance', expectedEmpty: true },
    { field: 'wallet', expectedEmpty: true },
    
    // Дублирующиеся поля
    { field: 'balance_uni', duplicate: 'uni_farming_balance' },
    { field: 'balance_ton', duplicate: 'ton_farming_balance' },
    { field: 'ton_farming_balance', duplicate: 'balance_ton' },
    { field: 'uni_deposit_amount', duplicate: 'uni_farming_deposit' },
    { field: 'uni_farming_deposit', duplicate: 'uni_deposit_amount' },
    { field: 'ton_boost_package', duplicate: 'ton_boost_package_id' },
    { field: 'ton_boost_package_id', duplicate: 'ton_boost_package' },
    { field: 'ton_farming_rate', duplicate: 'ton_boost_rate' },
    { field: 'ton_boost_rate', duplicate: 'ton_farming_rate' },
    { field: 'ton_wallet_address', duplicate: 'wallet' }
  ];

  const results: FieldUsage[] = [];

  for (const fieldInfo of fieldsToCheck) {
    console.log(`Анализирую поле: ${fieldInfo.field}...`);
    
    try {
      // Ищем использование в TypeScript/JavaScript файлах
      const { stdout } = await execAsync(
        `grep -r "${fieldInfo.field}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules | grep -v ".git" | grep -v "scripts/check-field-usage" | grep -v "scripts/analyze-"`,
        { maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
      );

      const lines = stdout.split('\n').filter(line => line.trim());
      
      // Фильтруем результаты, исключая комментарии и определения типов
      const validUsages = lines.filter(line => {
        const content = line.split(':').slice(1).join(':');
        return !content.includes('//') || content.indexOf('//') > content.indexOf(fieldInfo.field);
      });

      // Извлекаем уникальные файлы
      const files = [...new Set(validUsages.map(line => {
        const filePath = line.split(':')[0];
        return filePath.replace('./', '');
      }))];

      results.push({
        field: fieldInfo.field,
        usageCount: validUsages.length,
        locations: files.slice(0, 5), // Первые 5 файлов
        canRemove: (fieldInfo.expectedEmpty === true) && validUsages.length === 0,
        recommendation: ''
      });

    } catch (error: any) {
      // Если grep ничего не нашел, это нормально
      if (error.code === 1) {
        results.push({
          field: fieldInfo.field,
          usageCount: 0,
          locations: [],
          canRemove: fieldInfo.expectedEmpty === true,
          recommendation: ''
        });
      } else {
        console.error(`Ошибка при анализе ${fieldInfo.field}:`, error.message);
      }
    }
  }

  // Генерируем рекомендации
  results.forEach(result => {
    if (result.usageCount === 0) {
      result.recommendation = '🗑️ Можно безопасно удалить - не используется в коде';
    } else if (result.usageCount < 5) {
      result.recommendation = '⚠️ Мало использований - проверить и возможно заменить';
    } else {
      result.recommendation = '❌ Активно используется - требует рефакторинга для удаления';
    }
  });

  // Выводим результаты
  console.log('\n\n📊 РЕЗУЛЬТАТЫ АНАЛИЗА:\n');
  console.log('================================================================================\n');

  // Группируем по категориям
  console.log('🗑️ ПУСТЫЕ ПОЛЯ (кандидаты на удаление):\n');
  results
    .filter(r => ['uni_farming_balance', 'wallet'].includes(r.field))
    .forEach(result => {
      console.log(`📌 ${result.field}`);
      console.log(`   Использований в коде: ${result.usageCount}`);
      if (result.locations.length > 0) {
        console.log(`   Файлы: ${result.locations.join(', ')}`);
      }
      console.log(`   ${result.recommendation}\n`);
    });

  console.log('\n🔄 ДУБЛИРУЮЩИЕСЯ ПОЛЯ:\n');
  const duplicatePairs = [
    ['balance_uni', 'uni_farming_balance'],
    ['balance_ton', 'ton_farming_balance'],
    ['uni_deposit_amount', 'uni_farming_deposit'],
    ['ton_boost_package', 'ton_boost_package_id'],
    ['ton_farming_rate', 'ton_boost_rate'],
    ['wallet', 'ton_wallet_address']
  ];

  duplicatePairs.forEach(([field1, field2]) => {
    const result1 = results.find(r => r.field === field1);
    const result2 = results.find(r => r.field === field2);
    
    if (result1 && result2) {
      console.log(`📌 ${field1} vs ${field2}`);
      console.log(`   ${field1}: ${result1.usageCount} использований`);
      console.log(`   ${field2}: ${result2.usageCount} использований`);
      
      if (result1.usageCount === 0 && result2.usageCount > 0) {
        console.log(`   ✅ Рекомендация: Удалить ${field1}, использовать ${field2}`);
      } else if (result2.usageCount === 0 && result1.usageCount > 0) {
        console.log(`   ✅ Рекомендация: Удалить ${field2}, использовать ${field1}`);
      } else if (result1.usageCount > 0 && result2.usageCount > 0) {
        console.log(`   ⚠️ Рекомендация: Оба поля используются, требуется постепенная миграция`);
      } else {
        console.log(`   ✅ Рекомендация: Оба поля не используются, можно удалить оба`);
      }
      console.log();
    }
  });

  // Итоговые рекомендации
  console.log('\n\n📋 ПЛАН ДЕЙСТВИЙ:\n');
  console.log('================================================================================\n');

  console.log('1️⃣ НЕМЕДЛЕННО можно удалить (не используются и пустые):\n');
  results
    .filter(r => r.usageCount === 0 && ['uni_farming_balance', 'wallet'].includes(r.field))
    .forEach(r => console.log(`   - ${r.field}`));

  console.log('\n2️⃣ СИНХРОНИЗИРОВАТЬ данные (используются оба поля):\n');
  duplicatePairs
    .filter(([f1, f2]) => {
      const r1 = results.find(r => r.field === f1);
      const r2 = results.find(r => r.field === f2);
      return r1 && r2 && r1.usageCount > 0 && r2.usageCount > 0;
    })
    .forEach(([f1, f2]) => console.log(`   - ${f1} ← → ${f2}`));

  console.log('\n3️⃣ ЗАМЕНИТЬ и удалить (используется только одно из пары):\n');
  duplicatePairs.forEach(([f1, f2]) => {
    const r1 = results.find(r => r.field === f1);
    const r2 = results.find(r => r.field === f2);
    if (r1 && r2) {
      if (r1.usageCount === 0 && r2.usageCount > 0) {
        console.log(`   - Удалить ${f1} → использовать ${f2}`);
      } else if (r2.usageCount === 0 && r1.usageCount > 0) {
        console.log(`   - Удалить ${f2} → использовать ${f1}`);
      }
    }
  });

  // Сохраняем детальный отчет
  const detailedReport = {
    timestamp: new Date().toISOString(),
    fieldsAnalyzed: results.length,
    results: results,
    recommendations: {
      immediateRemoval: results.filter(r => r.usageCount === 0 && ['uni_farming_balance', 'wallet'].includes(r.field)).map(r => r.field),
      requiresSynchronization: duplicatePairs.filter(([f1, f2]) => {
        const r1 = results.find(r => r.field === f1);
        const r2 = results.find(r => r.field === f2);
        return r1 && r2 && r1.usageCount > 0 && r2.usageCount > 0;
      }),
      canReplace: duplicatePairs.filter(([f1, f2]) => {
        const r1 = results.find(r => r.field === f1);
        const r2 = results.find(r => r.field === f2);
        return r1 && r2 && ((r1.usageCount === 0 && r2.usageCount > 0) || (r2.usageCount === 0 && r1.usageCount > 0));
      })
    }
  };

  await fs.promises.writeFile(
    'FIELD_USAGE_ANALYSIS.json',
    JSON.stringify(detailedReport, null, 2)
  );

  console.log('\n\n✅ Анализ завершен. Детальный отчет сохранен в FIELD_USAGE_ANALYSIS.json');
}

// Запускаем анализ
checkFieldUsageInCode().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Критическая ошибка:', err);
  process.exit(1);
});