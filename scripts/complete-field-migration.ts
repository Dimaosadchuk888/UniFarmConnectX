import { supabase } from '../core/supabase.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MigrationResult {
  phase: string;
  success: boolean;
  details: any;
  errors: string[];
}

async function completeFieldMigration() {
  console.log('🚀 ПОЛНАЯ МИГРАЦИЯ И УДАЛЕНИЕ ДУБЛИРУЮЩИХСЯ ПОЛЕЙ');
  console.log('='.repeat(80));
  console.log('');
  console.log('📋 ПЛАН МИГРАЦИИ:');
  console.log('1. Синхронизация всех данных в главные поля');
  console.log('2. Обновление кода для использования главных полей');
  console.log('3. Удаление дублирующихся полей из БД');
  console.log('');
  
  const results: MigrationResult[] = [];
  
  try {
    // ФАЗА 1: СИНХРОНИЗАЦИЯ ДАННЫХ
    console.log('\n📊 ФАЗА 1: СИНХРОНИЗАЦИЯ ДАННЫХ');
    console.log('-'.repeat(60));
    
    // 1.1 Синхронизация uni_deposit_amount
    console.log('\n1.1. Синхронизация uni_deposit_amount (главное поле)');
    
    const { data: depositDiffs } = await supabase
      .from('users')
      .select('id, uni_deposit_amount, uni_farming_deposit')
      .or('uni_deposit_amount.neq.uni_farming_deposit,uni_farming_deposit.is.null');
    
    if (depositDiffs && depositDiffs.length > 0) {
      console.log(`Найдено ${depositDiffs.length} записей для синхронизации`);
      
      for (const user of depositDiffs) {
        // Берем значение из главного поля, если оно не null
        const finalValue = user.uni_deposit_amount !== null 
          ? user.uni_deposit_amount 
          : user.uni_farming_deposit || 0;
          
        await supabase
          .from('users')
          .update({ 
            uni_deposit_amount: finalValue,
            uni_farming_deposit: finalValue 
          })
          .eq('id', user.id);
      }
      
      console.log(`✅ Синхронизировано ${depositDiffs.length} записей`);
    } else {
      console.log('✅ Все записи уже синхронизированы');
    }
    
    // 1.2 Синхронизация ton_boost_package
    console.log('\n1.2. Синхронизация ton_boost_package (главное поле)');
    
    const { data: boostDiffs } = await supabase
      .from('users')
      .select('id, ton_boost_package, ton_boost_package_id')
      .or('ton_boost_package.neq.ton_boost_package_id,and(ton_boost_package_id.not.is.null,ton_boost_package.eq.0)');
    
    if (boostDiffs && boostDiffs.length > 0) {
      console.log(`Найдено ${boostDiffs.length} записей для синхронизации`);
      
      for (const user of boostDiffs) {
        // Берем максимальное значение (не 0)
        const finalValue = Math.max(
          user.ton_boost_package || 0,
          user.ton_boost_package_id || 0
        );
          
        await supabase
          .from('users')
          .update({ 
            ton_boost_package: finalValue,
            ton_boost_package_id: finalValue 
          })
          .eq('id', user.id);
      }
      
      console.log(`✅ Синхронизировано ${boostDiffs.length} записей`);
    } else {
      console.log('✅ Все записи уже синхронизированы');
    }
    
    // 1.3 Миграция wallet → ton_wallet_address
    console.log('\n1.3. Миграция wallet → ton_wallet_address');
    
    const { data: walletDiffs } = await supabase
      .from('users')
      .select('id, wallet, ton_wallet_address')
      .or('wallet.neq.ton_wallet_address,and(wallet.not.is.null,ton_wallet_address.is.null),and(wallet.is.null,ton_wallet_address.not.is.null)');
    
    if (walletDiffs && walletDiffs.length > 0) {
      console.log(`Найдено ${walletDiffs.length} записей для миграции`);
      
      for (const user of walletDiffs) {
        // Берем непустое значение
        const finalValue = user.ton_wallet_address || user.wallet || null;
          
        await supabase
          .from('users')
          .update({ 
            ton_wallet_address: finalValue,
            wallet: finalValue // временно синхронизируем для безопасности
          })
          .eq('id', user.id);
      }
      
      console.log(`✅ Мигрировано ${walletDiffs.length} записей`);
    } else {
      console.log('✅ Все записи уже мигрированы');
    }
    
    results.push({
      phase: 'Синхронизация данных',
      success: true,
      details: {
        uni_deposit: depositDiffs?.length || 0,
        ton_boost: boostDiffs?.length || 0,
        wallet: walletDiffs?.length || 0
      },
      errors: []
    });
    
    // ФАЗА 2: АНАЛИЗ ИСПОЛЬЗОВАНИЯ В КОДЕ
    console.log('\n\n📝 ФАЗА 2: АНАЛИЗ ИСПОЛЬЗОВАНИЯ В КОДЕ');
    console.log('-'.repeat(60));
    
    const codeUpdates = {
      'uni_farming_deposit': 'uni_deposit_amount',
      'ton_boost_package_id': 'ton_boost_package',
      'wallet': 'ton_wallet_address'
    };
    
    const filesNeedingUpdate: Set<string> = new Set();
    
    // Поиск файлов, которые нужно обновить
    const directories = ['modules', 'server', 'client/src', 'shared'];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    
    for (const [oldField, newField] of Object.entries(codeUpdates)) {
      console.log(`\nПоиск использований поля: ${oldField}`);
      
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
                  new RegExp(`\\.${oldField}\\b`, 'g'),
                  new RegExp(`\\['${oldField}'\\]`, 'g'),
                  new RegExp(`\\["${oldField}"\\]`, 'g'),
                  new RegExp(`${oldField}:`, 'g')
                ];
                
                for (const pattern of patterns) {
                  if (pattern.test(content)) {
                    filesNeedingUpdate.add(fullPath.replace(path.join(__dirname, '..'), ''));
                    break;
                  }
                }
              }
            }
          } catch (error) {
            // Игнорируем ошибки доступа
          }
        };
        
        searchDir(dirPath);
      }
    }
    
    console.log(`\n📊 Найдено файлов для обновления: ${filesNeedingUpdate.size}`);
    if (filesNeedingUpdate.size > 0) {
      console.log('\nФайлы, требующие обновления:');
      Array.from(filesNeedingUpdate).slice(0, 10).forEach(file => {
        console.log(`  - ${file}`);
      });
      if (filesNeedingUpdate.size > 10) {
        console.log(`  ... и еще ${filesNeedingUpdate.size - 10} файлов`);
      }
    }
    
    results.push({
      phase: 'Анализ кода',
      success: true,
      details: {
        filesNeedingUpdate: filesNeedingUpdate.size,
        files: Array.from(filesNeedingUpdate)
      },
      errors: []
    });
    
    // ФАЗА 3: СОЗДАНИЕ SQL ДЛЯ УДАЛЕНИЯ ПОЛЕЙ
    console.log('\n\n🗑️ ФАЗА 3: ПОДГОТОВКА SQL ДЛЯ УДАЛЕНИЯ ПОЛЕЙ');
    console.log('-'.repeat(60));
    
    const dropFieldsSQL = `
-- SQL для удаления дублирующихся полей
-- ВНИМАНИЕ: Выполнять ТОЛЬКО после обновления всего кода!

-- Проверка данных перед удалением
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN uni_deposit_amount != uni_farming_deposit THEN 1 END) as deposit_diffs,
  COUNT(CASE WHEN ton_boost_package != ton_boost_package_id THEN 1 END) as boost_diffs,
  COUNT(CASE WHEN wallet != ton_wallet_address THEN 1 END) as wallet_diffs
FROM users;

-- Если все различия = 0, можно безопасно удалять поля:

-- 1. Удаление uni_farming_deposit (дубликат uni_deposit_amount)
ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_deposit;

-- 2. Удаление ton_boost_package_id (дубликат ton_boost_package)
ALTER TABLE users DROP COLUMN IF EXISTS ton_boost_package_id;

-- 3. Удаление wallet (заменен на ton_wallet_address)
ALTER TABLE users DROP COLUMN IF EXISTS wallet;

-- Проверка результата
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name IN ('uni_farming_deposit', 'ton_boost_package_id', 'wallet');
`;

    fs.writeFileSync(
      path.join(__dirname, '..', 'DROP_DUPLICATE_FIELDS.sql'),
      dropFieldsSQL
    );
    
    console.log('✅ SQL для удаления полей сохранен в DROP_DUPLICATE_FIELDS.sql');
    
    // Сохраняем полный отчет о миграции
    const migrationReport = {
      timestamp: new Date().toISOString(),
      phases: results,
      summary: {
        dataSync: {
          uni_deposit: depositDiffs?.length || 0,
          ton_boost: boostDiffs?.length || 0,
          wallet: walletDiffs?.length || 0
        },
        codeChangesNeeded: filesNeedingUpdate.size,
        fieldsToRemove: ['uni_farming_deposit', 'ton_boost_package_id', 'wallet'],
        fieldsToKeep: {
          'uni_deposit_amount': 'Главное поле для UNI депозита',
          'balance_uni': 'Общий баланс UNI',
          'uni_farming_balance': 'Накопления от фарминга (НЕ дубликат!)',
          'ton_boost_package': 'ID пакета TON Boost',
          'ton_wallet_address': 'TON адрес кошелька'
        }
      },
      nextSteps: [
        '1. Обновить код во всех файлах для использования главных полей',
        '2. Протестировать систему после обновления кода',
        '3. Выполнить DROP_DUPLICATE_FIELDS.sql для удаления дубликатов',
        '4. Удалить или обновить Views если они больше не нужны'
      ]
    };
    
    fs.writeFileSync(
      path.join(__dirname, '..', 'MIGRATION_REPORT_' + new Date().toISOString().split('T')[0] + '.json'),
      JSON.stringify(migrationReport, null, 2)
    );
    
    // Итоговый отчет
    console.log('\n\n✅ МИГРАЦИЯ ЗАВЕРШЕНА!');
    console.log('='.repeat(80));
    console.log('\n📊 РЕЗУЛЬТАТЫ:');
    console.log(`  - Синхронизировано UNI deposit записей: ${depositDiffs?.length || 0}`);
    console.log(`  - Синхронизировано TON boost записей: ${boostDiffs?.length || 0}`);
    console.log(`  - Мигрировано wallet записей: ${walletDiffs?.length || 0}`);
    console.log(`  - Файлов кода требуют обновления: ${filesNeedingUpdate.size}`);
    
    console.log('\n🎯 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('1. Обновите код во всех файлах (список в отчете)');
    console.log('2. Протестируйте систему');
    console.log('3. Выполните DROP_DUPLICATE_FIELDS.sql в Supabase');
    
    console.log('\n📄 Созданные файлы:');
    console.log('  - MIGRATION_REPORT_' + new Date().toISOString().split('T')[0] + '.json');
    console.log('  - DROP_DUPLICATE_FIELDS.sql');
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    results.push({
      phase: 'Ошибка миграции',
      success: false,
      details: {},
      errors: [error.message]
    });
  }
}

// Запуск миграции
console.log('Запускаю полную миграцию полей...\n');
console.log('⚠️  ВНИМАНИЕ: Этот скрипт выполнит финальную синхронизацию данных!');
console.log('После этого нужно будет обновить код и удалить дубликаты.');
console.log('Начинаю через 5 секунд...\n');

setTimeout(() => {
  completeFieldMigration().catch(console.error);
}, 5000);