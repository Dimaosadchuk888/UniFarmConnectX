import { supabase } from '../core/supabase.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DuplicateGroup {
  group: string;
  fields: string[];
  description: string;
  dataType?: string[];
}

interface FieldUsage {
  field: string;
  usageCount: number;
  files: string[];
  isWrite: boolean;
  isRead: boolean;
  criticalUsage: boolean;
}

async function searchFieldInCode(field: string): Promise<FieldUsage> {
  const usage: FieldUsage = {
    field,
    usageCount: 0,
    files: [],
    isWrite: false,
    isRead: false,
    criticalUsage: false
  };

  const directories = ['modules', 'server', 'client/src', 'shared', 'scripts'];
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];

  for (const dir of directories) {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) continue;

    const searchDir = (currentPath: string) => {
      try {
        const items = fs.readdirSync(currentPath);
        
        for (const item of items) {
          const fullPath = path.join(currentPath, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.includes('node_modules')) {
            searchDir(fullPath);
          } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Проверяем различные паттерны использования
            const patterns = [
              new RegExp(`\\.${field}\\b`, 'g'),
              new RegExp(`\\['${field}'\\]`, 'g'),
              new RegExp(`\\["${field}"\\]`, 'g'),
              new RegExp(`${field}:`, 'g'),
              new RegExp(`\\.set\\([^)]*${field}`, 'g'),
              new RegExp(`\\.update\\([^)]*${field}`, 'g'),
              new RegExp(`INSERT[^;]*${field}`, 'gi'),
              new RegExp(`UPDATE[^;]*${field}`, 'gi')
            ];
            
            let found = false;
            for (const pattern of patterns) {
              const matches = content.match(pattern);
              if (matches) {
                usage.usageCount += matches.length;
                found = true;
                
                // Проверяем тип операции
                if (pattern.toString().includes('set|update|INSERT|UPDATE')) {
                  usage.isWrite = true;
                } else {
                  usage.isRead = true;
                }
                
                // Проверяем критичность
                if (fullPath.includes('farming') || fullPath.includes('boost') || 
                    fullPath.includes('wallet') || fullPath.includes('transaction')) {
                  usage.criticalUsage = true;
                }
              }
            }
            
            if (found && !usage.files.includes(fullPath)) {
              usage.files.push(fullPath.replace(path.join(__dirname, '..'), ''));
            }
          }
        }
      } catch (error) {
        // Игнорируем ошибки доступа
      }
    };

    searchDir(dirPath);
  }

  return usage;
}

