/**
 * 🚨 СРОЧНАЯ ДИАГНОСТИКА: КУДА ПИШУТСЯ TON ДЕПОЗИТЫ И ПОЧЕМУ НЕ РАБОТАЕТ ТОН ФАРМИНГ
 * Полная проверка структуры БД и логики записи депозитов
 */

import { supabase } from './core/supabase';

async function urgentTonDepositsInvestigation() {
  console.log('\n🚨 === СРОЧНАЯ ДИАГНОСТИКА TON ДЕПОЗИТОВ ===\n');

  try {
    // 1. ПОЛУЧАЕМ ВСЕ ТАБЛИЦЫ В БД
    console.log('1️⃣ ПОЛНЫЙ СПИСОК ТАБЛИЦ В БАЗЕ ДАННЫХ:');
    console.log('=====================================');
    
    // Пробуем разные способы получить список таблиц
    try {
      const { data: tables1 } = await supabase.rpc('get_all_tables');
      if (tables1) {
        console.log('✅ Получено через RPC:', tables1.length, 'таблиц');
        tables1.forEach((table: any) => console.log(`   - ${table.table_name}`));
      }
    } catch (e) {
      console.log('ℹ️ RPC get_all_tables недоступен');
    }

    // Альтернативный способ - проверяем известные таблицы
    const knownTables = [
      'users', 'transactions', 'boost_purchases', 'boost_packages', 
      'ton_boost_packages', 'ton_farming_data', 'ton_deposits', 
      'ton_boost_deposits', 'farming_packages', 'user_boosts',
      'boosts', 'deposits', 'ton_transactions', 'farming_deposits',
      'ton_farming', 'boost_transactions', 'payment_transactions'
    ];

    console.log('\n📋 ПРОВЕРКА ИЗВЕСТНЫХ ТАБЛИЦ:');
    const existingTables: string[] = [];
    
    for (const tableName of knownTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        if (!error) {
          existingTables.push(tableName);
          console.log(`   ✅ ${tableName} - существует`);
        } else {
          console.log(`   ❌ ${tableName} - НЕ существует`);
        }
      } catch (e) {
        console.log(`   ❌ ${tableName} - недоступна`);
      }
    }

    // 2. АНАЛИЗ ВСЕХ TON ДЕПОЗИТОВ ПОЛЬЗОВАТЕЛЯ 290
    console.log('\n2️⃣ ПОИСК TON ДЕПОЗИТОВ ПОЛЬЗОВАТЕЛЯ 290 ВО ВСЕХ ТАБЛИЦАХ:');
    console.log('========================================================');
    
    for (const tableName of existingTables) {
      try {
        // Ищем записи пользователя 290 в каждой таблице
        const { data: records, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('user_id', 290);

        if (!error && records?.length) {
          console.log(`\n   🎯 НАЙДЕНО в таблице ${tableName}: ${records.length} записей`);
          records.forEach((record, index) => {
            console.log(`      Запись #${index + 1}:`);
            console.log(`      ${JSON.stringify(record, null, 8)}`);
          });
        }
      } catch (e) {
        // Игнорируем ошибки
      }
    }

    // 3. АНАЛИЗ ВСЕХ TON ТРАНЗАКЦИЙ
    console.log('\n3️⃣ ВСЕ TON ТРАНЗАКЦИИ В СИСТЕМЕ:');
    console.log('===============================');
    
    const { data: tonTransactions, error: tonTxError } = await supabase
      .from('transactions')
      .select('*')
      .or('currency.eq.TON,type.ilike.%TON%,description.ilike.%TON%')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!tonTxError && tonTransactions?.length) {
      console.log(`✅ Найдено ${tonTransactions.length} TON транзакций:`);
      tonTransactions.forEach((tx, index) => {
        console.log(`\n   TON Транзакция #${index + 1}:`);
        console.log(`     ID: ${tx.id}, User: ${tx.user_id}`);
        console.log(`     Тип: ${tx.type}, Сумма: ${tx.amount} ${tx.currency}`);
        console.log(`     Статус: ${tx.status}`);
        console.log(`     Описание: ${tx.description}`);
        console.log(`     Дата: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        if (tx.metadata) {
          console.log(`     Метаданные: ${JSON.stringify(tx.metadata, null, 8)}`);
        }
      });
    } else {
      console.log('❌ TON транзакций не найдено!');
    }

    // 4. СТРУКТУРА ТАБЛИЦЫ USERS - TON ПОЛЯ
    console.log('\n4️⃣ TON ПОЛЯ В ТАБЛИЦЕ USERS:');
    console.log('===========================');
    
    const { data: usersWithTonData, error: usersError } = await supabase
      .from('users')
      .select('id, balance_ton, ton_boost_package, ton_boost_package_id, ton_boost_active, ton_farming_balance, ton_farming_rate, ton_farming_start_timestamp')
      .not('balance_ton', 'eq', 0)
      .or('ton_boost_active.eq.true,ton_farming_balance.gt.0,balance_ton.gt.0')
      .limit(15);

    if (!usersError && usersWithTonData?.length) {
      console.log(`✅ Пользователи с TON данными (${usersWithTonData.length}):`);
      usersWithTonData.forEach(user => {
        console.log(`   User ${user.id}:`);
        console.log(`     balance_ton: ${user.balance_ton}`);
        console.log(`     ton_boost_package: ${user.ton_boost_package}`);
        console.log(`     ton_boost_package_id: ${user.ton_boost_package_id}`);
        console.log(`     ton_boost_active: ${user.ton_boost_active}`);
        console.log(`     ton_farming_balance: ${user.ton_farming_balance}`);
        console.log(`     ton_farming_rate: ${user.ton_farming_rate}`);
        console.log(`     ton_farming_start: ${user.ton_farming_start_timestamp || 'НЕТ'}`);
        console.log('     ---');
      });
    } else {
      console.log('❌ Пользователей с TON данными не найдено!');
    }

    // 5. ПОИСК ПЛАНИРОВЩИКОВ И ОБРАБОТЧИКОВ
    console.log('\n5️⃣ ПРОВЕРКА ЛОГИКИ ОБРАБОТКИ TON ДЕПОЗИТОВ:');
    console.log('===========================================');
    
    // Ищем pending транзакции
    const { data: pendingTx, error: pendingError } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'pending')
      .eq('currency', 'TON');

    if (!pendingError && pendingTx?.length) {
      console.log(`⚠️ НАЙДЕНЫ PENDING TON ТРАНЗАКЦИИ: ${pendingTx.length}`);
      pendingTx.forEach(tx => {
        console.log(`   Pending TX: User ${tx.user_id}, ${tx.amount} TON, ID ${tx.id}`);
      });
    } else {
      console.log('✅ Pending TON транзакций нет');
    }

    // 6. АНАЛИЗ КОНКРЕТНОГО ДЕПОЗИТА ПОЛЬЗОВАТЕЛЯ 290
    console.log('\n6️⃣ ДЕТАЛЬНЫЙ АНАЛИЗ ДЕПОЗИТА ПОЛЬЗОВАТЕЛЯ 290:');
    console.log('==============================================');
    
    const { data: user290Tx, error: user290Error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 290)
      .eq('type', 'DEPOSIT')
      .eq('currency', 'TON')
      .single();

    if (!user290Error && user290Tx) {
      console.log('🔍 Депозит пользователя 290:');
      console.log(`   TX ID: ${user290Tx.id}`);
      console.log(`   Сумма: ${user290Tx.amount} TON`);
      console.log(`   Статус: ${user290Tx.status}`);
      console.log(`   Дата: ${new Date(user290Tx.created_at).toLocaleString('ru-RU')}`);
      console.log(`   TX Hash: ${user290Tx.metadata?.tx_hash || 'НЕТ'}`);

      // Проверяем что произошло после депозита
      const { data: afterDeposit, error: afterError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', 290)
        .gte('created_at', user290Tx.created_at)
        .order('created_at', { ascending: true });

      if (!afterError && afterDeposit?.length) {
        console.log(`\n   📋 Все транзакции после депозита (${afterDeposit.length}):`);
        afterDeposit.forEach((tx, index) => {
          console.log(`      ${index + 1}. ${tx.type}: ${tx.amount} ${tx.currency} - ${tx.description}`);
        });
      }
    }

    // 7. КРИТИЧЕСКИЕ ВЫВОДЫ
    console.log('\n7️⃣ КРИТИЧЕСКИЕ ВЫВОДЫ:');
    console.log('======================');
    
    console.log('🔍 АНАЛИЗ СИСТЕМЫ:');
    console.log(`   - Существующих таблиц: ${existingTables.length}`);
    console.log(`   - TON транзакций в системе: ${tonTransactions?.length || 0}`);
    console.log(`   - Пользователей с TON данными: ${usersWithTonData?.length || 0}`);

    // Проверяем есть ли таблицы для TON фарминга
    const tonFarmingTables = existingTables.filter(table => 
      table.includes('ton_farming') || table.includes('ton_deposit') || table.includes('ton_boost')
    );
    
    if (tonFarmingTables.length === 0) {
      console.log('\n❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: НЕТ ТАБЛИЦ ДЛЯ TON ФАРМИНГА!');
      console.log('   Отсутствуют таблицы: ton_farming_data, ton_deposits, ton_boost_deposits');
      console.log('   Депозиты записываются только в transactions, но не обрабатываются дальше!');
    } else {
      console.log(`\n✅ Найдены TON таблицы: ${tonFarmingTables.join(', ')}`);
    }

    console.log('\n🚨 === ДИАГНОСТИКА ЗАВЕРШЕНА ===\n');

  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error);
  }
}

// Запускаем срочную диагностику
urgentTonDepositsInvestigation();