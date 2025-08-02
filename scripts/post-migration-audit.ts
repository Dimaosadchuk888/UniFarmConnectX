import { supabase } from '../core/supabase.js';
import { glob } from 'glob';
import fs from 'fs/promises';

interface AuditResult {
  database: {
    tables: string[];
    userColumns: string[];
    deletedColumns: string[];
    views: string[];
  };
  code: {
    filesChecked: number;
    filesWithIssues: string[];
    removedFieldUsage: {
      uni_farming_deposit: number;
      ton_boost_package_id: number;
      wallet: number;
    };
    primaryFieldUsage: {
      uni_deposit_amount: number;
      ton_boost_package: number;
      ton_wallet_address: number;
    };
  };
  status: 'SUCCESS' | 'FAILED';
  issues: string[];
}

async function auditDatabase(): Promise<AuditResult['database']> {
  console.log('🔍 Аудит базы данных...');
  
  // Проверяем колонки таблицы users
  const { data: columns } = await supabase.rpc('get_table_columns', { table_name: 'users' });
  const userColumns = columns?.map((c: any) => c.column_name) || [];
  
  // Проверяем удаленные колонки
  const deletedColumns = ['uni_farming_deposit', 'ton_boost_package_id', 'wallet'];
  const stillExists = deletedColumns.filter(col => userColumns.includes(col));
  
  // Проверяем views
  const { data: views } = await supabase.rpc('get_views');
  const viewNames = views?.map((v: any) => v.table_name) || [];
  
  // Проверяем таблицы
  const { data: tables } = await supabase.rpc('get_tables');
  const tableNames = tables?.map((t: any) => t.table_name) || [];
  
  return {
    tables: tableNames,
    userColumns,
    deletedColumns: stillExists,
    views: viewNames
  };
}

async function auditCode(): Promise<AuditResult['code']> {
  console.log('🔍 Аудит кода...');
  
  const files = await glob([
    'client/**/*.{ts,tsx}',
    'server/**/*.{ts,js}',
    'modules/**/*.{ts,js}',
    'shared/**/*.{ts,js}'
  ]);
  
  const removedFieldUsage = {
    uni_farming_deposit: 0,
    ton_boost_package_id: 0,
    wallet: 0
  };
  
  const primaryFieldUsage = {
    uni_deposit_amount: 0,
    ton_boost_package: 0,
    ton_wallet_address: 0
  };
  
  const filesWithIssues: string[] = [];
  
  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    
    // Проверяем использование удаленных полей
    if (content.includes('uni_farming_deposit')) {
      removedFieldUsage.uni_farming_deposit++;
      filesWithIssues.push(file);
    }
    if (content.includes('ton_boost_package_id')) {
      removedFieldUsage.ton_boost_package_id++;
      filesWithIssues.push(file);
    }
    if (content.includes('wallet') && !content.includes('ton_wallet_address')) {
      // Более точная проверка для wallet
      if (content.match(/[^_]wallet[^_]/)) {
        removedFieldUsage.wallet++;
        filesWithIssues.push(file);
      }
    }
    
    // Подсчитываем использование основных полей
    if (content.includes('uni_deposit_amount')) {
      primaryFieldUsage.uni_deposit_amount++;
    }
    if (content.includes('ton_boost_package')) {
      primaryFieldUsage.ton_boost_package++;
    }
    if (content.includes('ton_wallet_address')) {
      primaryFieldUsage.ton_wallet_address++;
    }
  }
  
  return {
    filesChecked: files.length,
    filesWithIssues: [...new Set(filesWithIssues)],
    removedFieldUsage,
    primaryFieldUsage
  };
}

