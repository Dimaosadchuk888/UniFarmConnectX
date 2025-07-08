/**
 * ИССЛЕДОВАНИЕ: Проблема некорректного списания монет при депозитах
 * Цель: Определить почему списывается только 1 монета вместо введенной суммы
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function investigateDepositDeduction() {
  console.log('🔍 ИССЛЕДОВАНИЕ: Проблема списания монет при депозитах');
  console.log('='.repeat(60));

  const userId = 62;
  
  try {
    // 1. Проверяем текущий баланс пользователя
    console.log('\n1. ТЕКУЩИЙ БАЛАНС ПОЛЬЗОВАТЕЛЯ:');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, balance_uni, balance_ton, uni_deposit_amount, uni_farming_rate')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('❌ Ошибка получения пользователя:', userError);
      return;
    }
    
    console.log(`👤 Пользователь: ${user.username} (ID: ${user.id})`);
    console.log(`💰 Баланс UNI: ${user.balance_uni}`);
    console.log(`💰 Баланс TON: ${user.balance_ton}`);
    console.log(`📊 Общий депозит: ${user.uni_deposit_amount}`);
    console.log(`⚡ Ставка фарминга: ${user.uni_farming_rate}`);

    // 2. Сначала проверяем схему таблицы transactions
    console.log('\n2. СХЕМА ТАБЛИЦЫ TRANSACTIONS:');
    const { data: tableInfo, error: tableError } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Ошибка получения схемы таблицы:', tableError);
      return;
    }
    
    if (tableInfo && tableInfo.length > 0) {
      console.log('📋 Доступные колонки:', Object.keys(tableInfo[0]));
    }

    // 3. Проверяем последние транзакции депозитов с правильными полями
    console.log('\n3. ПОСЛЕДНИЕ ТРАНЗАКЦИИ ДЕПОЗИТОВ:');
    const { data: deposits, error: depositsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (depositsError) {
      console.error('❌ Ошибка получения транзакций:', depositsError);
      return;
    }

    deposits.forEach((tx, index) => {
      // Используем правильные названия полей
      const amount = tx.amount_uni || tx.amount_ton || tx.amount || 'N/A';
      const type = tx.type || 'UNKNOWN';
      const description = tx.description || 'Нет описания';
      const currency = tx.currency || (tx.amount_uni ? 'UNI' : 'TON');
      
      console.log(`${index + 1}. ${type}: ${amount} ${currency} - ${description}`);
      console.log(`   Создано: ${new Date(tx.created_at).toLocaleString()}`);
    });

    // 4. Анализируем паттерны депозитов
    console.log('\n4. АНАЛИЗ ПАТТЕРНОВ ДЕПОЗИТОВ:');
    const farmingDeposits = deposits.filter(tx => tx.type === 'FARMING_DEPOSIT' || tx.type === 'FARMING_REWARD');
    const farmingRewards = deposits.filter(tx => tx.type === 'FARMING_REWARD');
    
    console.log(`📈 Депозиты фарминга: ${farmingDeposits.length}`);
    console.log(`🎁 Награды фарминга: ${farmingRewards.length}`);
    
    if (farmingDeposits.length > 0) {
      const amounts = farmingDeposits.map(tx => {
        const amount = tx.amount_uni || tx.amount_ton || tx.amount || 0;
        return parseFloat(amount);
      });
      const totalDeposited = amounts.reduce((sum, amount) => sum + amount, 0);
      const avgDeposit = totalDeposited / amounts.length;
      
      console.log(`💸 Общая сумма депозитов: ${totalDeposited.toFixed(6)} UNI`);
      console.log(`📊 Средний депозит: ${avgDeposit.toFixed(6)} UNI`);
      console.log(`🔢 Суммы депозитов: ${amounts.join(', ')}`);
      
      // Проверяем есть ли депозиты на 1 UNI (подозрительно)
      const oneUniDeposits = amounts.filter(amount => amount === 1);
      if (oneUniDeposits.length > 0) {
        console.log(`⚠️  НАЙДЕНО ${oneUniDeposits.length} депозитов на точно 1 UNI - это подозрительно!`);
      }
    }

    // 5. Проверяем консистентность данных
    console.log('\n5. КОНСИСТЕНТНОСТЬ ДАННЫХ:');
    const depositSum = farmingDeposits.reduce((sum, tx) => {
      const amount = tx.amount_uni || tx.amount_ton || tx.amount || 0;
      return sum + parseFloat(amount);
    }, 0);
    const currentDepositAmount = parseFloat(user.uni_deposit_amount);
    
    console.log(`💰 Сумма депозитов в транзакциях: ${depositSum.toFixed(6)} UNI`);
    console.log(`📊 Текущий uni_deposit_amount: ${currentDepositAmount.toFixed(6)} UNI`);
    console.log(`🔍 Разница: ${Math.abs(depositSum - currentDepositAmount).toFixed(6)} UNI`);
    
    if (Math.abs(depositSum - currentDepositAmount) > 0.001) {
      console.log('⚠️  ОБНАРУЖЕНА НЕСООТВЕТСТВИЕ! Сумма транзакций не совпадает с uni_deposit_amount');
    } else {
      console.log('✅ Данные консистентны');
    }

    // 5. Проверяем баланс после депозитов
    console.log('\n5. АНАЛИЗ ИЗМЕНЕНИЙ БАЛАНСА:');
    
    // Симулируем как должен изменяться баланс
    const initialBalance = 1000; // Предполагаемый начальный баланс
    const expectedBalance = initialBalance - depositSum;
    const actualBalance = parseFloat(user.balance_uni);
    
    console.log(`💰 Ожидаемый баланс: ${expectedBalance.toFixed(6)} UNI`);
    console.log(`💰 Фактический баланс: ${actualBalance.toFixed(6)} UNI`);
    console.log(`🔍 Разница: ${Math.abs(expectedBalance - actualBalance).toFixed(6)} UNI`);

    // 6. Проводим тест создания депозита
    console.log('\n6. ТЕСТ СОЗДАНИЯ ДЕПОЗИТА:');
    console.log('Для полного анализа нужно создать тестовый депозит через API...');
    
    const testAmount = 5.5; // Тестовая сумма
    console.log(`🧪 Тестовая сумма: ${testAmount} UNI`);
    console.log(`📋 Рекомендация: Проверить запрос POST /api/v2/uni-farming/deposit`);
    console.log(`📋 Параметры: { amount: "${testAmount}" }`);
    
    // 7. Итоговый анализ
    console.log('\n7. ИТОГОВЫЙ АНАЛИЗ:');
    console.log('=' .repeat(60));
    
    if (farmingDeposits.some(tx => parseFloat(tx.amount) === 1)) {
      console.log('🚨 ПРОБЛЕМА ОБНАРУЖЕНА:');
      console.log('   • Множественные депозиты на точно 1 UNI');
      console.log('   • Возможная проблема в frontend передаче параметров');
      console.log('   • Или проблема в backend парсинге суммы');
    }
    
    console.log('\n📋 РЕКОМЕНДАЦИИ ДЛЯ ДАЛЬНЕЙШЕГО ИССЛЕДОВАНИЯ:');
    console.log('1. Проверить какие данные передаются в API запросе');
    console.log('2. Проверить как backend обрабатывает параметр amount');
    console.log('3. Проверить логику FarmingService.depositUniForFarming()');
    console.log('4. Проверить валидацию на frontend');

  } catch (error) {
    console.error('❌ Ошибка при исследовании:', error);
  }
}

// Запуск исследования
investigateDepositDeduction()
  .then(() => console.log('\n✅ Исследование завершено'))
  .catch(error => console.error('❌ Ошибка:', error));