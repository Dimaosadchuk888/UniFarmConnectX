/**
 * 🔍 ПРОВЕРКА ПОКУПКИ TON BOOST ПАКЕТА ПОЛЬЗОВАТЕЛЕМ 290
 */

import { supabase } from './core/supabase';

async function checkUser290BoostPurchase() {
  console.log('\n🔍 === ДИАГНОСТИКА ПОКУПКИ TON BOOST ПАКЕТА ПОЛЬЗОВАТЕЛЕМ 290 ===\n');

  try {
    // 1. Текущий статус пользователя 290
    console.log('1️⃣ Текущий статус пользователя 290:');
    console.log('=====================================');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 290)
      .single();

    if (userError) {
      console.log('❌ Ошибка получения данных пользователя:', userError.message);
      return;
    }

    console.log('✅ Данные пользователя 290:');
    console.log(`   User ID: ${userData.id}`);
    console.log(`   Telegram ID: ${userData.telegram_id}`);
    console.log(`   Username: ${userData.username}`);
    console.log(`   Имя: ${userData.first_name}`);
    console.log(`   Баланс TON: ${userData.balance_ton}`);
    console.log(`   Баланс UNI: ${userData.balance_uni}`);
    console.log(`   TON Boost Package: ${userData.ton_boost_package}`);
    console.log(`   TON Boost Package ID: ${userData.ton_boost_package_id}`);
    console.log(`   TON Boost активен: ${userData.ton_boost_active}`);
    console.log(`   TON Boost ставка: ${userData.ton_boost_rate}%`);
    console.log(`   TON фарминг баланс: ${userData.ton_farming_balance}`);
    console.log(`   Дата создания: ${new Date(userData.created_at).toLocaleString('ru-RU')}`);

    // 2. Ищем покупки boost пакетов пользователем 290
    console.log('\n2️⃣ Покупки boost пакетов пользователем 290:');
    console.log('===========================================');
    
    const { data: purchases, error: purchasesError } = await supabase
      .from('boost_purchases')
      .select('*')
      .eq('user_id', 290)
      .order('created_at', { ascending: false });

    if (purchasesError) {
      console.log('❌ Ошибка получения покупок:', purchasesError.message);
    } else if (!purchases?.length) {
      console.log('ℹ️ Покупок boost пакетов пользователем 290 не найдено');
    } else {
      console.log(`✅ Найдено ${purchases.length} покупок:`);
      purchases.forEach((purchase, index) => {
        console.log(`\n   Покупка #${index + 1}:`);
        console.log(`     ID: ${purchase.id}`);
        console.log(`     Boost ID: ${purchase.boost_id}`);
        console.log(`     Сумма: ${purchase.amount_ton} TON`);
        console.log(`     TX Hash: ${purchase.tx_hash || 'НЕТ'}`);
        console.log(`     Статус: ${purchase.status}`);
        console.log(`     Дата: ${new Date(purchase.created_at).toLocaleString('ru-RU')}`);
        if (purchase.metadata) {
          console.log(`     Метаданные: ${JSON.stringify(purchase.metadata, null, 6)}`);
        }
      });
    }

    // 3. Ищем транзакции пользователя 290
    console.log('\n3️⃣ Транзакции пользователя 290:');
    console.log('===============================');
    
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 290)
      .order('created_at', { ascending: false })
      .limit(10);

    if (transactionsError) {
      console.log('❌ Ошибка получения транзакций:', transactionsError.message);
    } else if (!transactions?.length) {
      console.log('ℹ️ Транзакций пользователя 290 не найдено');
    } else {
      console.log(`✅ Найдено ${transactions.length} транзакций:`);
      transactions.forEach((tx, index) => {
        console.log(`\n   Транзакция #${index + 1}:`);
        console.log(`     ID: ${tx.id}`);
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

    // 4. Проверяем доступные TON Boost пакеты
    console.log('\n4️⃣ Доступные TON Boost пакеты:');
    console.log('==============================');
    
    // Проверяем разные возможные таблицы с пакетами
    const packageTables = ['boost_packages', 'ton_boost_packages', 'farming_packages'];
    
    for (const tableName of packageTables) {
      try {
        const { data: packages, error: packagesError } = await supabase
          .from(tableName)
          .select('*')
          .order('id', { ascending: true });

        if (!packagesError && packages?.length) {
          console.log(`\n   ✅ Пакеты в таблице ${tableName}:`);
          packages.forEach(pkg => {
            console.log(`     ID ${pkg.id}: ${pkg.name || 'БЕЗ ИМЕНИ'} | Цена: ${pkg.price_ton || pkg.price || 'НЕТ'} | Активен: ${pkg.is_active !== false}`);
          });
        } else {
          console.log(`   ℹ️ Таблица ${tableName}: пакетов не найдено или таблица не существует`);
        }
      } catch (e) {
        console.log(`   ❌ Таблица ${tableName}: недоступна`);
      }
    }

    // 5. Ищем TON депозиты пользователя 290
    console.log('\n5️⃣ TON депозиты пользователя 290:');
    console.log('=================================');
    
    const depositTables = ['ton_deposits', 'ton_boost_deposits'];
    
    for (const tableName of depositTables) {
      try {
        const { data: deposits, error: depositsError } = await supabase
          .from(tableName)
          .select('*')
          .eq('user_id', 290)
          .order('created_at', { ascending: false });

        if (!depositsError && deposits?.length) {
          console.log(`\n   ✅ Депозиты в таблице ${tableName}:`);
          deposits.forEach((deposit, index) => {
            console.log(`     Депозит #${index + 1}:`);
            console.log(`       ID: ${deposit.id}`);
            console.log(`       Сумма: ${deposit.amount_ton || deposit.amount} TON`);
            console.log(`       Package ID: ${deposit.package_id || deposit.boost_id || 'НЕТ'}`);
            console.log(`       TX Hash: ${deposit.tx_hash || 'НЕТ'}`);
            console.log(`       Дата: ${new Date(deposit.created_at).toLocaleString('ru-RU')}`);
          });
        } else {
          console.log(`   ℹ️ Депозитов в ${tableName} не найдено`);
        }
      } catch (e) {
        console.log(`   ❌ Таблица ${tableName}: недоступна`);
      }
    }

    // 6. Анализ и рекомендации
    console.log('\n6️⃣ Анализ и статус:');
    console.log('===================');
    
    console.log(`📊 Статус TON Boost пользователя 290:`);
    console.log(`   - TON Boost пакет: ${userData.ton_boost_package || 'НЕТ'}`);
    console.log(`   - Пакет активен: ${userData.ton_boost_active ? 'ДА' : 'НЕТ'}`);
    console.log(`   - Текущий баланс TON: ${userData.balance_ton}`);
    
    if (!userData.ton_boost_active) {
      console.log(`\n⚠️ ПРОБЛЕМА: TON Boost пакет неактивен!`);
      console.log(`   Возможные причины:`);
      console.log(`   1. Пакет не был активирован после покупки`);
      console.log(`   2. Произошла ошибка при активации`);
      console.log(`   3. Пакет истек`);
      console.log(`   4. Недостаточно средств для активации`);
    }

    console.log('\n✅ === ДИАГНОСТИКА ЗАВЕРШЕНА ===\n');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем диагностику
checkUser290BoostPurchase();