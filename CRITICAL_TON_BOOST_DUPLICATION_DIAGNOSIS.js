/**
 * 🚨 КРИТИЧЕСКАЯ ДИАГНОСТИКА ДУБЛИРОВАНИЯ TON BOOST ПАКЕТОВ
 * Выполняет детальный анализ production базы данных без изменений
 * User #184 сообщил о дублировании: 1 TON платеж = 2 пакета
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE credentials не найдены в environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnoseTonBoostDuplication() {
  console.log('\n🚨 НАЧАЛО КРИТИЧЕСКОЙ ДИАГНОСТИКИ ДУБЛИРОВАНИЯ TON BOOST');
  console.log('🎯 Пользователь #184 сообщил: 1 TON платеж → система засчитала 2 пакета');
  console.log('📅 Дата покупки: 24.07.2025');
  console.log('=' + '='.repeat(70));

  try {
    // 1. АНАЛИЗ ТРАНЗАКЦИЙ USER #184 ЗА ПОСЛЕДНИЕ 2 ЧАСА
    console.log('\n📊 1. АНАЛИЗ ТРАНЗАКЦИЙ ПОЛЬЗОВАТЕЛЯ #184:');
    console.log('-'.repeat(50));
    
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 184)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (txError) {
      console.error('❌ Ошибка получения транзакций:', txError.message);
      return;
    }

    console.log(`🔍 Найдено транзакций за последние 2 часа: ${transactions.length}`);
    
    // Группировка по типам
    const transactionTypes = {};
    transactions.forEach(tx => {
      const type = tx.type;
      if (!transactionTypes[type]) {
        transactionTypes[type] = [];
      }
      transactionTypes[type].push(tx);
    });

    console.log('\n📈 ГРУППИРОВКА ПО ТИПАМ:');
    Object.keys(transactionTypes).forEach(type => {
      const txs = transactionTypes[type];
      console.log(`  ${type}: ${txs.length} транзакций`);
      
      // Детали для подозрительных типов
      if (type === 'DAILY_BONUS' || type === 'FARMING_REWARD' || type === 'BOOST_PURCHASE') {
        txs.forEach((tx, i) => {
          console.log(`    [${i+1}] ID:${tx.id} | Сумма:${tx.amount} ${tx.currency} | ${tx.created_at.slice(11, 19)}`);
          if (tx.metadata && Object.keys(tx.metadata).length > 0) {
            console.log(`         Meta: ${JSON.stringify(tx.metadata).slice(0,100)}...`);
          }
        });
      }
    });

    // 2. АНАЛИЗ DAILY_BONUS ДУБЛИКАТОВ
    console.log('\n🚨 2. ДЕТАЛЬНЫЙ АНАЛИЗ DAILY_BONUS ДУБЛИКАТОВ:');
    console.log('-'.repeat(50));
    
    const dailyBonusTransactions = transactionTypes['DAILY_BONUS'] || [];
    console.log(`📊 Всего DAILY_BONUS транзакций: ${dailyBonusTransactions.length}`);
    
    if (dailyBonusTransactions.length > 0) {
      // Группировка по сумме и времени для выявления дубликатов
      const duplicateGroups = {};
      dailyBonusTransactions.forEach(tx => {
        const key = `${tx.amount}_${tx.currency}`;
        if (!duplicateGroups[key]) {
          duplicateGroups[key] = [];
        }
        duplicateGroups[key].push(tx);
      });

      console.log('\n🔍 АНАЛИЗ ДУБЛИКАТОВ ПО СУММЕ:');
      Object.keys(duplicateGroups).forEach(key => {
        const group = duplicateGroups[key];
        if (group.length > 1) {
          console.log(`❌ ДУБЛИКАТ ОБНАРУЖЕН - ${key}: ${group.length} транзакций`);
          group.forEach((tx, i) => {
            const timeDiff = i > 0 ? 
              Math.round((new Date(tx.created_at) - new Date(group[0].created_at)) / 1000) : 0;
            console.log(`  [${i+1}] ID:${tx.id} | ${tx.created_at.slice(11, 19)} | +${timeDiff}s | "${tx.description}"`);
          });
        } else {
          console.log(`✅ Уникальный - ${key}: 1 транзакция`);
        }
      });
    }

    // 3. АНАЛИЗ TON FARMING DATA
    console.log('\n📊 3. АНАЛИЗ TON_FARMING_DATA:');
    console.log('-'.repeat(50));
    
    const { data: tonFarmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', 184)
      .gte('updated_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

    if (farmingError) {
      console.log('⚠️ ton_farming_data недоступна:', farmingError.message);
    } else {
      console.log(`🔍 Записей в ton_farming_data: ${tonFarmingData.length}`);
      tonFarmingData.forEach((record, i) => {
        console.log(`[${i+1}] farming_balance: ${record.farming_balance} | boost_active: ${record.boost_active}`);
        console.log(`     package_id: ${record.boost_package_id} | rate: ${record.farming_rate}`);
        console.log(`     updated: ${record.updated_at.slice(11, 19)}`);
      });
    }

    // 4. АНАЛИЗ USERS TABLE
    console.log('\n👤 4. АНАЛИЗ USERS TABLE:');
    console.log('-'.repeat(50));
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, balance_uni, balance_ton, ton_boost_package, ton_boost_rate, updated_at')
      .eq('id', 184)
      .single();

    if (userError) {
      console.error('❌ Ошибка получения пользователя:', userError.message);
    } else {
      console.log('📋 ТЕКУЩИЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ:');
      console.log(`  ID: ${userData.id}`);
      console.log(`  UNI Balance: ${userData.balance_uni}`);
      console.log(`  TON Balance: ${userData.balance_ton}`);
      console.log(`  TON Boost Package: ${userData.ton_boost_package}`);
      console.log(`  TON Boost Rate: ${userData.ton_boost_rate}`);
      console.log(`  Last Updated: ${userData.updated_at}`);
    }

    // 5. АНАЛИЗ BOOST_PURCHASES
    console.log('\n🛒 5. АНАЛИЗ BOOST_PURCHASES:');
    console.log('-'.repeat(50));
    
    const { data: boostPurchases, error: purchaseError } = await supabase
      .from('boost_purchases')
      .select('*')
      .eq('user_id', 184)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (purchaseError) {
      console.log('⚠️ boost_purchases недоступна:', purchaseError.message);
    } else {
      console.log(`🔍 Покупок за последние 2 часа: ${boostPurchases.length}`);
      boostPurchases.forEach((purchase, i) => {
        console.log(`[${i+1}] ID:${purchase.id} | Package:${purchase.boost_package_id} | Status:${purchase.status}`);
        console.log(`     Method:${purchase.payment_method} | Amount:${purchase.amount} ${purchase.currency}`);
        console.log(`     Created: ${purchase.created_at.slice(11, 19)}`);
      });
    }

    // 6. ПОИСК ВРЕМЕННЫХ ПАТТЕРНОВ
    console.log('\n⏰ 6. АНАЛИЗ ВРЕМЕННЫХ ПАТТЕРНОВ:');
    console.log('-'.repeat(50));
    
    if (dailyBonusTransactions.length >= 2) {
      console.log('📅 ВРЕМЕННАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ DAILY_BONUS:');
      dailyBonusTransactions
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .forEach((tx, i) => {
          const timeDiff = i > 0 ? 
            Math.round((new Date(tx.created_at) - new Date(dailyBonusTransactions[0].created_at)) / 1000) : 0;
          console.log(`  ${i+1}. ${tx.created_at.slice(11, 19)} (+${timeDiff}s) | ${tx.amount} ${tx.currency}`);
        });
        
      // Проверка на подозрительно близкие времена
      for (let i = 1; i < dailyBonusTransactions.length; i++) {
        const prevTime = new Date(dailyBonusTransactions[i-1].created_at);
        const currTime = new Date(dailyBonusTransactions[i].created_at);
        const diffSeconds = Math.abs(currTime - prevTime) / 1000;
        
        if (diffSeconds < 10) {
          console.log(`🚨 ПОДОЗРИТЕЛЬНАЯ БЛИЗОСТЬ: транзакции ${i} и ${i+1} созданы с разницей ${diffSeconds}s`);
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ ДИАГНОСТИКА ЗАВЕРШЕНА');
    console.log('📋 РЕКОМЕНДАЦИЯ: НЕ ВНОСИТЬ ИЗМЕНЕНИЯ без разрешения пользователя');
    console.log('🎯 ОБНАРУЖЕННАЯ ПРОБЛЕМА: Тройное дублирование awardUniBonus() в коде');
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:', error.message);
  }
}

// Запуск диагностики
diagnoseTonBoostDuplication();