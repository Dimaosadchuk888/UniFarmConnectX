/**
 * 🔍 ДИАГНОСТИКА TON BOOST ПАКЕТА ID 290
 * Проверка типа, статуса и корректности подтягивания данных
 */

import { supabase } from './core/supabase';
import { logger } from './core/logger';

interface TonBoostPackage {
  id: number;
  name: string;
  description: string;
  price_ton: string;
  daily_rate: string;
  duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BoostPurchase {
  id: number;
  user_id: number;
  boost_id: number;
  amount_ton: string;
  tx_hash: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  metadata: any;
}

async function diagnoseTonBoostPackage290() {
  console.log('\n🔍 === РАСШИРЕННАЯ ДИАГНОСТИКА TON BOOST ПАКЕТА ID 290 ===\n');

  try {
    // 0. Сначала проверяем все существующие таблицы
    console.log('0️⃣ Проверка всех доступных таблиц:');
    console.log('===================================');
    
    const { data: allTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
      
    if (allTables) {
      console.log('✅ Доступные таблицы в базе данных:');
      allTables.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    }

    // 1. Проверяем таблицу Users на предмет TON Boost данных
    console.log('\n1️⃣ Проверка Users таблицы на TON Boost данные:');
    console.log('===============================================');
    
    // Ищем пользователей с ton_boost_package_id = 290
    const { data: usersWithBoost290, error: usersError } = await supabase
      .from('users')
      .select('id, telegram_id, username, ton_boost_package_id, ton_boost_active, ton_boost_rate, ton_farming_balance, ton_farming_start_timestamp, balance_ton')
      .eq('ton_boost_package_id', 290);
      
    if (usersError) {
      console.log('❌ Ошибка при проверке users:', usersError.message);
    } else if (usersWithBoost290?.length) {
      console.log(`✅ Найдено ${usersWithBoost290.length} пользователей с TON Boost пакетом ID 290:`);
      usersWithBoost290.forEach((user, index) => {
        console.log(`\n   Пользователь #${index + 1}:`);
        console.log(`     User ID: ${user.id}`);
        console.log(`     Telegram ID: ${user.telegram_id}`);
        console.log(`     Username: ${user.username || 'НЕТ'}`);
        console.log(`     TON Boost Package ID: ${user.ton_boost_package_id}`);
        console.log(`     TON Boost активен: ${user.ton_boost_active}`);
        console.log(`     TON Boost ставка: ${user.ton_boost_rate}%`);
        console.log(`     TON фарминг баланс: ${user.ton_farming_balance}`);
        console.log(`     Баланс TON: ${user.balance_ton}`);
        console.log(`     Старт фарминга: ${user.ton_farming_start_timestamp ? new Date(user.ton_farming_start_timestamp).toLocaleString('ru-RU') : 'НЕТ'}`);
      });
    } else {
      console.log('ℹ️ Пользователей с TON Boost пакетом ID 290 не найдено');
      
      // Проверяем все TON Boost поля у всех пользователей
      const { data: allBoostUsers } = await supabase
        .from('users')
        .select('id, ton_boost_package_id, ton_boost_active')
        .not('ton_boost_package_id', 'is', null)
        .limit(20);
        
      if (allBoostUsers?.length) {
        console.log('\n📊 Пользователи с другими TON Boost пакетами:');
        allBoostUsers.forEach(user => {
          console.log(`   User ${user.id}: Package ID ${user.ton_boost_package_id}, Active: ${user.ton_boost_active}`);
        });
      }
    }

    // 2. Проверяем все альтернативные таблицы с boost данными
    console.log('\n2️⃣ Проверка альтернативных boost таблиц:');
    console.log('========================================');
    
    // Проверяем boost_packages если есть
    try {
      const { data: boostPackages, error: packagesError } = await supabase
        .from('boost_packages')
        .select('*')
        .eq('id', 290);
        
      if (!packagesError && boostPackages) {
        console.log('✅ Таблица boost_packages найдена!');
        if (boostPackages.length > 0) {
          console.log('📦 Пакет ID 290 найден в boost_packages:');
          boostPackages.forEach(pkg => {
            console.log(`   ${JSON.stringify(pkg, null, 4)}`);
          });
        } else {
          console.log('ℹ️ Пакет ID 290 не найден в boost_packages');
        }
      }
    } catch (e) {
      console.log('ℹ️ Таблица boost_packages не существует или недоступна');
    }

    // 1. Проверяем информацию о самом пакете в ton_boost_packages
    console.log('\n3️⃣ Информация о TON Boost пакете ID 290 в ton_boost_packages:');
    console.log('==============================================================');
    
    const { data: packageData, error: packageError } = await supabase
      .from('ton_boost_packages')
      .select('*')
      .eq('id', 290)
      .single();

    if (packageError) {
      console.log('❌ Ошибка при получении данных пакета:', packageError.message);
      console.log('📋 Детали ошибки:', packageError);
      
      // Проверяем существование таблицы
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'ton_boost_packages');
        
      if (tablesError || !tables?.length) {
        console.log('❌ Таблица ton_boost_packages не существует или недоступна');
      } else {
        console.log('✅ Таблица ton_boost_packages существует');
        
        // Получаем все доступные пакеты для контекста
        const { data: allPackages } = await supabase
          .from('ton_boost_packages')
          .select('id, name, price_ton, daily_rate, is_active')
          .order('id', { ascending: true });
          
        console.log('\n📦 Все доступные TON Boost пакеты:');
        allPackages?.forEach(pkg => {
          console.log(`   ID ${pkg.id}: ${pkg.name} | ${pkg.price_ton} TON | Rate: ${pkg.daily_rate}% | Active: ${pkg.is_active}`);
        });
      }
    } else if (packageData) {
      console.log('✅ TON Boost пакет ID 290 найден!');
      console.log(`   Название: ${packageData.name}`);
      console.log(`   Описание: ${packageData.description}`);
      console.log(`   Цена: ${packageData.price_ton} TON`);
      console.log(`   Дневная ставка: ${packageData.daily_rate}%`);
      console.log(`   Длительность: ${packageData.duration_days} дней`);
      console.log(`   Активен: ${packageData.is_active}`);
      console.log(`   Создан: ${new Date(packageData.created_at).toLocaleString('ru-RU')}`);
      console.log(`   Обновлен: ${new Date(packageData.updated_at).toLocaleString('ru-RU')}`);
    }

    // 4. Проверяем все TON-связанные таблицы на наличие данных о пакете 290
    console.log('\n4️⃣ Проверка всех TON-связанных таблиц:');
    console.log('======================================');
    
    // Проверяем ton_farming_data если есть
    try {
      const { data: tonFarmingData, error: farmingError } = await supabase
        .from('ton_farming_data')
        .select('*')
        .or('boost_package_id.eq.290,package_id.eq.290');
        
      if (!farmingError && tonFarmingData?.length) {
        console.log('✅ Найдены данные в ton_farming_data:');
        tonFarmingData.forEach(data => {
          console.log(`   ${JSON.stringify(data, null, 4)}`);
        });
      } else {
        console.log('ℹ️ Данных о пакете 290 в ton_farming_data не найдено');
      }
    } catch (e) {
      console.log('ℹ️ Таблица ton_farming_data недоступна');
    }

    // Проверяем ton_deposits если есть
    try {
      const { data: tonDeposits, error: depositsError } = await supabase
        .from('ton_deposits')
        .select('*')
        .or('boost_id.eq.290,package_id.eq.290');
        
      if (!depositsError && tonDeposits?.length) {
        console.log('✅ Найдены депозиты в ton_deposits:');
        tonDeposits.forEach(deposit => {
          console.log(`   ${JSON.stringify(deposit, null, 4)}`);
        });
      } else {
        console.log('ℹ️ Депозитов с пакетом 290 в ton_deposits не найдено');
      }
    } catch (e) {
      console.log('ℹ️ Таблица ton_deposits недоступна');
    }

    // 5. Проверяем покупки этого пакета
    console.log('\n5️⃣ Покупки TON Boost пакета ID 290:');
    console.log('====================================');
    
    const { data: purchases, error: purchasesError } = await supabase
      .from('boost_purchases')
      .select('*')
      .eq('boost_id', 290)
      .order('created_at', { ascending: false })
      .limit(10);

    if (purchasesError) {
      console.log('❌ Ошибка при получении покупок:', purchasesError.message);
    } else if (!purchases?.length) {
      console.log('ℹ️ Покупок пакета ID 290 не найдено');
    } else {
      console.log(`✅ Найдено ${purchases.length} покупок пакета ID 290:`);
      purchases.forEach((purchase, index) => {
        console.log(`\n   Покупка #${index + 1}:`);
        console.log(`     ID: ${purchase.id}`);
        console.log(`     User ID: ${purchase.user_id}`);
        console.log(`     Сумма: ${purchase.amount_ton} TON`);
        console.log(`     TX Hash: ${purchase.tx_hash || 'НЕТ'}`);
        console.log(`     Статус: ${purchase.status}`);
        console.log(`     Дата: ${new Date(purchase.created_at).toLocaleString('ru-RU')}`);
        if (purchase.metadata) {
          console.log(`     Метаданные: ${JSON.stringify(purchase.metadata, null, 6)}`);
        }
      });
    }

    // 3. Проверяем транзакции связанные с пакетом 290
    console.log('\n3️⃣ Транзакции связанные с пакетом ID 290:');
    console.log('==========================================');
    
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .or(`description.ilike.%290%,metadata->>boost_id.eq.290,metadata->>package_id.eq.290`)
      .order('created_at', { ascending: false })
      .limit(15);

    if (transactionsError) {
      console.log('❌ Ошибка при получении транзакций:', transactionsError.message);
    } else if (!transactions?.length) {
      console.log('ℹ️ Транзакций связанных с пакетом ID 290 не найдено');
    } else {
      console.log(`✅ Найдено ${transactions.length} транзакций:`);
      transactions.forEach((tx, index) => {
        console.log(`\n   Транзакция #${index + 1}:`);
        console.log(`     ID: ${tx.id}`);
        console.log(`     User ID: ${tx.user_id}`);
        console.log(`     Тип: ${tx.type}`);
        console.log(`     Сумма: ${tx.amount} ${tx.currency}`);
        console.log(`     Статус: ${tx.status}`);
        console.log(`     Описание: ${tx.description}`);
        console.log(`     Дата: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        if (tx.metadata) {
          console.log(`     Метаданные: ${JSON.stringify(tx.metadata, null, 6)}`);
        }
      });
    }

    // 4. Проверяем активные TON фарминг записи с этим пакетом
    console.log('\n4️⃣ TON фарминг записи с пакетом ID 290:');
    console.log('======================================');
    
    const { data: farmingData, error: farmingError } = await supabase
      .from('users')
      .select('id, telegram_id, username, ton_boost_active, ton_boost_package_id, ton_boost_rate, ton_farming_balance, ton_farming_start_timestamp')
      .eq('ton_boost_package_id', 290)
      .limit(20);

    if (farmingError) {
      console.log('❌ Ошибка при получении данных фарминга:', farmingError.message);
    } else if (!farmingData?.length) {
      console.log('ℹ️ Пользователей с активным пакетом ID 290 не найдено');
    } else {
      console.log(`✅ Найдено ${farmingData.length} пользователей с пакетом ID 290:`);
      farmingData.forEach((user, index) => {
        console.log(`\n   Пользователь #${index + 1}:`);
        console.log(`     User ID: ${user.id}`);
        console.log(`     Telegram ID: ${user.telegram_id}`);
        console.log(`     Username: ${user.username || 'НЕТ'}`);
        console.log(`     TON Boost активен: ${user.ton_boost_active}`);
        console.log(`     TON Boost ставка: ${user.ton_boost_rate}%`);
        console.log(`     TON фарминг баланс: ${user.ton_farming_balance} TON`);
        console.log(`     Старт фарминга: ${user.ton_farming_start_timestamp ? new Date(user.ton_farming_start_timestamp).toLocaleString('ru-RU') : 'НЕТ'}`);
      });
    }

    // 5. Общая статистика пакета
    console.log('\n5️⃣ Общая статистика пакета ID 290:');
    console.log('==================================');
    
    if (packageData) {
      console.log(`📊 Тип пакета: ${packageData.name}`);
      console.log(`💰 Стоимость: ${packageData.price_ton} TON`);
      console.log(`📈 Дневная доходность: ${packageData.daily_rate}%`);
      console.log(`⏰ Длительность: ${packageData.duration_days} дней`);
      
      // Вычисляем общую доходность
      const totalReturn = (parseFloat(packageData.daily_rate) * packageData.duration_days).toFixed(2);
      console.log(`💎 Общая доходность за весь период: ${totalReturn}%`);
      
      // Статус активности
      if (packageData.is_active) {
        console.log('✅ Пакет активен и доступен для покупки');
      } else {
        console.log('⚠️ Пакет деактивирован');
      }
    }

    console.log('\n✅ === ДИАГНОСТИКА ЗАВЕРШЕНА ===\n');

  } catch (error) {
    console.error('❌ Критическая ошибка при диагностике:', error);
  }
}

// Запускаем диагностику
diagnoseTonBoostPackage290();