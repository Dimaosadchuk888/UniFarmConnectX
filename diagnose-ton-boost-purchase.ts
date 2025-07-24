/**
 * ДИАГНОСТИКА ПРОБЛЕМЫ С ПОКУПКОЙ TON BOOST ПАКЕТА
 * User ID: 184 - списался 1 TON, но активация не произошла
 */

import { supabase } from './core/supabase.js';
import { BoostService } from './modules/boost/service.js';
import { logger } from './core/logger.js';

async function diagnoseTonBoostPurchase() {
  console.log('🔍 ДИАГНОСТИКА ПРОБЛЕМЫ С ПОКУПКОЙ TON BOOST ПАКЕТА');
  console.log('================================================\n');
  
  const userId = '184';
  
  try {
    // 1. Проверяем текущее состояние пользователя
    console.log('1️⃣ АНАЛИЗ СОСТОЯНИЯ ПОЛЬЗОВАТЕЛЯ 184:');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance_uni, balance_ton, ton_boost_package, ton_boost_rate, uni_farming_active, uni_deposit_amount')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.log(`❌ Ошибка получения пользователя: ${userError.message}`);
    } else {
      console.log('📊 Текущее состояние пользователя:');
      console.log(`   TON баланс: ${user.balance_ton} TON`);
      console.log(`   UNI баланс: ${user.balance_uni} UNI`);
      console.log(`   TON Boost пакет: ${user.ton_boost_package || 'НЕТ'}`);
      console.log(`   TON Boost ставка: ${user.ton_boost_rate || 'НЕТ'}`);
      console.log(`   UNI фарминг активен: ${user.uni_farming_active}`);
      console.log(`   UNI депозит: ${user.uni_deposit_amount}`);
    }
    
    // 2. Проверяем последние транзакции
    console.log('\n2️⃣ АНАЛИЗ ПОСЛЕДНИХ ТРАНЗАКЦИЙ:');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', parseInt(userId))
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (txError) {
      console.log(`❌ Ошибка получения транзакций: ${txError.message}`);
    } else {
      console.log(`📋 Найдено транзакций: ${transactions.length}`);
      
      // Ищем транзакции связанные с TON Boost
      const boostTransactions = transactions.filter(tx => 
        tx.description?.toLowerCase().includes('boost') ||
        tx.description?.toLowerCase().includes('ton boost') ||
        tx.type?.includes('BOOST')
      );
      
      if (boostTransactions.length > 0) {
        console.log('\n🎯 ТРАНЗАКЦИИ СВЯЗАННЫЕ С TON BOOST:');
        boostTransactions.forEach(tx => {
          console.log(`   - ${tx.created_at}: ${tx.type} ${tx.amount} ${tx.currency}`);
          console.log(`     Описание: ${tx.description}`);
          console.log(`     Статус: ${tx.status}`);
        });
      } else {
        console.log('⚠️ Транзакции TON Boost не найдены');
      }
      
      // Ищем последние списания TON
      const tonWithdrawals = transactions.filter(tx => 
        tx.currency === 'TON' && 
        (tx.type === 'withdrawal' || String(tx.amount).startsWith('-'))
      );
      
      if (tonWithdrawals.length > 0) {
        console.log('\n💸 ПОСЛЕДНИЕ СПИСАНИЯ TON:');
        tonWithdrawals.slice(0, 3).forEach(tx => {
          console.log(`   - ${tx.created_at}: ${tx.amount} TON`);
          console.log(`     Описание: ${tx.description}`);
          console.log(`     Статус: ${tx.status}`);
        });
      }
    }
    
    // 3. Проверяем ton_farming_data
    console.log('\n3️⃣ АНАЛИЗ TON FARMING DATA:');
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);
      
    if (farmingError) {
      console.log(`❌ Ошибка получения farming data: ${farmingError.message}`);
    } else {
      console.log(`📊 Записей в ton_farming_data: ${farmingData.length}`);
      
      if (farmingData.length > 0) {
        farmingData.forEach((data, index) => {
          console.log(`   Запись ${index + 1}:`);
          console.log(`     Баланс фарминга: ${data.farming_balance}`);
          console.log(`     Boost активен: ${data.boost_active}`);
          console.log(`     ID пакета: ${data.boost_package_id}`);
          console.log(`     Создана: ${data.created_at}`);
        });
      } else {
        console.log('⚠️ Записи farming data не найдены');
      }
    }
    
    // 4. Тестируем BoostService
    console.log('\n4️⃣ ТЕСТИРОВАНИЕ BOOST SERVICE:');
    const boostService = new BoostService();
    
    // Проверяем доступные пакеты
    const packages = await boostService.getBoostPackages();
    console.log(`📦 Доступно пакетов: ${packages.length}`);
    
    // Проверяем метод activateBoost
    console.log('\n🔧 АНАЛИЗ ФУНКЦИИ activateBoost:');
    const activateBoostCode = boostService.activateBoost.toString();
    
    if (activateBoostCode.includes('Здесь будет логика активации')) {
      console.log('❌ КРИТИЧЕСКАЯ ОШИБКА: activateBoost все еще заглушка!');
    } else if (activateBoostCode.includes('ton_boost_package') && 
               activateBoostCode.includes('TonFarmingRepository')) {
      console.log('✅ activateBoost содержит восстановленную логику');
    } else {
      console.log('⚠️ activateBoost может быть неполным');
    }
    
    // 5. Диагноз проблемы
    console.log('\n🎯 ДИАГНОЗ ПРОБЛЕМЫ:');
    console.log('===================');
    
    if (user && !user.ton_boost_package) {
      console.log('❌ ПРОБЛЕМА ПОДТВЕРЖДЕНА: TON списан, но ton_boost_package НЕ установлен');
      console.log('❌ Это означает что activateBoost() НЕ СРАБОТАЛ');
    }
    
    if (boostTransactions.length === 0) {
      console.log('❌ ПРОБЛЕМА: UNI бонус не был начислен (нет транзакций UNI бонуса)');
    }
    
    console.log('\n🔥 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
    console.log('====================');
    console.log('1. Функция activateBoost() завершилась с ошибкой');
    console.log('2. Ошибка в updateBoostPackage() при обновлении users');
    console.log('3. Ошибка в TonFarmingRepository.activateBoost()');
    console.log('4. Сетевая ошибка или таймаут при активации');
    console.log('5. Проблема с транзакцией в базе данных');
    
    console.log('\n📋 РЕКОМЕНДАЦИИ:');
    console.log('================');
    console.log('1. Проверить логи сервера на момент покупки');
    console.log('2. Добавить детальное логирование в activateBoost()');
    console.log('3. Проверить каждый шаг активации отдельно');
    console.log('4. Возможно нужен rollback транзакции');
    
  } catch (error) {
    console.error('💥 Критическая ошибка диагностики:', error);
  }
}

// Запуск диагностики
diagnoseTonBoostPurchase()
  .then(() => {
    console.log('\n✅ Диагностика завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Ошибка:', error);
    process.exit(1);
  });