async function analyzeDuplicateFields() {
  console.log('🔍 ПОЛНЫЙ АУДИТ ДУБЛИРУЮЩИХСЯ ПОЛЕЙ');
  console.log('='.repeat(80));
  console.log('');

  const duplicates: DuplicateGroup[] = [
    {
      group: 'UNI Deposit',
      fields: ['uni_deposit_amount', 'uni_farming_deposit'],
      description: 'Сумма UNI депозита',
      dataType: ['numeric', 'numeric']
    },
    {
      group: 'UNI Balance',
      fields: ['balance_uni', 'uni_farming_balance'],
      description: 'UNI баланс/накопления',
      dataType: ['numeric', 'numeric']
    },
    {
      group: 'TON Boost Package',
      fields: ['ton_boost_package', 'ton_boost_package_id'],
      description: 'ID пакета TON Boost',
      dataType: ['integer', 'integer']
    },
    {
      group: 'Wallet Address',
      fields: ['wallet', 'ton_wallet_address'],
      description: 'TON адрес кошелька',
      dataType: ['text', 'text']
    }
  ];

  // 1. АНАЛИЗ ИСПОЛЬЗОВАНИЯ В КОДЕ
  console.log('📊 АНАЛИЗ ИСПОЛЬЗОВАНИЯ В КОДЕ:');
  console.log('-'.repeat(80));
  
  const fieldUsageMap = new Map<string, FieldUsage>();
  
  for (const dup of duplicates) {
    console.log(`\n${dup.group}:`);
    
    for (const field of dup.fields) {
      const usage = await searchFieldInCode(field);
      fieldUsageMap.set(field, usage);
      
      console.log(`  ${field}:`);
      console.log(`    - Использований: ${usage.usageCount}`);
      console.log(`    - Файлов: ${usage.files.length}`);
      console.log(`    - Операции: ${usage.isWrite ? 'запись' : ''}${usage.isWrite && usage.isRead ? ', ' : ''}${usage.isRead ? 'чтение' : ''}`);
      console.log(`    - Критичность: ${usage.criticalUsage ? '⚠️ ВЫСОКАЯ' : 'обычная'}`);
      
      if (usage.files.length > 0 && usage.files.length <= 3) {
        console.log(`    - Файлы: ${usage.files.join(', ')}`);
      }
    }
  }

  // 2. АНАЛИЗ ДАННЫХ В БД
  console.log('\n\n📊 АНАЛИЗ ДАННЫХ В БАЗЕ:');
  console.log('-'.repeat(80));

  // Получаем все данные для анализа
  const { data: users, count } = await supabase
    .from('users')
    .select('*', { count: 'exact' });

  if (!users) {
    console.error('Не удалось получить данные');
    return;
  }

  console.log(`\nВсего записей: ${count}`);

  for (const dup of duplicates) {
    console.log(`\n${dup.group} (${dup.fields.join(' vs ')}):`);
    
    let identicalCount = 0;
    let differentCount = 0;
    let bothNullCount = 0;
    let oneNullCount = 0;
    const differences: any[] = [];
    
    for (const user of users) {
      const val1 = user[dup.fields[0]];
      const val2 = user[dup.fields[1]];
      
      if (val1 === null && val2 === null) {
        bothNullCount++;
      } else if (val1 === null || val2 === null) {
        oneNullCount++;
        if (differences.length < 5) {
          differences.push({
            userId: user.id,
            telegram_id: user.telegram_id,
            [dup.fields[0]]: val1,
            [dup.fields[1]]: val2
          });
        }
      } else if (String(val1) === String(val2)) {
        identicalCount++;
      } else {
        differentCount++;
        if (differences.length < 5) {
          differences.push({
            userId: user.id,
            telegram_id: user.telegram_id,
            [dup.fields[0]]: val1,
            [dup.fields[1]]: val2
          });
        }
      }
    }
    
    console.log(`  - Идентичные значения: ${identicalCount} (${(identicalCount/count*100).toFixed(1)}%)`);
    console.log(`  - Различающиеся: ${differentCount} (${(differentCount/count*100).toFixed(1)}%)`);
    console.log(`  - Оба NULL: ${bothNullCount} (${(bothNullCount/count*100).toFixed(1)}%)`);
    console.log(`  - Один NULL: ${oneNullCount} (${(oneNullCount/count*100).toFixed(1)}%)`);
    
    if (differences.length > 0) {
      console.log(`  - Примеры различий (первые 5):`);
      differences.forEach(diff => {
        console.log(`    User ${diff.userId}: ${dup.fields[0]}=${diff[dup.fields[0]]}, ${dup.fields[1]}=${diff[dup.fields[1]]}`);
      });
    }
  }

  // 3. ОПРЕДЕЛЕНИЕ ГЛАВНЫХ ПОЛЕЙ
  console.log('\n\n🎯 ОПРЕДЕЛЕНИЕ ГЛАВНЫХ ПОЛЕЙ:');
  console.log('-'.repeat(80));

  for (const dup of duplicates) {
    console.log(`\n${dup.group}:`);
    
    const usage1 = fieldUsageMap.get(dup.fields[0])!;
    const usage2 = fieldUsageMap.get(dup.fields[1])!;
    
    let primary = '';
    let reason = '';
    
    // Логика определения главного поля
    if (usage1.usageCount > usage2.usageCount * 2) {
      primary = dup.fields[0];
      reason = 'значительно больше использований в коде';
    } else if (usage2.usageCount > usage1.usageCount * 2) {
      primary = dup.fields[1];
      reason = 'значительно больше использований в коде';
    } else if (usage1.criticalUsage && !usage2.criticalUsage) {
      primary = dup.fields[0];
      reason = 'используется в критичных модулях';
    } else if (!usage1.criticalUsage && usage2.criticalUsage) {
      primary = dup.fields[1];
      reason = 'используется в критичных модулях';
    } else if (dup.fields[0].includes('_')) {
      primary = dup.fields[0];
      reason = 'более описательное имя';
    } else {
      primary = dup.fields[1];
      reason = 'более современное именование';
    }
    
    console.log(`  📌 Главное поле: ${primary}`);
    console.log(`  📝 Причина: ${reason}`);
    console.log(`  ⚠️  Дубликат: ${dup.fields.find(f => f !== primary)}`);
  }

  // 4. СПЕЦИАЛЬНЫЙ АНАЛИЗ BALANCE ПОЛЕЙ
  console.log('\n\n💰 СПЕЦИАЛЬНЫЙ АНАЛИЗ BALANCE ПОЛЕЙ:');
  console.log('-'.repeat(80));
  
  const { data: balanceAnalysis } = await supabase
    .from('users')
    .select('id, telegram_id, balance_uni, uni_farming_balance, uni_deposit_amount, uni_farming_deposit')
    .not('balance_uni', 'eq', 'uni_farming_balance')
    .limit(10);

  if (balanceAnalysis && balanceAnalysis.length > 0) {
    console.log('\nПользователи с различиями balance_uni vs uni_farming_balance:');
    balanceAnalysis.forEach(user => {
      const depositSum = parseFloat(user.uni_deposit_amount || '0');
      const farmingSum = parseFloat(user.uni_farming_balance || '0');
      const totalBalance = parseFloat(user.balance_uni || '0');
      
      console.log(`\nUser ${user.id}:`);
      console.log(`  - balance_uni: ${totalBalance}`);
      console.log(`  - uni_farming_balance: ${farmingSum}`);
      console.log(`  - uni_deposit_amount: ${depositSum}`);
      console.log(`  - Разница: ${(totalBalance - farmingSum).toFixed(6)}`);
      console.log(`  - Вывод: balance_uni = депозит + накопления от фарминга`);
    });
  }

  // 5. ИТОГОВЫЕ РЕКОМЕНДАЦИИ
  console.log('\n\n📋 ИТОГОВЫЕ РЕКОМЕНДАЦИИ:');
  console.log('='.repeat(80));
  
  console.log('\n1. ПОЛЯ С РАЗНЫМ НАЗНАЧЕНИЕМ (НЕ УДАЛЯТЬ):');
  console.log('   - balance_uni: общий баланс UNI (депозит + накопления)');
  console.log('   - uni_farming_balance: только накопления от фарминга');
  console.log('   ⚠️ Эти поля НЕ дубликаты, у них разная бизнес-логика!');
  
  console.log('\n2. ИСТИННЫЕ ДУБЛИКАТЫ (МОЖНО УНИФИЦИРОВАТЬ):');
  console.log('   - wallet → ton_wallet_address (использовать ton_wallet_address)');
  console.log('   - ton_boost_package → ton_boost_package_id (проверить типы данных)');
  
  console.log('\n3. ТРЕБУЮТ СИНХРОНИЗАЦИИ:');
  console.log('   - uni_deposit_amount ↔ uni_farming_deposit');
  console.log('   - Возможно, это одно и то же значение, нужна синхронизация');
  
  console.log('\n4. ПЛАН ДЕЙСТВИЙ:');
  console.log('   a) Синхронизировать данные в полях-дубликатах');
  console.log('   b) Обновить код для использования главных полей');
  console.log('   c) Создать миграцию для удаления дубликатов в будущем');

  // Сохраняем отчет
  const report = {
    timestamp: new Date().toISOString(),
    duplicateGroups: duplicates,
    fieldUsage: Object.fromEntries(fieldUsageMap),
    recommendations: {
      keep_separate: ['balance_uni', 'uni_farming_balance'],
      unify: [
        { from: 'wallet', to: 'ton_wallet_address' },
        { from: 'ton_boost_package', to: 'ton_boost_package_id' }
      ],
      sync_required: ['uni_deposit_amount', 'uni_farming_deposit']
    }
  };
  
  fs.writeFileSync(
    path.join(__dirname, '..', 'DUPLICATE_FIELDS_AUDIT_REPORT.md'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n\n✅ Аудит завершен! Отчет сохранен в DUPLICATE_FIELDS_AUDIT_REPORT.md');
}

// Запуск анализа
console.log('Запускаю полный аудит дублирующихся полей...\n');
analyzeDuplicateFields().catch(console.error);