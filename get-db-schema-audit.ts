import { supabase } from './core/supabaseClient';

async function getDatabaseSchemaAudit() {
  console.log('=== ПОЛНЫЙ АУДИТ СХЕМЫ БАЗЫ ДАННЫХ UNIFARM ===\n');
  
  // Получаем все таблицы
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE')
    .order('table_name');
    
  console.log(`Найдено таблиц: ${tables?.length || 0}\n`);
  
  const schema = [];
  
  // Для каждой таблицы получаем структуру
  for (const table of tables || []) {
    const tableName = table.table_name;
    
    // Получаем колонки таблицы
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default, character_maximum_length, numeric_precision, numeric_scale')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position');
      
    console.log(`\nТаблица: ${tableName}`);
    console.log('=' . repeat(50));
    
    for (const col of columns || []) {
      let dataType = col.data_type;
      
      // Добавляем детали типа
      if (col.character_maximum_length) {
        dataType += `(${col.character_maximum_length})`;
      } else if (col.numeric_precision) {
        dataType += `(${col.numeric_precision}`;
        if (col.numeric_scale) {
          dataType += `,${col.numeric_scale}`;
        }
        dataType += ')';
      }
      
      console.log(`- ${col.column_name}: ${dataType}, nullable: ${col.is_nullable}, default: ${col.column_default || 'NULL'}`);
      
      schema.push({
        table_name: tableName,
        column_name: col.column_name,
        data_type: dataType,
        is_nullable: col.is_nullable,
        column_default: col.column_default || 'NULL'
      });
    }
  }
  
  // Сохраняем схему в файл
  const fs = await import('fs');
  fs.writeFileSync('schema_audit_raw.json', JSON.stringify(schema, null, 2));
  
  console.log('\n\nСхема сохранена в schema_audit_raw.json');
  
  // Дополнительная проверка constraints
  console.log('\n\n=== ПРОВЕРКА CONSTRAINTS ===');
  
  const { data: constraints } = await supabase
    .from('information_schema.table_constraints')
    .select('table_name, constraint_name, constraint_type')
    .eq('table_schema', 'public')
    .in('constraint_type', ['PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE'])
    .order('table_name');
    
  const constraintsByTable = {};
  constraints?.forEach(c => {
    if (!constraintsByTable[c.table_name]) {
      constraintsByTable[c.table_name] = [];
    }
    constraintsByTable[c.table_name].push(`${c.constraint_type}: ${c.constraint_name}`);
  });
  
  for (const [table, tableConstraints] of Object.entries(constraintsByTable)) {
    console.log(`\n${table}:`);
    tableConstraints.forEach(c => console.log(`  - ${c}`));
  }
  
  process.exit(0);
}

getDatabaseSchemaAudit().catch(console.error);