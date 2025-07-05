/**
 * Скрипт для проверки таблицы withdraw_requests в Supabase
 * Проверяет структуру, индексы и права доступа
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

async function checkWithdrawalTable() {
  console.log('=== Проверка таблицы withdraw_requests ===\n');

  try {
    // 1. Проверяем существование таблицы
    console.log('1. Проверка существования таблицы...');
    const { data: tableExists, error: tableError } = await supabase
      .from('withdraw_requests')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === 'PGRST116') {
      console.log('❌ Таблица withdraw_requests НЕ существует!');
      console.log('   Выполните SQL скрипт create-withdrawal-table.sql в Supabase Dashboard');
      return;
    }

    console.log('✅ Таблица withdraw_requests существует');

    // 2. Проверяем структуру таблицы
    console.log('\n2. Проверка структуры таблицы...');
    const { data: columns, error: columnsError } = await supabase.rpc('get_table_columns', {
      table_name: 'withdraw_requests'
    }).single();

    if (columnsError) {
      // Альтернативный способ - попробуем создать тестовую запись
      console.log('   Пробуем альтернативную проверку структуры...');
      
      const testRecord = {
        user_id: 999999,
        telegram_id: 'test_telegram_id',
        username: 'test_user',
        amount_ton: 1.5,
        ton_wallet: 'UQCtest_wallet_address',
        status: 'pending'
      };

      const { data: insertTest, error: insertError } = await supabase
        .from('withdraw_requests')
        .insert(testRecord)
        .select()
        .single();

      if (insertError) {
        console.log('❌ Ошибка при вставке тестовой записи:', insertError.message);
        console.log('   Возможно, структура таблицы не соответствует ожидаемой');
      } else {
        console.log('✅ Структура таблицы соответствует ожидаемой');
        console.log('   Созданная тестовая запись:', {
          id: insertTest.id,
          user_id: insertTest.user_id,
          amount_ton: insertTest.amount_ton,
          status: insertTest.status
        });

        // Удаляем тестовую запись
        await supabase
          .from('withdraw_requests')
          .delete()
          .eq('id', insertTest.id);
        console.log('   Тестовая запись удалена');
      }
    } else {
      console.log('✅ Получена информация о колонках таблицы');
    }

    // 3. Проверяем количество записей
    console.log('\n3. Проверка записей в таблице...');
    const { count, error: countError } = await supabase
      .from('withdraw_requests')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`✅ Количество записей в таблице: ${count || 0}`);
    }

    // 4. Проверяем последние заявки
    console.log('\n4. Последние заявки на вывод...');
    const { data: requests, error: requestsError } = await supabase
      .from('withdraw_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!requestsError && requests) {
      if (requests.length === 0) {
        console.log('   Заявок на вывод пока нет');
      } else {
        console.log(`   Найдено ${requests.length} заявок:`);
        requests.forEach((req, index) => {
          console.log(`   ${index + 1}. ID: ${req.id}`);
          console.log(`      User: ${req.username || req.telegram_id} (ID: ${req.user_id})`);
          console.log(`      Amount: ${req.amount_ton} TON`);
          console.log(`      Status: ${req.status}`);
          console.log(`      Created: ${new Date(req.created_at).toLocaleString()}`);
          if (req.processed_at) {
            console.log(`      Processed: ${new Date(req.processed_at).toLocaleString()} by ${req.processed_by}`);
          }
          console.log('');
        });
      }
    }

    // 5. Проверяем статистику по статусам
    console.log('\n5. Статистика по статусам...');
    const statuses = ['pending', 'approved', 'rejected'];
    
    for (const status of statuses) {
      const { count: statusCount } = await supabase
        .from('withdraw_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);
      
      console.log(`   ${status}: ${statusCount || 0} заявок`);
    }

    console.log('\n✅ Проверка завершена успешно!');
    console.log('   Таблица withdraw_requests готова к использованию');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем проверку
checkWithdrawalTable();