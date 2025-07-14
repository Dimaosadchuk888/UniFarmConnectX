import { supabase } from '../core/supabase.js';
import { logger } from '../core/logger.js';

/**
 * Скрипт для исправления проблемы накопления депозитов TON Boost
 * Восстанавливает правильные значения farming_balance для всех пользователей
 */

async function fixTonBoostAccumulation() {
  logger.info('🔧 Начинаем исправление накопления TON Boost депозитов');
  
  try {
    // 1. Получаем всех пользователей с активным TON Boost
    const { data: users, error: usersError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('boost_active', true);
      
    if (usersError) {
      logger.error('Ошибка получения пользователей:', usersError);
      return;
    }
    
    logger.info(`Найдено ${users?.length || 0} пользователей с активным TON Boost`);
    
    // 2. Для каждого пользователя восстанавливаем правильный баланс
    for (const user of users || []) {
      // Получаем все транзакции покупки TON Boost
      const { data: purchases, error: purchasesError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.user_id)
        .ilike('description', '%покупка%TON Boost%')
        .order('created_at', { ascending: true });
        
      if (purchasesError) {
        logger.error(`Ошибка получения транзакций для user ${user.user_id}:`, purchasesError);
        continue;
      }
      
      // Вычисляем общую сумму депозитов
      let totalDeposit = 0;
      purchases?.forEach(p => {
        const amount = Math.abs(parseFloat(p.amount_ton || p.amount || '0'));
        totalDeposit += amount;
      });
      
      // Определяем правильную ставку из последней покупки
      let correctRate = user.farming_rate;
      if (purchases && purchases.length > 0) {
        const lastPurchase = purchases[purchases.length - 1];
        const metadata = lastPurchase.metadata as any;
        if (metadata?.daily_rate) {
          correctRate = metadata.daily_rate.toString();
        }
      }
      
      logger.info(`User ${user.user_id}:`, {
        currentBalance: user.farming_balance,
        correctBalance: totalDeposit,
        currentRate: user.farming_rate,
        correctRate: correctRate,
        purchaseCount: purchases?.length || 0
      });
      
      // Обновляем баланс и ставку если они отличаются
      if (parseFloat(user.farming_balance) !== totalDeposit || user.farming_rate !== correctRate) {
        const { error: updateError } = await supabase
          .from('ton_farming_data')
          .update({
            farming_balance: totalDeposit.toString(),
            farming_rate: correctRate,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.user_id);
          
        if (updateError) {
          logger.error(`Ошибка обновления user ${user.user_id}:`, updateError);
        } else {
          logger.info(`✅ User ${user.user_id} обновлен: баланс ${user.farming_balance} → ${totalDeposit}, ставка ${user.farming_rate} → ${correctRate}`);
        }
      }
    }
    
    logger.info('✅ Исправление накопления завершено');
    
  } catch (error) {
    logger.error('Критическая ошибка:', error);
  }
}

// Запускаем исправление
fixTonBoostAccumulation();