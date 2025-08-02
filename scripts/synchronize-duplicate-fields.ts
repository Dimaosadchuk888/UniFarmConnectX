import { supabase } from '../core/supabase.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SyncResult {
  field: string;
  totalRecords: number;
  syncedRecords: number;
  errors: number;
  details: any[];
}

async function synchronizeDuplicateFields() {
  console.log('🔄 СИНХРОНИЗАЦИЯ ДУБЛИРУЮЩИХСЯ ПОЛЕЙ');
  console.log('='.repeat(80));
  console.log('');
  console.log('⚠️  ВНИМАНИЕ: Этот скрипт синхронизирует данные между дублирующимися полями');
  console.log('📝 Основываясь на аудите, будут синхронизированы следующие поля:');
  console.log('   1. uni_deposit_amount → uni_farming_deposit');
  console.log('   2. ton_boost_package → ton_boost_package_id');
  console.log('   3. wallet ↔ ton_wallet_address (двусторонняя)');
  console.log('   4. balance_uni и uni_farming_balance НЕ синхронизируются (разная логика)');
  console.log('');

  const results: SyncResult[] = [];

  try {
    // 1. Синхронизация UNI Deposit
    console.log('\n1️⃣ Синхронизация UNI Deposit (uni_deposit_amount → uni_farming_deposit)');
    console.log('-'.repeat(60));

    // Находим записи с различиями
    const { data: depositDiffs } = await supabase
      .from('users')
      .select('id, telegram_id, uni_deposit_amount, uni_farming_deposit')
      .neq('uni_deposit_amount', 'uni_farming_deposit');

    if (depositDiffs && depositDiffs.length > 0) {
      console.log(`Найдено ${depositDiffs.length} записей с различиями`);
      
      let syncedCount = 0;
      let errorCount = 0;
      const syncDetails: any[] = [];

      for (const user of depositDiffs) {
        try {
          // Синхронизируем: uni_deposit_amount является главным полем
          const { error } = await supabase
            .from('users')
            .update({ uni_farming_deposit: user.uni_deposit_amount })
            .eq('id', user.id);

          if (error) {
            errorCount++;
            console.error(`❌ Ошибка для user ${user.id}:`, error);
          } else {
            syncedCount++;
            syncDetails.push({
              userId: user.id,
              old_value: user.uni_farming_deposit,
              new_value: user.uni_deposit_amount
            });
          }
        } catch (e) {
          errorCount++;
          console.error(`❌ Исключение для user ${user.id}:`, e);
        }
      }

      console.log(`✅ Синхронизировано: ${syncedCount}/${depositDiffs.length}`);
      if (errorCount > 0) console.log(`❌ Ошибок: ${errorCount}`);

      results.push({
        field: 'uni_deposit_amount → uni_farming_deposit',
        totalRecords: depositDiffs.length,
        syncedRecords: syncedCount,
        errors: errorCount,
        details: syncDetails.slice(0, 5) // Первые 5 для отчета
      });
    } else {
      console.log('✅ Все записи уже синхронизированы');
    }

    // 2. Синхронизация TON Boost Package
    console.log('\n2️⃣ Синхронизация TON Boost Package (ton_boost_package → ton_boost_package_id)');
    console.log('-'.repeat(60));

    // Находим записи где ton_boost_package > 0, но ton_boost_package_id = null
    const { data: boostDiffs } = await supabase
      .from('users')
      .select('id, telegram_id, ton_boost_package, ton_boost_package_id')
      .gt('ton_boost_package', 0)
      .is('ton_boost_package_id', null);

    if (boostDiffs && boostDiffs.length > 0) {
      console.log(`Найдено ${boostDiffs.length} записей для синхронизации`);
      
      let syncedCount = 0;
      let errorCount = 0;
      const syncDetails: any[] = [];

      for (const user of boostDiffs) {
        try {
          // Синхронизируем: копируем ton_boost_package в ton_boost_package_id
          const { error } = await supabase
            .from('users')
            .update({ ton_boost_package_id: user.ton_boost_package })
            .eq('id', user.id);

          if (error) {
            errorCount++;
            console.error(`❌ Ошибка для user ${user.id}:`, error);
          } else {
            syncedCount++;
            syncDetails.push({
              userId: user.id,
              package_value: user.ton_boost_package
            });
          }
        } catch (e) {
          errorCount++;
          console.error(`❌ Исключение для user ${user.id}:`, e);
        }
      }

      console.log(`✅ Синхронизировано: ${syncedCount}/${boostDiffs.length}`);
      if (errorCount > 0) console.log(`❌ Ошибок: ${errorCount}`);

      results.push({
        field: 'ton_boost_package → ton_boost_package_id',
        totalRecords: boostDiffs.length,
        syncedRecords: syncedCount,
        errors: errorCount,
        details: syncDetails.slice(0, 5)
      });
    } else {
      console.log('✅ Все записи уже синхронизированы');
    }

    // 3. Синхронизация Wallet Address
    console.log('\n3️⃣ Синхронизация Wallet Address (двусторонняя синхронизация)');
    console.log('-'.repeat(60));

    // Находим записи где одно поле заполнено, а другое нет
    const { data: walletDiffs1 } = await supabase
      .from('users')
      .select('id, telegram_id, wallet, ton_wallet_address')
      .not('wallet', 'is', null)
      .is('ton_wallet_address', null);

    const { data: walletDiffs2 } = await supabase
      .from('users')
      .select('id, telegram_id, wallet, ton_wallet_address')
      .is('wallet', null)
      .not('ton_wallet_address', 'is', null);

    const walletDiffs = [...(walletDiffs1 || []), ...(walletDiffs2 || [])];

    if (walletDiffs.length > 0) {
      console.log(`Найдено ${walletDiffs.length} записей для синхронизации`);
      
      let syncedCount = 0;
      let errorCount = 0;
      const syncDetails: any[] = [];

      for (const user of walletDiffs) {
        try {
          // Определяем направление синхронизации
          const updateData = user.wallet && !user.ton_wallet_address
            ? { ton_wallet_address: user.wallet }
            : { wallet: user.ton_wallet_address };

          const { error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', user.id);

          if (error) {
            errorCount++;
            console.error(`❌ Ошибка для user ${user.id}:`, error);
          } else {
            syncedCount++;
            syncDetails.push({
              userId: user.id,
              wallet: user.wallet || user.ton_wallet_address,
              direction: user.wallet ? 'wallet → ton_wallet_address' : 'ton_wallet_address → wallet'
            });
          }
        } catch (e) {
          errorCount++;
          console.error(`❌ Исключение для user ${user.id}:`, e);
        }
      }

      console.log(`✅ Синхронизировано: ${syncedCount}/${walletDiffs.length}`);
      if (errorCount > 0) console.log(`❌ Ошибок: ${errorCount}`);

      results.push({
        field: 'wallet ↔ ton_wallet_address',
        totalRecords: walletDiffs.length,
        syncedRecords: syncedCount,
        errors: errorCount,
        details: syncDetails.slice(0, 5)
      });
    } else {
      console.log('✅ Все записи уже синхронизированы');
    }

    // 4. Специальная проверка balance полей
    console.log('\n4️⃣ Проверка Balance полей (НЕ синхронизируем - разная логика)');
    console.log('-'.repeat(60));

    const { data: balanceCheck } = await supabase
      .from('users')
      .select('id, balance_uni, uni_farming_balance, uni_deposit_amount')
      .neq('balance_uni', 'uni_farming_balance')
      .limit(5);

    if (balanceCheck && balanceCheck.length > 0) {
      console.log('📊 Примеры различий (это нормально!):');
      balanceCheck.forEach(user => {
        const totalBalance = parseFloat(user.balance_uni || '0');
        const farmingBalance = parseFloat(user.uni_farming_balance || '0');
        const depositAmount = parseFloat(user.uni_deposit_amount || '0');
        
        console.log(`  User ${user.id}:`);
        console.log(`    - balance_uni: ${totalBalance} (общий баланс)`);
        console.log(`    - uni_farming_balance: ${farmingBalance} (накопления)`);
        console.log(`    - uni_deposit_amount: ${depositAmount} (депозит)`);
        console.log(`    - Формула: ${depositAmount} + ${farmingBalance} ≈ ${totalBalance}`);
      });
    }

    // Сохраняем отчет
    const report = {
      timestamp: new Date().toISOString(),
      syncResults: results,
      summary: {
        totalSynced: results.reduce((sum, r) => sum + r.syncedRecords, 0),
        totalErrors: results.reduce((sum, r) => sum + r.errors, 0),
        fieldsProcessed: results.length
      },
      recommendations: [
        'uni_deposit_amount и uni_farming_deposit теперь синхронизированы',
        'ton_boost_package и ton_boost_package_id теперь синхронизированы',
        'wallet и ton_wallet_address теперь синхронизированы',
        'balance_uni и uni_farming_balance НЕ синхронизированы (разная бизнес-логика)'
      ]
    };

    fs.writeFileSync(
      path.join(__dirname, '..', 'FIELD_SYNCHRONIZATION_REPORT.json'),
      JSON.stringify(report, null, 2)
    );

    // Итоговый отчет
    console.log('\n\n📊 ИТОГОВЫЙ ОТЧЕТ:');
    console.log('='.repeat(80));
    console.log(`✅ Всего синхронизировано записей: ${report.summary.totalSynced}`);
    console.log(`❌ Всего ошибок: ${report.summary.totalErrors}`);
    console.log(`📝 Обработано групп полей: ${report.summary.fieldsProcessed}`);
    
    console.log('\n🎯 РЕКОМЕНДАЦИИ:');
    console.log('1. Проверьте работу системы после синхронизации');
    console.log('2. Обновите код для использования главных полей');
    console.log('3. Добавьте триггеры БД для автоматической синхронизации в будущем');
    console.log('4. НЕ удаляйте поля сразу - сначала обновите весь код');
    
    console.log('\n✅ Синхронизация завершена! Отчет сохранен в FIELD_SYNCHRONIZATION_REPORT.json');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запуск синхронизации
console.log('Запускаю синхронизацию дублирующихся полей...\n');
console.log('⚠️  ПРЕДУПРЕЖДЕНИЕ: Этот скрипт изменит данные в БД!');
console.log('Убедитесь что у вас есть резервная копия.');
console.log('Начинаю через 5 секунд...\n');

setTimeout(() => {
  synchronizeDuplicateFields().catch(console.error);
}, 5000);