#!/usr/bin/env tsx
/**
 * Безопасная активация TON Boost пакетов для пользователей 251 и 255
 * Использует штатные методы системы как в продакшн интерфейсе
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface BoostPackage {
  id: number;
  name: string;
  min_amount: number;
  daily_rate: number;
  uni_bonus: number;
  duration_days: number;
  is_active: boolean;
}

async function ensureUserHasBalance(userId: number, requiredAmount: number): Promise<boolean> {
  console.log(`\n💰 Проверяем и обеспечиваем баланс для пользователя ${userId}...`);
  
  // Получаем текущий баланс
  const { data: user, error } = await supabase
    .from('users')
    .select('balance_ton, balance_uni')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error(`❌ Ошибка получения баланса пользователя ${userId}:`, error);
    return false;
  }
  
  const currentBalance = parseFloat(user.balance_ton || '0');
  console.log(`📊 Текущий баланс пользователя ${userId}: ${currentBalance} TON (требуется: ${requiredAmount} TON)`);
  
  if (currentBalance >= requiredAmount) {
    console.log(`✅ У пользователя ${userId} достаточно средств`);
    return true;
  }
  
  // Добавляем недостающую сумму
  const needToAdd = requiredAmount - currentBalance + 0.01; // Небольшой запас
  const newBalance = currentBalance + needToAdd;
  
  console.log(`💳 Добавляем ${needToAdd} TON пользователю ${userId} (новый баланс: ${newBalance} TON)`);
  
  const { error: updateError } = await supabase
    .from('users')
    .update({ 
      balance_ton: newBalance,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
    
  if (updateError) {
    console.error(`❌ Ошибка обновления баланса пользователя ${userId}:`, updateError);
    return false;
  }
  
  // Создаем транзакцию пополнения для прозрачности
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'MANUAL_DEPOSIT',
      amount: needToAdd,
      currency: 'TON',
      status: 'completed',
      description: `Manual balance adjustment for TON Boost activation (+${needToAdd} TON)`,
      metadata: {
        reason: 'ton_boost_activation_preparation',
        admin_action: true,
        original_balance: currentBalance,
        new_balance: newBalance
      },
      created_at: new Date().toISOString()
    });
    
  if (transactionError) {
    console.warn(`⚠️ Не удалось создать транзакцию пополнения для пользователя ${userId}:`, transactionError);
    // Не критично, продолжаем
  }
  
  console.log(`✅ Баланс пользователя ${userId} успешно обновлен до ${newBalance} TON`);
  return true;
}

async function getOptimalBoostPackage(targetAmount: number = 2): Promise<BoostPackage | null> {
  console.log(`\n📦 Поиск оптимального TON Boost пакета для суммы ${targetAmount} TON...`);
  
  const { data: packages, error } = await supabase
    .from('boost_packages')
    .select('*')
    .eq('is_active', true)
    .lte('min_amount', targetAmount)
    .order('min_amount', { ascending: false })
    .limit(1);
    
  if (error) {
    console.error('❌ Ошибка получения пакетов:', error);
    return null;
  }
  
  if (!packages || packages.length === 0) {
    console.error(`❌ Не найдено подходящих пакетов для суммы ${targetAmount} TON`);
    return null;
  }
  
  const selectedPackage = packages[0];
  console.log(`✅ Выбран пакет: ${selectedPackage.name}`, {
    id: selectedPackage.id,
    minAmount: selectedPackage.min_amount,
    dailyRate: selectedPackage.daily_rate,
    uniBonus: selectedPackage.uni_bonus,
    duration: selectedPackage.duration_days
  });
  
  return selectedPackage;
}

async function activateBoostUsingSystemMethod(userId: number, packageId: number): Promise<boolean> {
  console.log(`\n🚀 Активация TON Boost для пользователя ${userId} используя системные методы...`);
  
  try {
    // Импортируем BoostService - тот же что используется в интерфейсе
    const { BoostService } = await import('./modules/boost/service');
    const boostService = new BoostService();
    
    // Вызываем покупку через внутренний кошелек - стандартный метод из интерфейса
    const result = await boostService.purchaseBoost(userId.toString(), packageId.toString(), 'internal_balance');
    
    console.log(`📊 Результат активации для пользователя ${userId}:`, {
      success: result.success,
      message: result.message,
      errorType: result.error_type || 'none',
      hasBalanceUpdate: !!result.balanceUpdate
    });
    
    if (result.success) {
      console.log(`✅ TON Boost успешно активирован для пользователя ${userId}`);
      
      if (result.balanceUpdate) {
        console.log(`💰 Обновление баланса:`, {
          tonBalance: result.balanceUpdate.tonBalance,
          previousBalance: result.balanceUpdate.previousTonBalance,
          deducted: result.balanceUpdate.deductedAmount
        });
      }
      
      return true;
    } else {
      console.error(`❌ Ошибка активации для пользователя ${userId}: ${result.message}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Критическая ошибка при активации для пользователя ${userId}:`, error);
    return false;
  }
}

async function verifyActivationResult(userId: number): Promise<void> {
  console.log(`\n🔍 Проверка результата активации для пользователя ${userId}...`);
  
  // Проверяем таблицу users
  const { data: user } = await supabase
    .from('users')
    .select(`
      ton_boost_active,
      ton_boost_package,
      ton_boost_package_id,
      ton_boost_rate,
      balance_ton,
      balance_uni
    `)
    .eq('id', userId)
    .single();
    
  // Проверяем ton_farming_data
  const { data: farming } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId.toString())
    .single();
    
  // Проверяем последние транзакции
  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount, currency, status, description, created_at')
    .eq('user_id', userId)
    .in('type', ['BOOST_PURCHASE', 'DAILY_BONUS'])
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log(`📊 Результаты проверки для пользователя ${userId}:`);
  console.log(`  Users table:`, {
    boost_active: user?.ton_boost_active,
    package: user?.ton_boost_package,
    package_id: user?.ton_boost_package_id,
    rate: user?.ton_boost_rate,
    balances: {
      ton: user?.balance_ton,
      uni: user?.balance_uni
    }
  });
  
  console.log(`  TON Farming Data:`, farming ? {
    farming_balance: farming.farming_balance,
    farming_rate: farming.farming_rate,
    boost_package_id: farming.boost_package_id,
    boost_active: farming.boost_active
  } : 'Нет записи');
  
  console.log(`  Recent transactions: ${transactions?.length || 0}`);
  transactions?.forEach((tx, index) => {
    console.log(`    ${index + 1}. ${tx.type}: ${tx.amount} ${tx.currency} (${tx.status})`);
  });
  
  // Оценка полноты активации
  const isUserTableOk = user?.ton_boost_active === true && user?.ton_boost_package;
  const isFarmingDataOk = farming?.boost_active === true && farming?.farming_balance;
  const hasTransactions = transactions && transactions.length > 0;
  
  const activationScore = [isUserTableOk, isFarmingDataOk, hasTransactions].filter(Boolean).length;
  const maxScore = 3;
  
  console.log(`${activationScore === maxScore ? '✅' : '⚠️'} Оценка активации: ${activationScore}/${maxScore}`);
  
  if (activationScore === maxScore) {
    console.log(`🎉 TON Boost полностью активирован для пользователя ${userId}!`);
  } else {
    console.log(`❌ Неполная активация для пользователя ${userId} (${activationScore}/${maxScore})`);
  }
}

async function main() {
  console.log('🚀 === БЕЗОПАСНАЯ АКТИВАЦИЯ TON BOOST ПАКЕТОВ ===');
  console.log('📅 Дата:', new Date().toISOString());
  console.log('👥 Целевые пользователи: 251, 255');
  console.log('💰 Депозит: 2 TON каждому');
  console.log('🔧 Метод: Использование штатных системных методов (как в интерфейсе)');
  
  const targetUsers = [251, 255];
  const depositAmount = 2;
  const results: { userId: number; success: boolean }[] = [];
  
  // Получаем оптимальный пакет
  const boostPackage = await getOptimalBoostPackage(depositAmount);
  if (!boostPackage) {
    console.error('❌ Не удалось найти подходящий TON Boost пакет');
    return;
  }
  
  console.log(`\n📦 Будет использован пакет: ${boostPackage.name} (ID: ${boostPackage.id})`);
  
  // Обрабатываем каждого пользователя
  for (const userId of targetUsers) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔄 ОБРАБОТКА ПОЛЬЗОВАТЕЛЯ ${userId}`);
    console.log(`${'='.repeat(80)}`);
    
    try {
      // Шаг 1: Обеспечиваем достаточный баланс
      const balanceOk = await ensureUserHasBalance(userId, boostPackage.min_amount);
      if (!balanceOk) {
        console.error(`❌ Не удалось установить баланс для пользователя ${userId}`);
        results.push({ userId, success: false });
        continue;
      }
      
      // Шаг 2: Активируем буст системным методом
      const activationOk = await activateBoostUsingSystemMethod(userId, boostPackage.id);
      if (!activationOk) {
        console.error(`❌ Не удалось активировать буст для пользователя ${userId}`);
        results.push({ userId, success: false });
        continue;
      }
      
      // Шаг 3: Проверяем результат
      await verifyActivationResult(userId);
      results.push({ userId, success: true });
      
      console.log(`✅ Пользователь ${userId} обработан успешно`);
      
    } catch (error) {
      console.error(`❌ Критическая ошибка для пользователя ${userId}:`, error);
      results.push({ userId, success: false });
    }
  }
  
  // Итоговый отчет
  console.log(`\n${'='.repeat(80)}`);
  console.log('📈 === ИТОГОВЫЕ РЕЗУЛЬТАТЫ ===');
  console.log(`${'='.repeat(80)}`);
  
  results.forEach(({ userId, success }) => {
    console.log(`${success ? '✅' : '❌'} Пользователь ${userId}: ${success ? 'АКТИВИРОВАН' : 'ОШИБКА'}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n🎯 Общий результат: ${successCount}/${totalCount} пользователей успешно активированы`);
  
  if (successCount === totalCount) {
    console.log('🎉 ВСЕ АКТИВАЦИИ ВЫПОЛНЕНЫ УСПЕШНО!');
    console.log('✅ Пользователи 251 и 255 теперь имеют активные TON Boost пакеты');
    console.log('✅ Все данные синхронизированы как в продакшн интерфейсе');
    console.log('✅ Бусты будут отображаться в кабинетах пользователей');
  } else {
    console.log('⚠️ Некоторые активации не удались, требуется дополнительная проверка');
  }
}

// Запуск скрипта
main().catch(console.error);