async function performAudit(): Promise<void> {
  console.log('🚀 АУДИТ СИСТЕМЫ ПОСЛЕ МИГРАЦИИ');
  console.log('='.repeat(60));
  console.log(`📅 Дата: ${new Date().toISOString()}`);
  console.log('\n');
  
  const result: AuditResult = {
    database: await auditDatabase(),
    code: await auditCode(),
    status: 'SUCCESS',
    issues: []
  };
  
  // Анализ результатов БД
  console.log('📊 РЕЗУЛЬТАТЫ АУДИТА БАЗЫ ДАННЫХ:');
  console.log('-'.repeat(40));
  console.log(`✅ Таблиц найдено: ${result.database.tables.length}`);
  console.log(`✅ Колонок в users: ${result.database.userColumns.length}`);
  console.log(`✅ Views создано: ${result.database.views.length}`);
  
  if (result.database.deletedColumns.length > 0) {
    console.log(`❌ ПРОБЛЕМА: Дублирующиеся поля все еще существуют!`);
    console.log(`   Найдены: ${result.database.deletedColumns.join(', ')}`);
    result.issues.push('Дублирующиеся поля не удалены из БД');
    result.status = 'FAILED';
  } else {
    console.log(`✅ Все дублирующиеся поля успешно удалены!`);
  }
  
  // Проверка наличия основных полей
  const requiredFields = ['uni_deposit_amount', 'ton_boost_package', 'ton_wallet_address'];
  const missingFields = requiredFields.filter(f => !result.database.userColumns.includes(f));
  
  if (missingFields.length > 0) {
    console.log(`❌ ПРОБЛЕМА: Отсутствуют основные поля: ${missingFields.join(', ')}`);
    result.issues.push('Отсутствуют основные поля в БД');
    result.status = 'FAILED';
  } else {
    console.log(`✅ Все основные поля присутствуют в БД`);
  }
  
  // Анализ результатов кода
  console.log('\n📊 РЕЗУЛЬТАТЫ АУДИТА КОДА:');
  console.log('-'.repeat(40));
  console.log(`✅ Файлов проверено: ${result.code.filesChecked}`);
  
  if (Object.values(result.code.removedFieldUsage).some(v => v > 0)) {
    console.log(`❌ ПРОБЛЕМА: Найдено использование удаленных полей:`);
    Object.entries(result.code.removedFieldUsage).forEach(([field, count]) => {
      if (count > 0) {
        console.log(`   - ${field}: ${count} раз`);
      }
    });
    console.log(`   Файлы с проблемами: ${result.code.filesWithIssues.join(', ')}`);
    result.issues.push('Код все еще использует удаленные поля');
    result.status = 'FAILED';
  } else {
    console.log(`✅ Удаленные поля не используются в коде!`);
  }
  
  console.log(`\n✅ Использование основных полей:`);
  Object.entries(result.code.primaryFieldUsage).forEach(([field, count]) => {
    console.log(`   - ${field}: ${count} раз`);
  });
  
  // Финальный вердикт
  console.log('\n' + '='.repeat(60));
  console.log('🎯 ФИНАЛЬНЫЙ СТАТУС МИГРАЦИИ:');
  console.log('-'.repeat(40));
  
  if (result.status === 'SUCCESS') {
    console.log('✅ МИГРАЦИЯ УСПЕШНО ЗАВЕРШЕНА!');
    console.log('✅ База данных очищена от дублирующихся полей');
    console.log('✅ Код использует только основные поля');
    console.log('✅ Views обеспечивают обратную совместимость');
  } else {
    console.log('❌ МИГРАЦИЯ ТРЕБУЕТ ВНИМАНИЯ!');
    console.log('Обнаруженные проблемы:');
    result.issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  // Сохраняем отчет
  const report = {
    timestamp: new Date().toISOString(),
    result,
    summary: {
      databaseStatus: result.database.deletedColumns.length === 0 ? 'CLEAN' : 'NEEDS_CLEANUP',
      codeStatus: Object.values(result.code.removedFieldUsage).every(v => v === 0) ? 'CLEAN' : 'NEEDS_CLEANUP',
      overallStatus: result.status
    }
  };
  
  await fs.writeFile(
    'POST_MIGRATION_AUDIT_REPORT.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📄 Отчет сохранен в POST_MIGRATION_AUDIT_REPORT.json');
}

// Создаем необходимые RPC функции если их нет
async function createRPCFunctions() {
  try {
    // Функция для получения колонок таблицы
    await supabase.rpc('create_function', {
      name: 'get_table_columns',
      definition: `
        CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
        RETURNS TABLE(column_name text) AS $$
        BEGIN
          RETURN QUERY
          SELECT c.column_name::text
          FROM information_schema.columns c
          WHERE c.table_schema = 'public' 
            AND c.table_name = get_table_columns.table_name;
        END;
        $$ LANGUAGE plpgsql;
      `
    });
  } catch (e) {
    // Функция уже существует
  }
  
  try {
    // Функция для получения views
    await supabase.rpc('create_function', {
      name: 'get_views',
      definition: `
        CREATE OR REPLACE FUNCTION get_views()
        RETURNS TABLE(table_name text) AS $$
        BEGIN
          RETURN QUERY
          SELECT v.table_name::text
          FROM information_schema.views v
          WHERE v.table_schema = 'public';
        END;
        $$ LANGUAGE plpgsql;
      `
    });
  } catch (e) {
    // Функция уже существует
  }
  
  try {
    // Функция для получения таблиц
    await supabase.rpc('create_function', {
      name: 'get_tables',
      definition: `
        CREATE OR REPLACE FUNCTION get_tables()
        RETURNS TABLE(table_name text) AS $$
        BEGIN
          RETURN QUERY
          SELECT t.table_name::text
          FROM information_schema.tables t
          WHERE t.table_schema = 'public' 
            AND t.table_type = 'BASE TABLE';
        END;
        $$ LANGUAGE plpgsql;
      `
    });
  } catch (e) {
    // Функция уже существует
  }
}

// Запускаем аудит
createRPCFunctions()
  .then(() => performAudit())
  .catch(console.error);