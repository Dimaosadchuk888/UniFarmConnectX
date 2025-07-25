/**
 * 🔍 ПОЛНАЯ ПРОВЕРКА ВСЕХ ТАБЛИЦ ДЛЯ ПОЛЬЗОВАТЕЛЯ 290
 * Ищем ВСЕ СЛЕДЫ его активности в системе
 */

import { supabase } from './core/supabase';

async function checkAllTablesForUser290() {
  console.log('\n🔍 === ПОЛНАЯ ПРОВЕРКА ВСЕХ ТАБЛИЦ ДЛЯ ПОЛЬЗОВАТЕЛЯ 290 ===\n');

  const userId = 290;

  try {
    // 1. Проверяем ton_farming_data - КЛЮЧЕВАЯ ТАБЛИЦА!
    console.log('1️⃣ ПРОВЕРКА ton_farming_data (КЛЮЧЕВАЯ ТАБЛИЦА):');
    console.log('===============================================');
    
    const { data: tonFarmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', userId);

    if (farmingError) {
      console.log('❌ Ошибка доступа к ton_farming_data:', farmingError.message);
    } else if (!tonFarmingData?.length) {
      console.log('🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: ЗАПИСИ В ton_farming_data НЕТ!');
      console.log('   Это объясняет почему не работает планировщик!');
    } else {
      console.log(`✅ Найдено ${tonFarmingData.length} записей в ton_farming_data:`);
      tonFarmingData.forEach((record, index) => {
        console.log(`\n   Запись #${index + 1}:`);
        console.log(`     ID: ${record.id}`);
        console.log(`     User ID: ${record.user_id}`);
        console.log(`     Boost активен: ${record.boost_active}`);
        console.log(`     Boost Package ID: ${record.boost_package_id}`);
        console.log(`     Farming Balance: ${record.farming_balance}`);
        console.log(`     Farming Rate: ${record.farming_rate}`);
        console.log(`     Farming Start: ${record.farming_start_timestamp}`);
        console.log(`     Boost истекает: ${record.boost_expires_at}`);
        console.log(`     Последнее обновление: ${record.farming_last_update}`);
      });
    }

    // 2. Проверяем boost_purchases - покупки пакетов
    console.log('\n2️⃣ ПРОВЕРКА boost_purchases:');
    console.log('===========================');
    
    const { data: boostPurchases, error: purchasesError } = await supabase
      .from('boost_purchases')
      .select('*')
      .eq('user_id', userId);

    if (purchasesError) {
      console.log('❌ Ошибка доступа к boost_purchases:', purchasesError.message);
    } else if (!boostPurchases?.length) {
      console.log('⚠️ Покупок boost пакетов не найдено');
    } else {
      console.log(`✅ Найдено ${boostPurchases.length} покупок boost пакетов:`);
      boostPurchases.forEach((purchase, index) => {
        console.log(`\n   Покупка #${index + 1}:`);
        console.log(`     ID: ${purchase.id}`);
        console.log(`     Boost ID: ${purchase.boost_id}`);
        console.log(`     Сумма: ${purchase.amount_ton} TON`);
        console.log(`     Статус: ${purchase.status}`);
        console.log(`     TX Hash: ${purchase.tx_hash || 'НЕТ'}`);
        console.log(`     Дата: ${new Date(purchase.created_at).toLocaleString('ru-RU')}`);
      });
    }

    // 3. Проверяем boosts - доступные пакеты
    console.log('\n3️⃣ ПРОВЕРКА boosts (доступные пакеты):');
    console.log('====================================');
    
    const { data: boosts, error: boostsError } = await supabase
      .from('boosts')
      .select('*')
      .order('id', { ascending: true });

    if (boostsError) {
      console.log('❌ Ошибка доступа к boosts:', boostsError.message);
    } else if (!boosts?.length) {
      console.log('❌ Доступных boost пакетов не найдено!');
    } else {
      console.log(`✅ Найдено ${boosts.length} доступных boost пакетов:`);
      boosts.forEach(boost => {
        console.log(`   Пакет ID ${boost.id}: ${boost.name || 'БЕЗ ИМЕНИ'}`);
        console.log(`     Цена: ${boost.price_ton || boost.min_amount || 'НЕТ'} TON`);
        console.log(`     Ставка: ${boost.daily_rate || 'НЕТ'}%`);
        console.log(`     Длительность: ${boost.duration_days || 'НЕТ'} дней`);
        console.log(`     Активен: ${boost.is_active !== false}`);
        console.log('     ---');
      });
    }

    // 4. Проверяем farming_deposits - фарминг депозиты
    console.log('\n4️⃣ ПРОВЕРКА farming_deposits:');
    console.log('============================');
    
    const { data: farmingDeposits, error: farmingDepositsError } = await supabase
      .from('farming_deposits')
      .select('*')
      .eq('user_id', userId);

    if (farmingDepositsError) {
      console.log('❌ Ошибка доступа к farming_deposits:', farmingDepositsError.message);
    } else if (!farmingDeposits?.length) {
      console.log('ℹ️ Записей в farming_deposits не найдено');
    } else {
      console.log(`✅ Найдено ${farmingDeposits.length} записей в farming_deposits:`);
      farmingDeposits.forEach((deposit, index) => {
        console.log(`   Депозит #${index + 1}: ${deposit.amount} ${deposit.currency || 'БЕЗ ВАЛЮТЫ'}`);
      });
    }

    // 5. АНАЛИЗ: Где должна была создаться запись в ton_farming_data?
    console.log('\n5️⃣ АНАЛИЗ ПРОБЛЕМЫ:');
    console.log('==================');
    
    if (!tonFarmingData?.length) {
      console.log('🚨 КОРНЕВАЯ ПРОБЛЕМА НАЙДЕНА:');
      console.log('');
      console.log('❌ ОТСУТСТВУЕТ запись в ton_farming_data для пользователя 290');
      console.log('❌ Метод TonFarmingRepository.activateBoost() НЕ СРАБОТАЛ');
      console.log('❌ Планировщик не может найти пользователя для выплат');
      console.log('');
      console.log('✅ ЧТО ДОЛЖНО БЫЛО ПРОИЗОЙТИ:');
      console.log('   1. Депозит 1 TON → записан в transactions ✅');
      console.log('   2. Активация пакета → users.ton_boost_package = 1 ✅');
      console.log('   3. TonFarmingRepository.activateBoost() → создать ton_farming_data ❌');
      console.log('   4. Планировщик → генерировать доходы ❌');
      console.log('');
      console.log('💡 РЕШЕНИЕ: Нужно вручную создать запись в ton_farming_data');
      console.log('   или исправить логику активации');
    }

    // 6. Проверяем что в users для пользователя 290
    console.log('\n6️⃣ СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ 290 В USERS:');
    console.log('=====================================');
    
    const { data: user290, error: userError } = await supabase
      .from('users')
      .select('ton_boost_package, ton_boost_package_id, ton_boost_active, ton_farming_balance, ton_farming_rate, ton_farming_start_timestamp, balance_ton')
      .eq('id', userId)
      .single();

    if (!userError && user290) {
      console.log('✅ Данные пользователя в users:');
      console.log(`   ton_boost_package: ${user290.ton_boost_package}`);
      console.log(`   ton_boost_package_id: ${user290.ton_boost_package_id}`);
      console.log(`   ton_boost_active: ${user290.ton_boost_active}`);
      console.log(`   ton_farming_balance: ${user290.ton_farming_balance}`);
      console.log(`   ton_farming_rate: ${user290.ton_farming_rate}`);
      console.log(`   ton_farming_start_timestamp: ${user290.ton_farming_start_timestamp || 'НЕТ'}`);
      console.log(`   balance_ton: ${user290.balance_ton}`);
      
      // Анализ данных users vs ton_farming_data
      console.log('\n📊 СРАВНЕНИЕ users vs ton_farming_data:');
      if (user290.ton_boost_package && !tonFarmingData?.length) {
        console.log('🚨 НЕСООТВЕТСТВИЕ: Пакет есть в users, но нет в ton_farming_data!');
        console.log('   Это подтверждает что TonFarmingRepository.activateBoost() не сработал');
      }
    }

    console.log('\n✅ === ДИАГНОСТИКА ЗАВЕРШЕНА ===\n');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем полную диагностику
checkAllTablesForUser290();