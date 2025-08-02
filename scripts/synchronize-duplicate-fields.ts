import { supabase } from '../core/supabase.js';
import * as fs from 'fs';

interface SyncResult {
  field1: string;
  field2: string;
  syncedCount: number;
  errors: string[];
}

async function synchronizeDuplicateFields() {
  console.log('🔄 СИНХРОНИЗАЦИЯ ДУБЛИРУЮЩИХСЯ ПОЛЕЙ\n');
  console.log('================================================================================\n');
  console.log('⚠️  ВНИМАНИЕ: Этот скрипт синхронизирует данные между дублирующимися полями');
  console.log('⚠️  Рекомендуется сделать резервную копию базы данных перед запуском\n');

  const results: SyncResult[] = [];

  try {
    // Получаем всех пользователей
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('id');

    if (error) throw error;
    
    console.log(`✅ Найдено пользователей: ${users?.length || 0}\n`);

    // 1. Синхронизация uni_deposit_amount и uni_farming_deposit (почти идентичны)
    console.log('📌 Синхронизация uni_deposit_amount ← → uni_farming_deposit\n');
    let syncedCount = 0;
    const errors: string[] = [];

    for (const user of users || []) {
      if (user.uni_deposit_amount !== user.uni_farming_deposit) {
        // Берем максимальное значение (чтобы не потерять данные)
        const maxValue = Math.max(
          Number(user.uni_deposit_amount) || 0,
          Number(user.uni_farming_deposit) || 0
        );

        console.log(`   User ${user.id}: ${user.uni_deposit_amount} vs ${user.uni_farming_deposit} → ${maxValue}`);

        const { error: updateError } = await supabase
          .from('users')
          .update({
            uni_deposit_amount: maxValue,
            uni_farming_deposit: maxValue
          })
          .eq('id', user.id);

        if (updateError) {
          errors.push(`User ${user.id}: ${updateError.message}`);
        } else {
          syncedCount++;
        }
      }
    }

    results.push({
      field1: 'uni_deposit_amount',
      field2: 'uni_farming_deposit',
      syncedCount,
      errors
    });

    console.log(`   ✅ Синхронизировано: ${syncedCount} записей\n`);

    // 2. Синхронизация ton_boost_package и ton_boost_package_id
    console.log('📌 Синхронизация ton_boost_package ← → ton_boost_package_id\n');
    syncedCount = 0;
    const errors2: string[] = [];

    for (const user of users || []) {
      // Логика: если ton_boost_package > 0, но ton_boost_package_id пустой, заполняем
      if (user.ton_boost_package > 0 && !user.ton_boost_package_id) {
        console.log(`   User ${user.id}: ton_boost_package=${user.ton_boost_package}, ton_boost_package_id=null → ${user.ton_boost_package}`);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            ton_boost_package_id: user.ton_boost_package
          })
          .eq('id', user.id);

        if (updateError) {
          errors2.push(`User ${user.id}: ${updateError.message}`);
        } else {
          syncedCount++;
        }
      }
      // Если ton_boost_package_id есть, но ton_boost_package = 0, синхронизируем
      else if (user.ton_boost_package_id && user.ton_boost_package === 0) {
        console.log(`   User ${user.id}: ton_boost_package=0, ton_boost_package_id=${user.ton_boost_package_id} → ${user.ton_boost_package_id}`);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            ton_boost_package: user.ton_boost_package_id
          })
          .eq('id', user.id);

        if (updateError) {
          errors2.push(`User ${user.id}: ${updateError.message}`);
        } else {
          syncedCount++;
        }
      }
    }

    results.push({
      field1: 'ton_boost_package',
      field2: 'ton_boost_package_id',
      syncedCount,
      errors: errors2
    });

    console.log(`   ✅ Синхронизировано: ${syncedCount} записей\n`);

    // 3. Заполнение uni_farming_balance из balance_uni (только если uni_farming_balance = 0)
    console.log('📌 Заполнение пустых uni_farming_balance из balance_uni\n');
    syncedCount = 0;
    const errors3: string[] = [];

    for (const user of users || []) {
      // Заполняем только если uni_farming_balance = 0, а balance_uni > 0
      if (user.uni_farming_balance === 0 && user.balance_uni > 0 && user.uni_farming_active) {
        console.log(`   User ${user.id}: uni_farming_balance=0, balance_uni=${user.balance_uni} → ${user.balance_uni}`);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            uni_farming_balance: user.balance_uni
          })
          .eq('id', user.id);

        if (updateError) {
          errors3.push(`User ${user.id}: ${updateError.message}`);
        } else {
          syncedCount++;
        }
      }
    }

    results.push({
      field1: 'balance_uni',
      field2: 'uni_farming_balance',
      syncedCount,
      errors: errors3
    });

    console.log(`   ✅ Синхронизировано: ${syncedCount} записей\n`);

    // 4. Заполнение wallet из ton_wallet_address (только если wallet пустой)
    console.log('📌 Заполнение пустых wallet из ton_wallet_address\n');
    syncedCount = 0;
    const errors4: string[] = [];

    for (const user of users || []) {
      if (!user.wallet && user.ton_wallet_address) {
        console.log(`   User ${user.id}: wallet=null, ton_wallet_address=${user.ton_wallet_address.substring(0, 20)}...`);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            wallet: user.ton_wallet_address
          })
          .eq('id', user.id);

        if (updateError) {
          errors4.push(`User ${user.id}: ${updateError.message}`);
        } else {
          syncedCount++;
        }
      }
    }

    results.push({
      field1: 'wallet',
      field2: 'ton_wallet_address',
      syncedCount,
      errors: errors4
    });

    console.log(`   ✅ Синхронизировано: ${syncedCount} записей\n`);

    // Итоговый отчет
    console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ:\n');
    console.log('================================================================================\n');

    let totalSynced = 0;
    let totalErrors = 0;

    results.forEach(result => {
      totalSynced += result.syncedCount;
      totalErrors += result.errors.length;
      
      console.log(`${result.field1} ← → ${result.field2}:`);
      console.log(`   Синхронизировано: ${result.syncedCount}`);
      if (result.errors.length > 0) {
        console.log(`   Ошибок: ${result.errors.length}`);
        result.errors.slice(0, 3).forEach(err => console.log(`     - ${err}`));
      }
      console.log();
    });

    console.log(`\n✅ ВСЕГО синхронизировано: ${totalSynced} записей`);
    if (totalErrors > 0) {
      console.log(`⚠️  Ошибок при синхронизации: ${totalErrors}`);
    }

    // Проверка результатов
    console.log('\n\n🔍 ПРОВЕРКА РЕЗУЛЬТАТОВ:\n');
    console.log('================================================================================\n');

    const { data: checkUsers, error: checkError } = await supabase
      .from('users')
      .select('id, uni_deposit_amount, uni_farming_deposit, ton_boost_package, ton_boost_package_id, balance_uni, uni_farming_balance, wallet, ton_wallet_address')
      .order('id');

    if (!checkError && checkUsers) {
      let remainingDiffs = 0;

      checkUsers.forEach(user => {
        const diffs: string[] = [];
        
        if (user.uni_deposit_amount !== user.uni_farming_deposit) {
          diffs.push(`uni_deposit: ${user.uni_deposit_amount} vs ${user.uni_farming_deposit}`);
        }
        
        if (user.ton_boost_package > 0 && user.ton_boost_package !== user.ton_boost_package_id) {
          diffs.push(`ton_boost: ${user.ton_boost_package} vs ${user.ton_boost_package_id}`);
        }

        if (diffs.length > 0) {
          remainingDiffs++;
          if (remainingDiffs <= 5) { // Показываем только первые 5
            console.log(`User ${user.id}: ${diffs.join(', ')}`);
          }
        }
      });

      if (remainingDiffs === 0) {
        console.log('✅ Все указанные поля успешно синхронизированы!');
      } else {
        console.log(`\n⚠️  Остались расхождения: ${remainingDiffs} записей`);
      }
    }

    // Сохраняем отчет
    const report = {
      timestamp: new Date().toISOString(),
      results,
      totalSynced,
      totalErrors
    };

    await fs.promises.writeFile(
      'FIELD_SYNCHRONIZATION_REPORT.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n✅ Отчет сохранен в FIELD_SYNCHRONIZATION_REPORT.json');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем синхронизацию
console.log('⚠️  ВНИМАНИЕ: Запуск синхронизации изменит данные в базе!');
console.log('⚠️  Нажмите Ctrl+C для отмены в течение 5 секунд...\n');

setTimeout(() => {
  synchronizeDuplicateFields().then(() => {
    console.log('\n✅ Синхронизация завершена');
    process.exit(0);
  }).catch(err => {
    console.error('❌ Ошибка при синхронизации:', err);
    process.exit(1);
  });
}, 5000);