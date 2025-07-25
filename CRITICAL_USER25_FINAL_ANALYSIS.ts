/**
 * 🔍 ФИНАЛЬНАЯ ДИАГНОСТИКА: Проблема возврата TON (User ID 25)
 * Исправленная версия с обработкой типов данных
 */

import { supabase } from './core/supabaseClient';
import { logger } from './core/logger';

async function finalAnalysisUser25() {
  logger.info('🔍 [FINAL ANALYSIS] Начало финальной диагностики User ID 25');
  
  const supabaseClient = supabase;
  const USER_ID = 25;
  
  try {
    // Получаем все TON транзакции пользователя за последние 48 часов
    const { data: transactions, error: transError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('user_id', USER_ID)
      .eq('currency', 'TON')
      .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (transError || !transactions) {
      logger.error('❌ Ошибка получения транзакций:', transError);
      return;
    }

    console.log('\n🎯 === КЛЮЧЕВЫЕ НАХОДКИ ===');
    console.log(`Найдено TON транзакций: ${transactions.length}`);

    // Анализ паттернов
    const boostPurchases = transactions.filter(tx => tx.type === 'BOOST_PURCHASE');
    const farmingRewards = transactions.filter(tx => tx.type === 'FARMING_REWARD');
    const deposits = transactions.filter(tx => tx.type === 'DEPOSIT');

    console.log(`\n📊 СТАТИСТИКА:`);
    console.log(`💳 BOOST_PURCHASE транзакций: ${boostPurchases.length}`);
    console.log(`🌾 FARMING_REWARD транзакций: ${farmingRewards.length}`);
    console.log(`💰 DEPOSIT транзакций: ${deposits.length}`);

    // Анализ паттерна проблемы
    console.log('\n🔍 ДЕТАЛЬНЫЙ АНАЛИЗ BOOST ПОКУПОК:');
    
    boostPurchases.forEach((purchase, index) => {
      console.log(`\n--- Покупка ${index + 1} ---`);
      console.log(`ID: ${purchase.id}`);
      console.log(`Время: ${purchase.created_at}`);
      console.log(`Сумма: ${purchase.amount} TON`);
      console.log(`Описание: ${purchase.description}`);
      
      // Ищем связанные FARMING_REWARD транзакции в окне +/- 5 минут
      const purchaseTime = new Date(purchase.created_at).getTime();
      const relatedRewards = farmingRewards.filter(reward => {
        const rewardTime = new Date(reward.created_at).getTime();
        return Math.abs(rewardTime - purchaseTime) <= 5 * 60 * 1000; // 5 минут
      });
      
      console.log(`Связанных FARMING_REWARD: ${relatedRewards.length}`);
      relatedRewards.forEach(reward => {
        console.log(`  -> ${reward.amount} TON: ${reward.description}`);
        console.log(`     Metadata: ${JSON.stringify(reward.metadata)}`);
      });
    });

    // Проверяем текущий баланс пользователя
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('balance_ton, ton_boost_package, ton_boost_package_id')
      .eq('id', USER_ID)
      .single();

    if (!userError && userData) {
      console.log(`\n👤 ТЕКУЩИЙ БАЛАНС: ${userData.balance_ton} TON`);
      console.log(`🚀 АКТИВНЫЙ BOOST: ${userData.ton_boost_package} (ID: ${userData.ton_boost_package_id})`);
    }

    // Проверяем записи в ton_farming_data
    const { data: farmingData, error: farmingError } = await supabaseClient
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', USER_ID)
      .order('created_at', { ascending: false });

    if (!farmingError && farmingData) {
      console.log(`\n🌾 TON FARMING ЗАПИСЕЙ: ${farmingData.length}`);
      farmingData.forEach((farm, index) => {
        console.log(`${index + 1}. Package ID: ${farm.boost_package_id}, Депозит: ${farm.deposit_amount} TON, Активен: ${farm.is_active}`);
      });
    }

    // КРИТИЧЕСКИЙ АНАЛИЗ ПАТТЕРНА
    console.log('\n🚨 === КРИТИЧЕСКИЙ АНАЛИЗ ПАТТЕРНА ===');
    
    // Группируем транзакции по времени (5-минутные окна)
    const timeGroups = new Map();
    transactions.forEach(tx => {
      const timestamp = new Date(tx.created_at).getTime();
      const timeWindow = Math.floor(timestamp / (5 * 60 * 1000)) * (5 * 60 * 1000);
      
      if (!timeGroups.has(timeWindow)) {
        timeGroups.set(timeWindow, []);
      }
      timeGroups.get(timeWindow).push(tx);
    });

    let suspiciousPatterns = 0;
    timeGroups.forEach((txGroup, timeWindow) => {
      if (txGroup.length >= 2) {
        const hasBoostPurchase = txGroup.some(tx => tx.type === 'BOOST_PURCHASE');
        const hasFarmingReward = txGroup.some(tx => tx.type === 'FARMING_REWARD');
        const hasDeposit = txGroup.some(tx => tx.type === 'DEPOSIT');
        
        if (hasBoostPurchase && (hasFarmingReward || hasDeposit)) {
          suspiciousPatterns++;
          console.log(`\n⚠️ ПОДОЗРИТЕЛЬНЫЙ ПАТТЕРН #${suspiciousPatterns} в ${new Date(timeWindow).toISOString()}:`);
          
          txGroup.forEach(tx => {
            const amount = parseFloat(tx.amount) || 0;
            const sign = amount >= 0 ? '+' : '';
            console.log(`   ${tx.type}: ${sign}${tx.amount} TON - ${tx.description}`);
            
            if (tx.metadata) {
              const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
              if (metadata.original_type) {
                console.log(`     Original Type: ${metadata.original_type}`);
              }
              if (metadata.transaction_source) {
                console.log(`     Source: ${metadata.transaction_source}`);
              }
            }
          });
        }
      }
    });

    // КЛЮЧЕВЫЕ ВЫВОДЫ
    console.log('\n🎯 === КЛЮЧЕВЫЕ ВЫВОДЫ ===');
    console.log(`🔴 Найдено подозрительных паттернов: ${suspiciousPatterns}`);
    
    if (suspiciousPatterns > 0) {
      console.log('⚠️ ПРОБЛЕМА ОБНАРУЖЕНА:');
      console.log('   • После BOOST_PURCHASE появляются FARMING_REWARD операции');
      console.log('   • Это может быть причиной "возврата" TON');
      console.log('   • Система может создавать компенсирующие транзакции');
    }

    // Поиск дублирующихся депозитов в ton_farming_data
    if (farmingData) {
      const packageCounts = new Map();
      farmingData.forEach(farm => {
        const key = farm.boost_package_id;
        packageCounts.set(key, (packageCounts.get(key) || 0) + 1);
      });
      
      console.log('\n🔍 ДУБЛИКАТЫ В TON_FARMING_DATA:');
      packageCounts.forEach((count, packageId) => {
        if (count > 1) {
          console.log(`   Package ${packageId}: ${count} записей (ДУБЛИКАТ!)`);
        }
      });
    }

    logger.info('✅ [FINAL ANALYSIS] Финальная диагностика завершена');
    
  } catch (error) {
    logger.error('❌ [FINAL ANALYSIS] Ошибка:', error);
    console.error('Ошибка анализа:', error);
  }
}

// Запуск анализа
finalAnalysisUser25().catch(console.error);