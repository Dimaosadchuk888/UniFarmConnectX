/**
 * 🔍 ПРОСТАЯ ПРОВЕРКА ОСНОВНЫХ ТАБЛИЦ НА НАЛИЧИЕ ПАКЕТА 290
 */

import { supabase } from './core/supabase';

async function simpleTableCheck290() {
  console.log('\n🔍 === ПРОВЕРКА ОСНОВНЫХ ТАБЛИЦ НА ПАКЕТ ID 290 ===\n');

  // Список основных таблиц для проверки
  const tablesToCheck = [
    'users',
    'transactions', 
    'boost_purchases',
    'boost_packages',
    'ton_boost_packages',
    'ton_farming_data',
    'ton_deposits',
    'ton_boost_deposits',
    'farming_packages',
    'user_boosts',
    'boosts'
  ];

  for (const tableName of tablesToCheck) {
    console.log(`\n🔍 Проверяем таблицу: ${tableName}`);
    console.log('=====================================');

    try {
      // Проверяем разные возможные поля с ID 290
      const fieldsToCheck = ['id', 'boost_id', 'package_id', 'ton_boost_package_id', 'boost_package_id'];
      
      for (const field of fieldsToCheck) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq(field, 290)
            .limit(5);

          if (!error && data?.length) {
            console.log(`   🎯 НАЙДЕНО! В поле ${field}:`);
            data.forEach((record, index) => {
              console.log(`      Запись #${index + 1}:`);
              console.log(`      ${JSON.stringify(record, null, 6)}`);
            });
          }
        } catch (e) {
          // Поле не существует, продолжаем
        }
      }

      // Проверяем текстовые поля на упоминание 290
      try {
        const { data: textData, error: textError } = await supabase
          .from(tableName)
          .select('*')
          .or('description.ilike.%290%,name.ilike.%290%,title.ilike.%290%')
          .limit(3);

        if (!textError && textData?.length) {
          console.log(`   📝 Найдено упоминание "290" в текстовых полях:`);
          textData.forEach((record, index) => {
            console.log(`      Текст запись #${index + 1}:`);
            console.log(`      ${JSON.stringify(record, null, 6)}`);
          });
        }
      } catch (e) {
        // Игнорируем ошибки
      }

      // Если это таблица users, дополнительно проверяем TON Boost поля
      if (tableName === 'users') {
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, telegram_id, username, ton_boost_package_id, ton_boost_active, ton_boost_rate, balance_ton')
            .not('ton_boost_package_id', 'is', null)
            .limit(10);

          if (!userError && userData?.length) {
            console.log(`   👥 Пользователи с активными TON Boost пакетами:`);
            userData.forEach(user => {
              console.log(`      User ${user.id}: Package ID ${user.ton_boost_package_id}, Active: ${user.ton_boost_active}, Rate: ${user.ton_boost_rate}%`);
            });
          }
        } catch (e) {
          console.log(`   ⚠️ Ошибка проверки TON Boost полей: ${e}`);
        }
      }

      console.log(`   ✓ Проверка ${tableName} завершена`);

    } catch (tableError: any) {
      if (tableError.message?.includes('does not exist')) {
        console.log(`   ❌ Таблица ${tableName} не существует`);
      } else {
        console.log(`   ❌ Ошибка доступа к ${tableName}: ${tableError.message}`);
      }
    }
  }

  // Дополнительная проверка - поиск в транзакциях по metadata
  console.log('\n🔍 Дополнительная проверка metadata в транзакциях:');
  console.log('====================================================');
  
  try {
    const { data: metadataTransactions, error: metadataError } = await supabase
      .from('transactions')
      .select('*')
      .or('metadata::text.ilike.%290%,metadata->>boost_id.eq.290,metadata->>package_id.eq.290')
      .limit(10);

    if (!metadataError && metadataTransactions?.length) {
      console.log(`✅ Найдено ${metadataTransactions.length} транзакций с упоминанием 290 в metadata:`);
      metadataTransactions.forEach((tx, index) => {
        console.log(`\n   Транзакция #${index + 1}:`);
        console.log(`     ID: ${tx.id}, User: ${tx.user_id}, Type: ${tx.type}`);
        console.log(`     Amount: ${tx.amount} ${tx.currency}, Status: ${tx.status}`);
        console.log(`     Description: ${tx.description}`);
        if (tx.metadata) {
          console.log(`     Metadata: ${JSON.stringify(tx.metadata, null, 6)}`);
        }
      });
    } else {
      console.log('ℹ️ Транзакций с metadata содержащими 290 не найдено');
    }
  } catch (e) {
    console.log(`❌ Ошибка проверки metadata: ${e}`);
  }

  console.log('\n✅ === ПРОВЕРКА ЗАВЕРШЕНА ===\n');
}

// Запускаем проверку
simpleTableCheck290();