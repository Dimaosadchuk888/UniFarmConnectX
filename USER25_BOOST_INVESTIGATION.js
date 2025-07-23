#!/usr/bin/env node

/**
 * 🔍 СПЕЦИАЛЬНОЕ РАССЛЕДОВАНИЕ ПРОБЛЕМЫ USER #25
 * Анализируем, почему TON Boost пакет не отобразился после покупки
 * 
 * Задачи:
 * 1. Проверить записи в базе данных 
 * 2. Найти транзакции покупки
 * 3. Проверить активацию планировщика
 * 4. Анализировать логику отображения frontend
 * 5. Найти точки отказа в системе
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Инициализация Supabase (используем переменные окружения)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ОШИБКА: Переменные SUPABASE_URL и SUPABASE_KEY не найдены');
  console.log('Убедитесь, что .env файл настроен правильно');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const USER_ID = 25; // User #25 из продакшн

async function investigateUser25BoostIssue() {
  console.log('🔍 РАССЛЕДОВАНИЕ ПРОБЛЕМЫ USER #25 TON BOOST ПАКЕТА');
  console.log('=' * 70);
  console.log('');

  try {
    // 1. БАЗОВАЯ ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ
    console.log('1️⃣ ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ #25:');
    console.log('-'.repeat(50));
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', USER_ID)
      .single();

    if (userError) {
      console.log(`❌ Ошибка получения пользователя: ${userError.message}`);
      return;
    }

    if (!user) {
      console.log('❌ Пользователь #25 не найден в базе данных');
      return;
    }

    console.log(`- ID: ${user.id}`);
    console.log(`- Telegram ID: ${user.telegram_id}`);
    console.log(`- Username: ${user.username || 'N/A'}`);
    console.log(`- Баланс UNI: ${user.balance_uni} UNI`);
    console.log(`- Баланс TON: ${user.balance_ton} TON`);
    console.log(`- TON Boost Package: ${user.ton_boost_package || 'НЕ АКТИВИРОВАН'}`);
    console.log(`- TON Boost Rate: ${user.ton_boost_rate || 'N/A'}`);
    console.log(`- Создан: ${new Date(user.created_at).toLocaleString()}`);
    
    // 2. ПРОВЕРКА TON FARMING DATA
    console.log('\\n2️⃣ TON FARMING DATA:');
    console.log('-'.repeat(50));
    
    const { data: tonFarmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', USER_ID);

    if (farmingError) {
      console.log(`❌ Ошибка получения ton_farming_data: ${farmingError.message}`);
    } else if (!tonFarmingData || tonFarmingData.length === 0) {
      console.log('❌ Записи в ton_farming_data НЕ НАЙДЕНЫ');
      console.log('   Это может объяснить, почему пакет не отображается!');
    } else {
      console.log(`✅ Найдено записей: ${tonFarmingData.length}`);
      
      tonFarmingData.forEach((farming, index) => {
        console.log(`\\n  Запись ${index + 1}:`);
        console.log(`  - Boost активен: ${farming.boost_active}`);
        console.log(`  - Boost Package ID: ${farming.boost_package_id}`);
        console.log(`  - Farming Balance: ${farming.farming_balance} TON`);
        console.log(`  - Farming Rate: ${farming.farming_rate}% в день`);
        console.log(`  - Последнее обновление: ${new Date(farming.farming_last_update).toLocaleString()}`);
        console.log(`  - Активирован: ${new Date(farming.farming_start_timestamp).toLocaleString()}`);
      });
    }

    // 3. АНАЛИЗ ТРАНЗАКЦИЙ ПОКУПКИ BOOST
    console.log('\\n3️⃣ ТРАНЗАКЦИИ ПОКУПКИ TON BOOST:');
    console.log('-'.repeat(50));
    
    const { data: boostTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', USER_ID)
      .or('type.eq.BOOST_PURCHASE,description.ilike.%boost%,description.ilike.%TON Boost%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (txError) {
      console.log(`❌ Ошибка получения транзакций: ${txError.message}`);
    } else if (!boostTransactions || boostTransactions.length === 0) {
      console.log('❌ ТРАНЗАКЦИИ ПОКУПКИ BOOST НЕ НАЙДЕНЫ');
      console.log('   Это может означать, что покупка не была записана в базу!');
    } else {
      console.log(`✅ Найдено транзакций: ${boostTransactions.length}`);
      
      boostTransactions.forEach((tx, index) => {
        console.log(`\\n  Транзакция ${index + 1}:`);
        console.log(`  - ID: ${tx.id}`);
        console.log(`  - Тип: ${tx.type}`);
        console.log(`  - Сумма: ${tx.amount} ${tx.currency}`);
        console.log(`  - Статус: ${tx.status}`);
        console.log(`  - Описание: ${tx.description}`);
        console.log(`  - Дата: ${new Date(tx.created_at).toLocaleString()}`);
        
        if (tx.metadata) {
          console.log(`  - Метаданные:`, JSON.stringify(tx.metadata, null, 4));
        }
      });
    }

    // 4. ПРОВЕРКА BOOST_PURCHASES ТАБЛИЦЫ
    console.log('\\n4️⃣ BOOST_PURCHASES ЗАПИСИ:');
    console.log('-'.repeat(50));
    
    const { data: boostPurchases, error: purchaseError } = await supabase
      .from('boost_purchases')
      .select('*')
      .eq('user_id', USER_ID)
      .order('created_at', { ascending: false });

    if (purchaseError) {
      console.log(`❌ Ошибка получения boost_purchases: ${purchaseError.message}`);
      console.log('   Возможно, таблица boost_purchases не существует или недоступна');
    } else if (!boostPurchases || boostPurchases.length === 0) {
      console.log('❌ ЗАПИСИ В BOOST_PURCHASES НЕ НАЙДЕНЫ');
    } else {
      console.log(`✅ Найдено покупок: ${boostPurchases.length}`);
      
      boostPurchases.forEach((purchase, index) => {
        console.log(`\\n  Покупка ${index + 1}:`);
        console.log(`  - ID: ${purchase.id}`);
        console.log(`  - Boost ID: ${purchase.boost_id}`);
        console.log(`  - Источник: ${purchase.source}`);
        console.log(`  - Статус: ${purchase.status}`);
        console.log(`  - TX Hash: ${purchase.tx_hash || 'N/A'}`);
        console.log(`  - Дата: ${new Date(purchase.created_at).toLocaleString()}`);
      });
    }

    // 5. АНАЛИЗ UNI БОНУСОВ
    console.log('\\n5️⃣ UNI БОНУСЫ ЗА BOOST:');
    console.log('-'.repeat(50));
    
    const { data: uniBonus, error: bonusError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', USER_ID)
      .or('type.eq.DAILY_BONUS,description.ilike.%UNI бонус%,description.ilike.%boost%')
      .eq('currency', 'UNI')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!bonusError && uniBonus && uniBonus.length > 0) {
      console.log(`✅ Найдено UNI бонусов: ${uniBonus.length}`);
      
      uniBonus.forEach((bonus, index) => {
        console.log(`\\n  Бонус ${index + 1}:`);
        console.log(`  - Сумма: ${bonus.amount} UNI`);
        console.log(`  - Описание: ${bonus.description}`);
        console.log(`  - Дата: ${new Date(bonus.created_at).toLocaleString()}`);
      });
    } else {
      console.log('❌ UNI БОНУСЫ НЕ НАЙДЕНЫ');
      console.log('   Это указывает на то, что логика начисления бонуса не сработала');
    }

    // 6. ДИАГНОСТИКА ПРОБЛЕМ
    console.log('\\n6️⃣ ДИАГНОСТИКА ПРОБЛЕМ:');
    console.log('-'.repeat(50));
    
    const issues = [];
    
    // Проверка активации пакета в users
    if (!user.ton_boost_package) {
      issues.push({
        severity: 'КРИТИЧНО',
        issue: 'users.ton_boost_package не установлен',
        impact: 'Frontend не будет показывать активный пакет',
        solution: 'Проверить работу BoostService.createBoostPurchase()'
      });
    }
    
    // Проверка ton_farming_data
    if (!tonFarmingData || tonFarmingData.length === 0) {
      issues.push({
        severity: 'КРИТИЧНО',
        issue: 'Отсутствуют записи в ton_farming_data',
        impact: 'Планировщик не будет начислять доход',
        solution: 'Проверить работу TonFarmingRepository.activateBoost()'
      });
    }
    
    // Проверка транзакций
    if (!boostTransactions || boostTransactions.length === 0) {
      issues.push({
        severity: 'СРЕДНЕ',
        issue: 'Отсутствуют транзакции покупки',
        impact: 'Нет записи о покупке в истории',
        solution: 'Проверить создание транзакций в BoostService'
      });
    }
    
    // Проверка UNI бонуса
    if (!uniBonus || uniBonus.length === 0) {
      issues.push({
        severity: 'СРЕДНЕ',
        issue: 'UNI бонус не начислен',
        impact: 'Пользователь не получил обещанный бонус',
        solution: 'Проверить работу BoostService.awardUniBonus()'
      });
    }

    if (issues.length === 0) {
      console.log('✅ СЕРЬЕЗНЫХ ПРОБЛЕМ НЕ ОБНАРУЖЕНО');
      console.log('   Возможна проблема с frontend отображением или кэшированием');
    } else {
      console.log(`❌ ОБНАРУЖЕНО ПРОБЛЕМ: ${issues.length}`);
      
      issues.forEach((issue, index) => {
        console.log(`\\n  Проблема ${index + 1} [${issue.severity}]:`);
        console.log(`  🔸 ${issue.issue}`);
        console.log(`  📊 Влияние: ${issue.impact}`);
        console.log(`  🔧 Решение: ${issue.solution}`);
      });
    }

    // 7. РЕКОМЕНДАЦИИ
    console.log('\\n7️⃣ РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ:');
    console.log('-'.repeat(50));
    
    console.log('1. НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ:');
    if (!user.ton_boost_package) {
      console.log('   - Вручную установить ton_boost_package в таблице users');
    }
    if (!tonFarmingData || tonFarmingData.length === 0) {
      console.log('   - Создать запись в ton_farming_data для активации планировщика');
    }
    
    console.log('\\n2. ДОЛГОСРОЧНЫЕ ИСПРАВЛЕНИЯ:');
    console.log('   - Добавить больше логирования в BoostService.purchaseWithInternalWallet()');
    console.log('   - Добавить проверки успешности всех критических операций');
    console.log('   - Реализовать rollback механизм при частичных неудачах');
    console.log('   - Добавить мониторинг для отслеживания подобных проблем');

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ПРИ РАССЛЕДОВАНИИ:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Запуск расследования
investigateUser25BoostIssue()
  .then(() => {
    console.log('\\n✅ РАССЛЕДОВАНИЕ ЗАВЕРШЕНО');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ ОШИБКА ВЫПОЛНЕНИЯ СКРИПТА:', error);
    process.exit(1);
  });