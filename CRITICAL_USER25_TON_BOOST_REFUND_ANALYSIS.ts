/**
 * 🔍 КРИТИЧЕСКАЯ ДИАГНОСТИКА: Возврат TON после покупки Boost-пакета (User ID 25)
 * 
 * Цель: Выявить причину возврата списанных TON средств обратно на баланс
 * после успешной активации TON Boost пакета
 */

import { supabase } from './core/supabaseClient';
import { logger } from './core/logger';

interface TransactionAnalysis {
  id: number;
  type: string;
  amount: string;
  currency: string;
  status: string;
  description: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface UserBalanceHistory {
  user_id: number;
  balance_uni: string;
  balance_ton: string;
  ton_boost_package: string;
  ton_boost_package_id: number;
  ton_boost_rate: string;
  updated_at: string;
}

interface TonFarmingData {
  id: number;
  user_id: number;
  boost_package_id: number;
  deposit_amount: string;
  rate_ton_per_second: string;
  bonus_uni: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

async function analyzeUser25TonBoostRefund() {
  logger.info('🔍 [CRITICAL ANALYSIS] Начало диагностики возврата TON для User ID 25');
  
  const supabaseClient = supabase;
  const USER_ID = 25;
  const HOURS_BACK = 48; // Анализируем последние 48 часов
  
  try {
    // 1. Анализ всех транзакций пользователя ID 25
    logger.info('📊 Шаг 1: Анализ всех транзакций за последние 48 часов');
    const { data: transactions, error: transError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('user_id', USER_ID)
      .gte('created_at', new Date(Date.now() - HOURS_BACK * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (transError) {
      logger.error('❌ Ошибка получения транзакций:', transError);
      return;
    }

    console.log('\n📋 === АНАЛИЗ ТРАНЗАКЦИЙ USER ID 25 ===');
    console.log(`Найдено транзакций: ${transactions?.length || 0}`);
    
    if (transactions && transactions.length > 0) {
      transactions.forEach((tx: TransactionAnalysis, index) => {
        console.log(`\n${index + 1}. ID: ${tx.id}`);
        console.log(`   Тип: ${tx.type}`);
        console.log(`   Сумма: ${tx.amount} ${tx.currency}`);
        console.log(`   Статус: ${tx.status}`);
        console.log(`   Описание: ${tx.description}`);
        console.log(`   Метаданные: ${JSON.stringify(tx.metadata, null, 2)}`);
        console.log(`   Создано: ${tx.created_at}`);
        console.log(`   Обновлено: ${tx.updated_at}`);
      });
    }

    // 2. Анализ текущего состояния пользователя
    logger.info('📊 Шаг 2: Анализ текущего состояния пользователя');
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('id, balance_uni, balance_ton, ton_boost_package, ton_boost_package_id, ton_boost_rate, created_at, updated_at')
      .eq('id', USER_ID)
      .single();

    if (userError) {
      logger.error('❌ Ошибка получения данных пользователя:', userError);
    } else {
      console.log('\n👤 === ТЕКУЩЕЕ СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ ===');
      console.log(`User ID: ${userData.id}`);
      console.log(`Баланс UNI: ${userData.balance_uni}`);
      console.log(`Баланс TON: ${userData.balance_ton}`);
      console.log(`TON Boost Package: ${userData.ton_boost_package}`);
      console.log(`TON Boost Package ID: ${userData.ton_boost_package_id}`);
      console.log(`TON Boost Rate: ${userData.ton_boost_rate}`);
      console.log(`Последнее обновление: ${userData.updated_at}`);
    }

    // 3. Анализ записей в ton_farming_data
    logger.info('📊 Шаг 3: Анализ TON Farming данных');
    const { data: farmingData, error: farmingError } = await supabaseClient
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', USER_ID)
      .order('created_at', { ascending: false });

    if (farmingError) {
      logger.error('❌ Ошибка получения farming данных:', farmingError);
    } else {
      console.log('\n🌾 === TON FARMING DATA ===');
      console.log(`Найдено записей: ${farmingData?.length || 0}`);
      
      if (farmingData && farmingData.length > 0) {
        farmingData.forEach((farm: TonFarmingData, index) => {
          console.log(`\n${index + 1}. ID: ${farm.id}`);
          console.log(`   Boost Package ID: ${farm.boost_package_id}`);
          console.log(`   Deposit Amount: ${farm.deposit_amount}`);
          console.log(`   Rate TON/sec: ${farm.rate_ton_per_second}`);
          console.log(`   Bonus UNI: ${farm.bonus_uni}`);
          console.log(`   Активен: ${farm.is_active}`);
          console.log(`   Создано: ${farm.created_at}`);
          console.log(`   Обновлено: ${farm.updated_at}`);
        });
      }
    }

    // 4. Поиск возможных boost_purchases записей
    logger.info('📊 Шаг 4: Проверка таблицы boost_purchases');
    try {
      const { data: boostPurchases, error: boostError } = await supabaseClient
        .from('boost_purchases')
        .select('*')
        .eq('user_id', USER_ID)
        .order('created_at', { ascending: false });

      if (boostError) {
        console.log('\n❌ Таблица boost_purchases недоступна или не существует');
      } else {
        console.log('\n💳 === BOOST PURCHASES ===');
        console.log(`Найдено записей: ${boostPurchases?.length || 0}`);
        
        if (boostPurchases && boostPurchases.length > 0) {
          boostPurchases.forEach((purchase: any, index) => {
            console.log(`\n${index + 1}. ${JSON.stringify(purchase, null, 2)}`);
          });
        }
      }
    } catch (error) {
      console.log('\n❌ Ошибка доступа к boost_purchases:', error);
    }

    // 5. Анализ специфических TON транзакций с метаданными
    logger.info('📊 Шаг 5: Детальный анализ TON транзакций');
    const tonTransactions = transactions?.filter(tx => tx.currency === 'TON') || [];
    
    console.log('\n💎 === ДЕТАЛЬНЫЙ АНАЛИЗ TON ТРАНЗАКЦИЙ ===');
    console.log(`TON транзакций найдено: ${tonTransactions.length}`);
    
    tonTransactions.forEach((tx, index) => {
      console.log(`\n--- TON Транзакция ${index + 1} ---`);
      console.log(`ID: ${tx.id}`);
      console.log(`Тип: ${tx.type}`);
      console.log(`Сумма: ${tx.amount} TON`);
      console.log(`Статус: ${tx.status}`);
      console.log(`Описание: ${tx.description}`);
      
      // Детальный анализ метаданных
      if (tx.metadata) {
        console.log('🔍 Метаданные:');
        try {
          const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
          Object.keys(metadata).forEach(key => {
            console.log(`   ${key}: ${JSON.stringify(metadata[key])}`);
          });
        } catch (e) {
          console.log(`   Ошибка парсинга: ${tx.metadata}`);
        }
      }
      
      console.log(`Время создания: ${tx.created_at}`);
      console.log(`Время обновления: ${tx.updated_at}`);
    });

    // 6. Поиск паттернов возврата средств
    logger.info('📊 Шаг 6: Поиск паттернов возврата средств');
    console.log('\n🔄 === АНАЛИЗ ПАТТЕРНОВ ВОЗВРАТА ===');
    
    // Группируем транзакции по времени для поиска связанных операций
    const timeGroups = new Map();
    
    tonTransactions.forEach(tx => {
      const timestamp = new Date(tx.created_at).getTime();
      const timeWindow = Math.floor(timestamp / (5 * 60 * 1000)) * (5 * 60 * 1000); // 5-минутные окна
      
      if (!timeGroups.has(timeWindow)) {
        timeGroups.set(timeWindow, []);
      }
      timeGroups.get(timeWindow).push(tx);
    });
    
    timeGroups.forEach((txGroup, timeWindow) => {
      if (txGroup.length > 1) {
        console.log(`\n⏰ Группа транзакций в окне ${new Date(timeWindow).toISOString()}:`);
        txGroup.forEach((tx: TransactionAnalysis) => {
          console.log(`   ${tx.type}: ${tx.amount} TON (${tx.status}) - ${tx.description}`);
        });
      }
    });

    // 7. Финальные выводы
    console.log('\n📋 === ИТОГОВАЯ ДИАГНОСТИКА ===');
    
    const withdrawals = tonTransactions.filter(tx => 
      tx.type.includes('WITHDRAWAL') || 
      tx.amount.startsWith('-') ||
      tx.description.toLowerCase().includes('withdrawal') ||
      tx.description.toLowerCase().includes('списание')
    );
    
    const deposits = tonTransactions.filter(tx => 
      tx.type.includes('DEPOSIT') || 
      (!tx.amount.startsWith('-') && parseFloat(tx.amount) > 0) ||
      tx.description.toLowerCase().includes('deposit') ||
      tx.description.toLowerCase().includes('пополнение')
    );
    
    const boostRelated = tonTransactions.filter(tx => 
      tx.description.toLowerCase().includes('boost') ||
      (tx.metadata && JSON.stringify(tx.metadata).toLowerCase().includes('boost'))
    );
    
    console.log(`💸 Операций списания: ${withdrawals.length}`);
    console.log(`💰 Операций пополнения: ${deposits.length}`);
    console.log(`🚀 Boost-связанных операций: ${boostRelated.length}`);
    
    if (withdrawals.length > 0 && deposits.length > 0) {
      console.log('\n⚠️ ОБНАРУЖЕН ПАТТЕРН: Есть и списания, и пополнения TON');
      console.log('   Возможна логика автоматического возврата средств');
    }
    
    logger.info('✅ [CRITICAL ANALYSIS] Диагностика завершена');
    
  } catch (error) {
    logger.error('❌ [CRITICAL ANALYSIS] Критическая ошибка:', error);
    console.error('Критическая ошибка анализа:', error);
  }
}

// Запуск анализа
analyzeUser25TonBoostRefund().catch(console.error);

export { analyzeUser25TonBoostRefund };