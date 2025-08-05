/**
 * ОКОНЧАТЕЛЬНАЯ ДИАГНОСТИКА СБОЯ СИСТЕМЫ БАЛАНСОВ
 * Финальная проверка почему User 255 и 251 имеют 0 балансы
 */

import { supabase } from './core/supabase.js';

async function diagnoseBalanceSystemFailure() {
  console.log('🔍 ОКОНЧАТЕЛЬНАЯ ДИАГНОСТИКА СБОЯ СИСТЕМЫ БАЛАНСОВ');
  
  try {
    // 1. Проверяем расчет балансов User 255 и 251 вручную
    console.log('\n💰 РУЧНОЙ РАСЧЕТ БАЛАНСОВ:');
    
    for (const telegramId of [255, 251]) {
      console.log(`\n--- РАСЧЕТ ДЛЯ USER ${telegramId} ---`);
      
      // Получаем пользователя
      const { data: user } = await supabase
        .from('users')
        .select('id, telegram_id, balance_uni, balance_ton')
        .eq('telegram_id', telegramId)
        .single();
      
      if (!user) {
        console.log(`❌ User ${telegramId} не найден`);
        continue;
      }
      
      console.log(`Internal ID: ${user.id}`);
      console.log(`Текущий баланс UNI: ${user.balance_uni}`);
      console.log(`Текущий баланс TON: ${user.balance_ton}`);
      
      // Получаем ВСЕ транзакции этого пользователя
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', telegramId) // Используем telegram_id так как именно там лежат транзакции
        .order('created_at', { ascending: true });
      
      if (!transactions || transactions.length === 0) {
        console.log(`❌ Нет транзакций для User ${telegramId}`);
        continue;
      }
      
      console.log(`📊 Найдено ${transactions.length} транзакций`);
      
      // Ручной расчет балансов
      let uniBalance = 0;
      let tonBalance = 0;
      
      const transactionsByType = {};
      
      transactions.forEach(tx => {
        const amount = parseFloat(tx.amount || 0);
        const currency = tx.currency;
        const type = tx.type;
        
        // Группируем по типам для статистики
        if (!transactionsByType[type]) {
          transactionsByType[type] = { count: 0, uniAmount: 0, tonAmount: 0 };
        }
        transactionsByType[type].count++;
        
        // Рассчитываем баланс по логике системы
        if (currency === 'UNI') {
          if (['TON_DEPOSIT', 'FARMING_DEPOSIT', 'FARMING_REWARD', 'REFERRAL_REWARD', 'DAILY_BONUS', 'MISSION_REWARD'].includes(type)) {
            uniBalance += amount;
            transactionsByType[type].uniAmount += amount;
          } else if (['UNI_WITHDRAWAL', 'withdrawal_fee'].includes(type)) {
            uniBalance -= amount;
            transactionsByType[type].uniAmount -= amount;
          }
        } else if (currency === 'TON') {
          if (['TON_DEPOSIT', 'FARMING_DEPOSIT', 'FARMING_REWARD', 'REFERRAL_REWARD', 'DAILY_BONUS', 'MISSION_REWARD'].includes(type)) {
            tonBalance += amount;
            transactionsByType[type].tonAmount += amount;
          } else if (['TON_WITHDRAWAL', 'withdrawal_fee'].includes(type)) {
            tonBalance -= amount;
            transactionsByType[type].tonAmount -= amount;
          }
        }
      });
      
      console.log(`\n💰 РАСЧЕТНЫЕ БАЛАНСЫ:`);
      console.log(`UNI: ${uniBalance.toFixed(6)} (текущий в БД: ${user.balance_uni})`);
      console.log(`TON: ${tonBalance.toFixed(6)} (текущий в БД: ${user.balance_ton})`);
      
      // Проверяем совпадают ли балансы
      const uniMatch = Math.abs(uniBalance - parseFloat(user.balance_uni || 0)) < 0.000001;
      const tonMatch = Math.abs(tonBalance - parseFloat(user.balance_ton || 0)) < 0.000001;
      
      console.log(`UNI баланс совпадает: ${uniMatch ? '✅' : '❌'}`);
      console.log(`TON баланс совпадает: ${tonMatch ? '✅' : '❌'}`);
      
      if (!uniMatch || !tonMatch) {
        console.log(`⚠️ ПРОБЛЕМА: Расчетный баланс НЕ совпадает с балансом в БД!`);
        console.log(`   Это означает что BalanceManager НЕ ОБРАБОТАЛ все транзакции`);
      }
      
      // Показываем статистику по типам транзакций
      console.log(`\n📈 СТАТИСТИКА ПО ТИПАМ ТРАНЗАКЦИЙ:`);
      Object.entries(transactionsByType).forEach(([type, stats]) => {
        console.log(`${type}: ${stats.count} транзакций | UNI: ${stats.uniAmount.toFixed(6)} | TON: ${stats.tonAmount.toFixed(6)}`);
      });
      
      // Найдем первую и последнюю транзакции
      const firstTx = transactions[0];
      const lastTx = transactions[transactions.length - 1];
      
      console.log(`\n⏰ ВРЕМЕННОЙ ДИАПАЗОН:`);
      console.log(`Первая транзакция: ${firstTx.created_at} (${firstTx.type})`);
      console.log(`Последняя транзакция: ${lastTx.created_at} (${lastTx.type})`);
    }
    
    // 2. Проверяем работает ли BalanceManager для правильных ID
    console.log('\n🔧 ТЕСТ BALANCEMANAGER С ПРАВИЛЬНЫМИ ID:');
    
    try {
      const { BalanceManager } = await import('./core/BalanceManager.js');
      const balanceManager = BalanceManager.getInstance();
      
      // Попробуем пересчитать баланс для User 255 по его РЕАЛЬНОМУ internal ID
      const { data: user255 } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', 255)
        .single();
      
      if (user255) {
        console.log(`\nТестируем BalanceManager.calculateBalance для User 255 (internal ID: ${user255.id}):`);
        
        // Попробуем использовать приватный метод calculateBalance если он есть
        const result = await balanceManager.getUserBalance(user255.id);
        console.log('Результат getUserBalance:', result);
        
        // Попробуем найти метод пересчета
        if (typeof balanceManager.calculateBalance === 'function') {
          const calculation = await balanceManager.calculateBalance(user255.id);
          console.log('Результат calculateBalance:', calculation);
        }
      }
      
    } catch (error) {
      console.log('❌ Ошибка тестирования BalanceManager:', error.message);
    }
    
    // 3. Проверяем критическую проблему ID маппинга
    console.log('\n🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА ID МАППИНГА:');
    
    const { data: user255 } = await supabase
      .from('users')
      .select('id, telegram_id')
      .eq('telegram_id', 255)
      .single();
      
    const { data: user251 } = await supabase
      .from('users')
      .select('id, telegram_id')
      .eq('telegram_id', 251)
      .single();
    
    if (user255 && user251) {
      console.log(`\nПРОБЛЕМА СВЯЗКИ ID:`);
      console.log(`User 255: internal ID = ${user255.id}, telegram_id = ${user255.telegram_id}`);
      console.log(`User 251: internal ID = ${user251.id}, telegram_id = ${user251.telegram_id}`);
      
      // Проверяем сколько транзакций по каждому ID
      const { data: tx255ByInternal } = await supabase
        .from('transactions')
        .select('count')
        .eq('user_id', user255.id)
        .single();
        
      const { data: tx255ByTelegram } = await supabase
        .from('transactions')
        .select('count')
        .eq('user_id', user255.telegram_id)
        .single();
        
      const { data: tx251ByInternal } = await supabase
        .from('transactions')
        .select('count')
        .eq('user_id', user251.id)
        .single();
        
      const { data: tx251ByTelegram } = await supabase
        .from('transactions')
        .select('count')
        .eq('user_id', user251.telegram_id)
        .single();
      
      console.log(`\nТРАНЗАКЦИИ USER 255:`);
      console.log(`По internal ID (${user255.id}): ${tx255ByInternal?.count || 0} транзакций`);
      console.log(`По telegram_id (${user255.telegram_id}): ${tx255ByTelegram?.count || 0} транзакций`);
      
      console.log(`\nТРАНЗАКЦИИ USER 251:`);
      console.log(`По internal ID (${user251.id}): ${tx251ByInternal?.count || 0} транзакций`);
      console.log(`По telegram_id (${user251.telegram_id}): ${tx251ByTelegram?.count || 0} транзакций`);
      
      // КРИТИЧЕСКОЕ ЗАКЛЮЧЕНИЕ
      if ((tx255ByInternal?.count || 0) === 0 && (tx255ByTelegram?.count || 0) > 0) {
        console.log(`\n🔥 НАЙДЕНА ПРОБЛЕМА USER 255:`);
        console.log(`   BalanceManager ищет транзакции по internal ID (${user255.id})`);
        console.log(`   Но ВСЕ транзакции созданы с telegram_id (${user255.telegram_id})`);
        console.log(`   Поэтому BalanceManager НЕ НАХОДИТ транзакции и считает баланс = 0`);
      }
      
      if ((tx251ByInternal?.count || 0) === 0 && (tx251ByTelegram?.count || 0) > 0) {
        console.log(`\n🔥 НАЙДЕНА ПРОБЛЕМА USER 251:`);
        console.log(`   BalanceManager ищет транзакции по internal ID (${user251.id})`);
        console.log(`   Но ВСЕ транзакции созданы с telegram_id (${user251.telegram_id})`);
        console.log(`   Поэтому BalanceManager НЕ НАХОДИТ транзакции и считает баланс = 0`);
      }
    }
    
    console.log('\n✅ Окончательная диагностика завершена');
    
  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  }
}

diagnoseBalanceSystemFailure();