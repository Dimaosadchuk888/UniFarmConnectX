import { supabase } from './core/supabase';
import * as fs from 'fs';

async function investigateTableUsage() {
  console.log('=== ИССЛЕДОВАНИЕ ИСПОЛЬЗОВАНИЯ ТАБЛИЦ TON BOOST ===\n');
  console.log(`Время: ${new Date().toLocaleString()}\n`);

  try {
    // 1. Анализ TonFarmingRepository
    console.log('📦 1. АНАЛИЗ TonFarmingRepository:\n');
    
    const repoPath = './modules/boost/TonFarmingRepository.ts';
    const repoContent = fs.readFileSync(repoPath, 'utf-8');
    
    // Поиск всех обращений к таблицам
    const fromMatches = repoContent.match(/from\(['"](\w+)['"]\)/g);
    if (fromMatches) {
      console.log('Найденные обращения к таблицам:');
      const tables = new Set<string>();
      fromMatches.forEach(match => {
        const tableName = match.match(/from\(['"](\w+)['"]\)/)?.[1];
        if (tableName) tables.add(tableName);
      });
      tables.forEach(table => console.log(`  - ${table}`));
    }

    // Поиск метода checkTableExists
    const checkTableMethod = repoContent.match(/async checkTableExists[^}]+}/s)?.[0];
    if (checkTableMethod) {
      console.log('\nМетод checkTableExists:');
      console.log('  Проверяет существование ton_farming_data');
      console.log('  Использует fallback на таблицу users');
    }

    // 2. Проверка планировщика
    console.log('\n📅 2. АНАЛИЗ ПЛАНИРОВЩИКА:\n');
    
    const schedulerPath = './modules/scheduler/tonBoostIncomeScheduler.ts';
    const schedulerContent = fs.readFileSync(schedulerPath, 'utf-8');
    
    // Поиск метода getActiveBoostUsers
    const getActiveMethod = schedulerContent.match(/async getActiveBoostUsers[^}]+}/s)?.[0];
    if (getActiveMethod) {
      console.log('Метод getActiveBoostUsers:');
      if (getActiveMethod.includes('tonFarmingRepo.getActiveBoostUsers')) {
        console.log('  ✅ Использует tonFarmingRepo.getActiveBoostUsers()');
      }
    }

    // Поиск метода processTonBoostIncome
    const processMethod = schedulerContent.includes('processTonBoostIncome');
    console.log(`\nМетод processTonBoostIncome: ${processMethod ? '✅ Найден' : '❌ НЕ найден'}`);

    // 3. Сравнение данных в таблицах
    console.log('\n🔍 3. СРАВНЕНИЕ ДАННЫХ В ТАБЛИЦАХ:\n');
    
    // Данные из users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, balance_ton, ton_boost_active, ton_boost_package_id, ton_farming_balance')
      .eq('id', 74)
      .single();

    if (!userError && userData) {
      console.log('Таблица users (id=74):');
      console.log(`  balance_ton: ${userData.balance_ton}`);
      console.log(`  ton_boost_active: ${userData.ton_boost_active}`);
      console.log(`  ton_boost_package_id: ${userData.ton_boost_package_id}`);
      console.log(`  ton_farming_balance: ${userData.ton_farming_balance} ${userData.ton_farming_balance ? '✅' : '❌'}`);
    }

    // Данные из ton_farming_data
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', 74)
      .single();

    if (!farmingError && farmingData) {
      console.log('\nТаблица ton_farming_data (user_id=74):');
      console.log(`  farming_balance: ${farmingData.farming_balance} ${parseFloat(farmingData.farming_balance) > 0 ? '✅' : '❌'}`);
      console.log(`  boost_active: ${farmingData.boost_active}`);
      console.log(`  boost_package_id: ${farmingData.boost_package_id}`);
      console.log(`  farming_rate: ${farmingData.farming_rate}`);
    }

    // 4. Проверка, какая таблица реально используется
    console.log('\n🎯 4. КАКАЯ ТАБЛИЦА ИСПОЛЬЗУЕТСЯ:\n');
    
    // Проверяем getActiveBoostUsers в TonFarmingRepository
    const getActiveUsersMethod = repoContent.match(/async getActiveBoostUsers[^}]+}/s)?.[0];
    if (getActiveUsersMethod) {
      if (getActiveUsersMethod.includes('ton_farming_data')) {
        console.log('getActiveBoostUsers использует: ton_farming_data ✅');
      } else if (getActiveUsersMethod.includes('users')) {
        console.log('getActiveBoostUsers использует: users (fallback) ⚠️');
      }
    }

    // 5. Выводы
    console.log('\n📊 5. ВЫВОДЫ:\n');
    
    console.log('ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
    console.log('1. TonFarmingRepository имеет fallback логику');
    console.log('2. Возможно используется таблица users вместо ton_farming_data');
    console.log('3. В users таблице ton_farming_balance = NULL');
    console.log('4. В ton_farming_data farming_balance = 0');
    console.log('5. Данные разделены между двумя таблицами');
    
    console.log('\nКЛЮЧЕВАЯ ПРОБЛЕМА:');
    console.log('Планировщик может искать данные не в той таблице!');

  } catch (error) {
    console.error('❌ Ошибка исследования:', error);
  }
}

investigateTableUsage();