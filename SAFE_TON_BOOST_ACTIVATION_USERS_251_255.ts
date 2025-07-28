#!/usr/bin/env tsx
/**
 * Безопасная активация TON Boost пакетов для пользователей 251 и 255
 * Использует те же методы что и продакшн интерфейс
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface UserBoostData {
  user_id: number;
  current_ton_balance: number;
  current_uni_balance: number;
  ton_boost_active: boolean;
  ton_boost_package: string | null;
  ton_boost_rate: number;
}

interface BoostPackage {
  id: number;
  name: string;
  min_amount: number;
  rate_ton_per_second: number;
  bonus_uni: number;
}

async function getUserCurrentState(userId: number): Promise<UserBoostData | null> {
  console.log(`\n🔍 Проверяем текущее состояние пользователя ${userId}...`);
  
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id,
      balance_ton,
      balance_uni,
      ton_boost_active,
      ton_boost_package,
      ton_boost_rate
    `)
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error(`❌ Ошибка получения данных пользователя ${userId}:`, error);
    return null;
  }
  
  if (!user) {
    console.error(`❌ Пользователь ${userId} не найден`);
    return null;
  }
  
  const userData: UserBoostData = {
    user_id: user.id,
    current_ton_balance: parseFloat(user.balance_ton) || 0,
    current_uni_balance: parseFloat(user.balance_uni) || 0,
    ton_boost_active: user.ton_boost_active || false,
    ton_boost_package: user.ton_boost_package,
    ton_boost_rate: parseFloat(user.ton_boost_rate) || 0
  };
  
  console.log(`✅ Текущее состояние пользователя ${userId}:`, {
    tonBalance: userData.current_ton_balance,
    uniBalance: userData.current_uni_balance,
    boostActive: userData.ton_boost_active,
    currentPackage: userData.ton_boost_package,
    currentRate: userData.ton_boost_rate
  });
  
  return userData;
}

async function getAvailableBoostPackages(): Promise<BoostPackage[]> {
  console.log('\n📦 Получаем доступные TON Boost пакеты...');
  
  const { data: packages, error } = await supabase
    .from('boost_packages')
    .select('*')
    .eq('is_active', true)
    .order('min_amount', { ascending: true });
    
  if (error) {
    console.error('❌ Ошибка получения пакетов:', error);
    return [];
  }
  
  console.log(`✅ Найдено ${packages?.length || 0} активных пакетов:`);
  packages?.forEach(pkg => {
    console.log(`  - ${pkg.name}: ${pkg.min_amount} TON, ставка: ${pkg.rate_ton_per_second}, бонус UNI: ${pkg.bonus_uni}`);
  });
  
  return packages || [];
}

async function selectOptimalPackage(depositAmount: number, packages: BoostPackage[]): Promise<BoostPackage | null> {
  // Найдем пакет который подходит для суммы депозита
  const suitablePackages = packages.filter(pkg => depositAmount >= pkg.min_amount);
  
  if (suitablePackages.length === 0) {
    console.error(`❌ Нет подходящих пакетов для депозита ${depositAmount} TON`);
    return null;
  }
  
  // Выбираем лучший пакет (с максимальной ставкой для данной суммы)
  const optimalPackage = suitablePackages.reduce((best, current) => 
    current.rate_ton_per_second > best.rate_ton_per_second ? current : best
  );
  
  console.log(`✅ Выбран оптимальный пакет для ${depositAmount} TON:`, {
    name: optimalPackage.name,
    minAmount: optimalPackage.min_amount,
    rate: optimalPackage.rate_ton_per_second,
    bonusUni: optimalPackage.bonus_uni
  });
  
  return optimalPackage;
}

async function createBoostPurchaseTransaction(userId: number, packageData: BoostPackage, depositAmount: number) {
  console.log(`\n💰 Создаем транзакцию покупки TON Boost для пользователя ${userId}...`);
  
  const transactionData = {
    user_id: userId,
    type: 'BOOST_PURCHASE',
    amount: depositAmount,
    currency: 'TON',
    status: 'completed',
    description: `TON Boost Package Purchase: ${packageData.name}`,
    metadata: {
      package_id: packageData.id,
      package_name: packageData.name,
      deposit_amount: depositAmount,
      rate_ton_per_second: packageData.rate_ton_per_second,
      bonus_uni: packageData.bonus_uni,
      manual_activation: true,
      activation_date: new Date().toISOString()
    },
    created_at: new Date().toISOString()
  };
  
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert(transactionData)
    .select()
    .single();
    
  if (error) {
    console.error(`❌ Ошибка создания транзакции для пользователя ${userId}:`, error);
    return null;
  }
  
  console.log(`✅ Транзакция создана для пользователя ${userId}:`, {
    id: transaction.id,
    amount: transaction.amount,
    type: transaction.type,
    status: transaction.status
  });
  
  return transaction;
}

async function createTonFarmingData(userId: number, packageData: BoostPackage, depositAmount: number) {
  console.log(`\n🚜 Создаем запись в ton_farming_data для пользователя ${userId}...`);
  
  // Проверяем, есть ли уже запись
  const { data: existing } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId.toString())
    .single();
    
  if (existing) {
    console.log(`⚠️ Запись в ton_farming_data уже существует для пользователя ${userId}, обновляем...`);
    
    const { data: updated, error } = await supabase
      .from('ton_farming_data')
      .update({
        farming_balance: depositAmount,
        farming_rate: packageData.rate_ton_per_second,
        boost_package_id: packageData.id,
        last_claim: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId.toString())
      .select()
      .single();
      
    if (error) {
      console.error(`❌ Ошибка обновления ton_farming_data для пользователя ${userId}:`, error);
      return null;
    }
    
    console.log(`✅ ton_farming_data обновлен для пользователя ${userId}`);
    return updated;
  } else {
    // Создаем новую запись
    const farmingData = {
      user_id: userId.toString(),
      farming_balance: depositAmount,
      farming_rate: packageData.rate_ton_per_second,
      boost_package_id: packageData.id,
      last_claim: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: created, error } = await supabase
      .from('ton_farming_data')
      .insert(farmingData)
      .select()
      .single();
      
    if (error) {
      console.error(`❌ Ошибка создания ton_farming_data для пользователя ${userId}:`, error);
      return null;
    }
    
    console.log(`✅ ton_farming_data создан для пользователя ${userId}`);
    return created;
  }
}

async function updateUserBoostStatus(userId: number, packageData: BoostPackage) {
  console.log(`\n👤 Обновляем статус TON Boost в таблице users для пользователя ${userId}...`);
  
  const updateData = {
    ton_boost_active: true,
    ton_boost_package: packageData.name,
    ton_boost_package_id: packageData.id,
    ton_boost_rate: packageData.rate_ton_per_second,
    updated_at: new Date().toISOString()
  };
  
  const { data: updated, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();
    
  if (error) {
    console.error(`❌ Ошибка обновления пользователя ${userId}:`, error);
    return null;
  }
  
  console.log(`✅ Статус пользователя ${userId} обновлен:`, {
    ton_boost_active: updated.ton_boost_active,
    ton_boost_package: updated.ton_boost_package,
    ton_boost_rate: updated.ton_boost_rate
  });
  
  return updated;
}

async function awardUniBonus(userId: number, packageData: BoostPackage) {
  console.log(`\n🎁 Начисляем UNI бонус пользователю ${userId}...`);
  
  if (packageData.bonus_uni <= 0) {
    console.log(`ℹ️ UNI бонус не предусмотрен для пакета ${packageData.name}`);
    return null;
  }
  
  // Создаем транзакцию бонуса
  const bonusTransaction = {
    user_id: userId,
    type: 'DAILY_BONUS',
    amount: packageData.bonus_uni,
    currency: 'UNI',
    status: 'completed',
    description: `TON Boost Package Bonus: ${packageData.bonus_uni} UNI`,
    metadata: {
      bonus_type: 'ton_boost_package',
      package_id: packageData.id,
      package_name: packageData.name,
      manual_activation: true
    },
    created_at: new Date().toISOString()
  };
  
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert(bonusTransaction)
    .select()
    .single();
    
  if (error) {
    console.error(`❌ Ошибка создания UNI бонуса для пользователя ${userId}:`, error);
    return null;
  }
  
  // Обновляем баланс пользователя
  const { data: user, error: balanceError } = await supabase
    .from('users')
    .select('balance_uni')
    .eq('id', userId)
    .single();
    
  if (balanceError) {
    console.error(`❌ Ошибка получения баланса для пользователя ${userId}:`, balanceError);
    return transaction;
  }
  
  const newBalance = parseFloat(user.balance_uni || '0') + packageData.bonus_uni;
  
  const { error: updateError } = await supabase
    .from('users')
    .update({ balance_uni: newBalance })
    .eq('id', userId);
    
  if (updateError) {
    console.error(`❌ Ошибка обновления UNI баланса для пользователя ${userId}:`, updateError);
  } else {
    console.log(`✅ UNI бонус ${packageData.bonus_uni} начислен пользователю ${userId}, новый баланс: ${newBalance}`);
  }
  
  return transaction;
}

async function activateBoostForUser(userId: number, depositAmount: number = 2): Promise<boolean> {
  console.log(`\n🚀 === АКТИВАЦИЯ TON BOOST ДЛЯ ПОЛЬЗОВАТЕЛЯ ${userId} ===`);
  
  try {
    // 1. Проверяем текущее состояние
    const currentState = await getUserCurrentState(userId);
    if (!currentState) {
      return false;
    }
    
    // 2. Получаем доступные пакеты
    const packages = await getAvailableBoostPackages();
    if (packages.length === 0) {
      return false;
    }
    
    // 3. Выбираем оптимальный пакет
    const selectedPackage = await selectOptimalPackage(depositAmount, packages);
    if (!selectedPackage) {
      return false;
    }
    
    // 4. Создаем транзакцию покупки
    const purchaseTransaction = await createBoostPurchaseTransaction(userId, selectedPackage, depositAmount);
    if (!purchaseTransaction) {
      return false;
    }
    
    // 5. Создаем/обновляем данные фарминга
    const farmingData = await createTonFarmingData(userId, selectedPackage, depositAmount);
    if (!farmingData) {
      return false;
    }
    
    // 6. Обновляем статус пользователя
    const updatedUser = await updateUserBoostStatus(userId, selectedPackage);
    if (!updatedUser) {
      return false;
    }
    
    // 7. Начисляем UNI бонус если предусмотрен
    await awardUniBonus(userId, selectedPackage);
    
    console.log(`\n🎉 === АКТИВАЦИЯ ЗАВЕРШЕНА УСПЕШНО ДЛЯ ПОЛЬЗОВАТЕЛЯ ${userId} ===`);
    console.log(`✅ Пакет: ${selectedPackage.name}`);
    console.log(`✅ Депозит: ${depositAmount} TON`);
    console.log(`✅ Ставка: ${selectedPackage.rate_ton_per_second} TON/сек`);
    console.log(`✅ UNI бонус: ${selectedPackage.bonus_uni} UNI`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Критическая ошибка при активации для пользователя ${userId}:`, error);
    return false;
  }
}

async function verifyActivation(userId: number): Promise<void> {
  console.log(`\n🔍 === ПРОВЕРКА АКТИВАЦИИ ДЛЯ ПОЛЬЗОВАТЕЛЯ ${userId} ===`);
  
  // Проверяем статус в users
  const { data: user } = await supabase
    .from('users')
    .select('ton_boost_active, ton_boost_package, ton_boost_rate')
    .eq('id', userId)
    .single();
    
  // Проверяем ton_farming_data
  const { data: farming } = await supabase
    .from('ton_farming_data')
    .select('farming_balance, farming_rate, boost_package_id')
    .eq('user_id', userId.toString())
    .single();
    
  // Проверяем транзакции
  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount, currency, status, created_at')
    .eq('user_id', userId)
    .eq('type', 'BOOST_PURCHASE')
    .order('created_at', { ascending: false })
    .limit(1);
    
  console.log(`📊 Результаты проверки для пользователя ${userId}:`);
  console.log(`  Users table:`, {
    boost_active: user?.ton_boost_active,
    package: user?.ton_boost_package,
    rate: user?.ton_boost_rate
  });
  console.log(`  Farming data:`, {
    balance: farming?.farming_balance,
    rate: farming?.farming_rate,
    package_id: farming?.boost_package_id
  });
  console.log(`  Recent transactions:`, transactions?.length || 0);
  
  const isFullyActivated = 
    user?.ton_boost_active === true &&
    user?.ton_boost_package &&
    farming?.farming_balance > 0 &&
    transactions && transactions.length > 0;
    
  console.log(`${isFullyActivated ? '✅' : '❌'} Статус активации: ${isFullyActivated ? 'УСПЕШНО' : 'НЕПОЛНАЯ'}`);
}

async function main() {
  console.log('🚀 === БЕЗОПАСНАЯ АКТИВАЦИЯ TON BOOST ПАКЕТОВ ===');
  console.log('📅 Дата:', new Date().toISOString());
  console.log('👥 Пользователи: 251, 255');
  console.log('💰 Депозит каждому: 2 TON');
  
  const targetUsers = [251, 255];
  const depositAmount = 2;
  const results: { userId: number; success: boolean }[] = [];
  
  for (const userId of targetUsers) {
    const success = await activateBoostForUser(userId, depositAmount);
    results.push({ userId, success });
    
    if (success) {
      await verifyActivation(userId);
    }
    
    console.log('\n' + '='.repeat(80));
  }
  
  console.log('\n📈 === ИТОГОВЫЕ РЕЗУЛЬТАТЫ ===');
  results.forEach(({ userId, success }) => {
    console.log(`${success ? '✅' : '❌'} Пользователь ${userId}: ${success ? 'АКТИВИРОВАН' : 'ОШИБКА'}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 Общий результат: ${successCount}/${results.length} пользователей активированы успешно`);
  
  if (successCount === results.length) {
    console.log('🎉 ВСЕ АКТИВАЦИИ ВЫПОЛНЕНЫ УСПЕШНО!');
  } else {
    console.log('⚠️ Некоторые активации не удались, требуется проверка');
  }
}

// Запуск скрипта
if (require.main === module) {
  main().catch(console.error);
}

export { activateBoostForUser, verifyActivation };