/**
 * 🔍 ПРОВЕРКА ВСЕХ ТАБЛИЦ НА НАЛИЧИЕ ДАННЫХ О ПАКЕТЕ 290
 */

import { supabase } from './core/supabase';

async function checkAllTablesFor290() {
  console.log('\n🔍 === ПОИСК ПАКЕТА ID 290 ВО ВСЕХ ТАБЛИЦАХ ===\n');

  try {
    // Получаем список всех таблиц
    const { data: allTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
      
    if (tablesError || !allTables) {
      console.log('❌ Ошибка получения списка таблиц:', tablesError?.message);
      return;
    }

    console.log(`✅ Найдено ${allTables.length} таблиц в базе данных:`);
    allTables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    console.log('\n🔍 Проверяем каждую таблицу на наличие данных с ID/boost_id/package_id = 290...\n');

    // Список потенциальных полей где может быть ID 290
    const possibleFields = ['id', 'boost_id', 'package_id', 'ton_boost_package_id', 'boost_package_id'];

    for (const table of allTables) {
      const tableName = table.table_name;
      
      console.log(`\n🔍 Проверяем таблицу: ${tableName}`);
      console.log('================================');

      try {
        // Получаем структуру таблицы
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type')
          .eq('table_name', tableName)
          .eq('table_schema', 'public');

        if (columnsError) {
          console.log(`   ❌ Ошибка получения структуры: ${columnsError.message}`);
          continue;
        }

        const columnNames = columns?.map(col => col.column_name) || [];
        console.log(`   📊 Колонки: ${columnNames.join(', ')}`);

        // Проверяем на каждое потенциальное поле
        for (const field of possibleFields) {
          if (columnNames.includes(field)) {
            try {
              const { data: records, error: recordsError } = await supabase
                .from(tableName)
                .select('*')
                .eq(field, 290)
                .limit(5);

              if (!recordsError && records?.length) {
                console.log(`   🎯 НАЙДЕНО! В поле ${field}:`);
                records.forEach((record, index) => {
                  console.log(`      Запись #${index + 1}: ${JSON.stringify(record, null, 8)}`);
                });
              } else if (recordsError) {
                console.log(`   ⚠️ Ошибка проверки поля ${field}: ${recordsError.message}`);
              }
            } catch (e) {
              console.log(`   ⚠️ Ошибка при проверке ${field}: ${e}`);
            }
          }
        }

        // Дополнительно проверяем JSON поля на наличие 290
        const jsonColumns = columns?.filter(col => 
          col.data_type === 'json' || col.data_type === 'jsonb'
        ) || [];

        for (const jsonCol of jsonColumns) {
          try {
            const { data: jsonRecords, error: jsonError } = await supabase
              .from(tableName)
              .select('*')
              .or(`${jsonCol.column_name}::text.ilike.%290%`);

            if (!jsonError && jsonRecords?.length) {
              console.log(`   🎯 НАЙДЕНО в JSON поле ${jsonCol.column_name}:`);
              jsonRecords.slice(0, 3).forEach((record, index) => {
                console.log(`      JSON запись #${index + 1}: ${JSON.stringify(record, null, 8)}`);
              });
            }
          } catch (e) {
            // Игнорируем ошибки JSON поиска
          }
        }

        // Проверяем текстовые поля на упоминание 290
        const textColumns = columns?.filter(col => 
          col.data_type === 'text' || col.data_type === 'character varying'
        ) || [];

        for (const textCol of textColumns) {
          if (textCol.column_name === 'description' || textCol.column_name.includes('name')) {
            try {
              const { data: textRecords, error: textError } = await supabase
                .from(tableName)
                .select('*')
                .ilike(textCol.column_name, '%290%')
                .limit(3);

              if (!textError && textRecords?.length) {
                console.log(`   🎯 НАЙДЕНО в текстовом поле ${textCol.column_name}:`);
                textRecords.forEach((record, index) => {
                  console.log(`      Текст запись #${index + 1}: ${JSON.stringify(record, null, 8)}`);
                });
              }
            } catch (e) {
              // Игнорируем ошибки текстового поиска
            }
          }
        }

        console.log(`   ✓ Проверка завершена`);

      } catch (tableError) {
        console.log(`   ❌ Ошибка доступа к таблице: ${tableError}`);
      }
    }

    console.log('\n✅ === ПРОВЕРКА ВСЕХ ТАБЛИЦ ЗАВЕРШЕНА ===\n');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем проверку
checkAllTablesFor290();