/**
 * SUPABASE SCHEMA AUDIT SCRIPT
 * Полный аудит всех таблиц и полей в Supabase
 * для синхронизации с roadmap.md и системой UniFarm
 */

import { supabase } from '../core/supabase.ts';

async function auditSupabaseSchema() {
  console.log('🔍 НАЧИНАЕМ ПОЛНЫЙ АУДИТ SUPABASE SCHEMA...\n');
  
  const auditResults = {
    tables: [],
    totalTables: 0,
    totalColumns: 0,
    timestamp: new Date().toISOString()
  };

  try {
    // 1. Получаем список всех таблиц
    console.log('📊 Получение списка всех таблиц...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      // Альтернативный способ через SQL
      const { data: tablesSQL, error: sqlError } = await supabase.rpc('get_all_tables', {});
      
      if (sqlError) {
        console.error('❌ Ошибка получения таблиц:', sqlError);
        
        // Используем известные таблицы из системы
        const knownTables = [
          'users',
          'user_sessions', 
          'transactions',
          'referrals',
          'farming_sessions',
          'boost_purchases',
          'missions',
          'user_missions',
          'airdrops',
          'daily_bonus_logs',
          'withdraw_requests'
        ];
        
        console.log('⚠️ Используем известные таблицы из системы:', knownTables.length);
        
        for (const tableName of knownTables) {
          await analyzeTable(tableName, auditResults);
        }
      }
    } else if (tables) {
      console.log(`✅ Найдено таблиц: ${tables.length}\n`);
      
      for (const table of tables) {
        await analyzeTable(table.table_name, auditResults);
      }
    }

    // Сохраняем результаты
    await saveAuditResults(auditResults);
    
    console.log('\n✅ АУДИТ ЗАВЕРШЕН!');
    console.log(`📊 Всего таблиц: ${auditResults.totalTables}`);
    console.log(`📊 Всего полей: ${auditResults.totalColumns}`);
    
  } catch (error) {
    console.error('❌ Критическая ошибка аудита:', error);
  }
}

async function analyzeTable(tableName, auditResults) {
  console.log(`\n🔍 Анализ таблицы: ${tableName}`);
  
  const tableInfo = {
    name: tableName,
    columns: [],
    indexes: [],
    foreignKeys: [],
    rowCount: 0
  };

  try {
    // Получаем структуру таблицы через простой запрос
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (!sampleError && sampleData) {
      // Анализируем структуру по образцу данных
      const sample = sampleData[0] || {};
      const columns = Object.keys(sample);
      
      console.log(`  ✅ Найдено полей: ${columns.length}`);
      
      for (const columnName of columns) {
        const columnInfo = {
          name: columnName,
          type: typeof sample[columnName],
          sampleValue: sample[columnName],
          isNullable: sample[columnName] === null
        };
        
        tableInfo.columns.push(columnInfo);
        auditResults.totalColumns++;
      }
      
      // Получаем количество записей
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
        
      if (!countError) {
        tableInfo.rowCount = count || 0;
        console.log(`  📊 Записей в таблице: ${tableInfo.rowCount}`);
      }
    } else {
      console.log(`  ⚠️ Не удалось получить структуру таблицы: ${sampleError?.message}`);
      
      // Используем известную структуру для критических таблиц
      if (tableName === 'users') {
        tableInfo.columns = [
          { name: 'id', type: 'number' },
          { name: 'telegram_id', type: 'number' },
          { name: 'username', type: 'string' },
          { name: 'first_name', type: 'string' },
          { name: 'last_name', type: 'string' },
          { name: 'ref_code', type: 'string' },
          { name: 'referrer_id', type: 'number' },
          { name: 'balance_uni', type: 'number' },
          { name: 'balance_ton', type: 'number' },
          { name: 'uni_farming_active', type: 'boolean' },
          { name: 'uni_deposit_amount', type: 'number' },
          { name: 'uni_farming_balance', type: 'number' },
          { name: 'uni_farming_start_timestamp', type: 'string' },
          { name: 'ton_boost_package', type: 'number' },
          { name: 'is_admin', type: 'boolean' },
          { name: 'created_at', type: 'string' },
          { name: 'updated_at', type: 'string' }
        ];
      }
    }
    
    auditResults.tables.push(tableInfo);
    auditResults.totalTables++;
    
  } catch (error) {
    console.error(`  ❌ Ошибка анализа таблицы ${tableName}:`, error.message);
  }
}

async function saveAuditResults(auditResults) {
  const fs = await import('fs/promises');
  
  // Сохраняем полный JSON отчет
  await fs.writeFile(
    'SUPABASE_SCHEMA_AUDIT.json',
    JSON.stringify(auditResults, null, 2)
  );
  
  // Создаем читаемый отчет
  let report = `# SUPABASE SCHEMA AUDIT REPORT\n\n`;
  report += `**Дата аудита**: ${auditResults.timestamp}\n`;
  report += `**Всего таблиц**: ${auditResults.totalTables}\n`;
  report += `**Всего полей**: ${auditResults.totalColumns}\n\n`;
  
  report += `## 📊 СТРУКТУРА БАЗЫ ДАННЫХ\n\n`;
  
  for (const table of auditResults.tables) {
    report += `### 📁 Таблица: \`${table.name}\`\n`;
    report += `**Записей**: ${table.rowCount}\n`;
    report += `**Полей**: ${table.columns.length}\n\n`;
    
    if (table.columns.length > 0) {
      report += `| Поле | Тип | Nullable | Пример значения |\n`;
      report += `|------|-----|----------|----------------|\n`;
      
      for (const col of table.columns) {
        const sampleValue = col.sampleValue !== null ? 
          String(col.sampleValue).substring(0, 30) : 'NULL';
        report += `| ${col.name} | ${col.type} | ${col.isNullable ? 'YES' : 'NO'} | ${sampleValue} |\n`;
      }
      report += `\n`;
    }
  }
  
  await fs.writeFile('SUPABASE_SCHEMA_AUDIT_REPORT.md', report);
  
  console.log('\n📄 Отчеты сохранены:');
  console.log('  - SUPABASE_SCHEMA_AUDIT.json');
  console.log('  - SUPABASE_SCHEMA_AUDIT_REPORT.md');
}

// Запускаем аудит
auditSupabaseSchema().catch(console.error);