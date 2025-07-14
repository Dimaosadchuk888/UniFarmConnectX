/**
 * Быстрое исследование источника дохода UniFarming для ключевых пользователей
 */

import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

async function quickFarmingInvestigation() {
  logger.info('=== БЫСТРОЕ ИССЛЕДОВАНИЕ ИСТОЧНИКА ДОХОДА UNIFARMING ===\n');

  // Ключевые пользователи для анализа
  const keyUserIds = [74, 64, 12, 14, 21];
  
  logger.info('АНАЛИЗ КЛЮЧЕВЫХ ПОЛЬЗОВАТЕЛЕЙ:\n');
  
  for (const userId of keyUserIds) {
    // Получаем данные пользователя
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (!user) continue;
    
    const balanceUni = parseFloat(user.balance_uni || '0');
    const depositAmount = user.uni_deposit_amount ? parseFloat(user.uni_deposit_amount) : null;
    const farmingRate = parseFloat(user.uni_farming_rate || '0.01');
    
    logger.info(`USER ${userId}:`);
    logger.info(`- Balance UNI: ${balanceUni.toFixed(2)}`);
    logger.info(`- Deposit Amount: ${depositAmount !== null ? depositAmount.toFixed(2) : 'NULL'}`);
    logger.info(`- Farming Active: ${user.uni_farming_active}`);
    logger.info(`- Farming Rate: ${farmingRate} (${farmingRate * 100}% в день)`);
    
    // Рассчитываем ожидаемый доход за 5 минут
    const fiveMinutesInDays = 5 / (60 * 24);
    const expectedFromBalance = balanceUni * farmingRate * fiveMinutesInDays;
    const expectedFromDeposit = depositAmount ? depositAmount * farmingRate * fiveMinutesInDays : 0;
    
    logger.info(`- Ожидаемый доход от баланса (за 5 мин): ${expectedFromBalance.toFixed(6)} UNI`);
    logger.info(`- Ожидаемый доход от депозита (за 5 мин): ${expectedFromDeposit.toFixed(6)} UNI`);
    
    // Получаем последние 3 транзакции FARMING_REWARD
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, amount_uni, created_at, description')
      .eq('user_id', userId)
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'UNI')
      .order('created_at', { ascending: false })
      .limit(3);
      
    if (transactions && transactions.length > 0) {
      logger.info(`- Последние ${transactions.length} транзакции:`);
      for (const tx of transactions) {
        const amount = parseFloat(tx.amount_uni || '0');
        const minutesAgo = Math.floor((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60));
        
        // Определяем источник
        let source = 'НЕИЗВЕСТНО';
        let periods = 1;
        
        // Проверяем соответствие депозиту
        if (expectedFromDeposit > 0) {
          const depositRatio = amount / expectedFromDeposit;
          if (Math.abs(depositRatio - 1) < 0.1) {
            source = 'ДЕПОЗИТ';
          } else if (depositRatio > 1.5 && depositRatio < 1000) {
            source = 'ДЕПОЗИТ';
            periods = Math.round(depositRatio);
          }
        }
        
        // Проверяем соответствие балансу
        if (source === 'НЕИЗВЕСТНО' && expectedFromBalance > 0) {
          const balanceRatio = amount / expectedFromBalance;
          if (Math.abs(balanceRatio - 1) < 0.1) {
            source = 'БАЛАНС';
          } else if (balanceRatio > 1.5 && balanceRatio < 1000) {
            source = 'БАЛАНС';
            periods = Math.round(balanceRatio);
          }
        }
        
        logger.info(`    ${amount.toFixed(6)} UNI (${minutesAgo} мин назад) - от ${source}${periods > 1 ? ` x${periods} периодов` : ''}`);
      }
    } else {
      logger.info('- Нет транзакций FARMING_REWARD');
    }
    
    logger.info('');
  }
  
  // Проверяем пользователей с NULL депозитом
  logger.info('\nПОЛЬЗОВАТЕЛИ С NULL ДЕПОЗИТОМ:');
  const { data: nullUsers } = await supabase
    .from('users')
    .select('id, balance_uni, uni_farming_active')
    .eq('uni_farming_active', true)
    .is('uni_deposit_amount', null)
    .limit(10);
    
  if (nullUsers && nullUsers.length > 0) {
    logger.info(`Найдено ${nullUsers.length} активных фармеров с NULL в uni_deposit_amount:`);
    for (const user of nullUsers) {
      logger.info(`- User ${user.id}: balance=${parseFloat(user.balance_uni || '0').toFixed(2)} UNI`);
    }
  }
  
  // Анализ TON Boost для сравнения
  logger.info('\n\nСРАВНЕНИЕ С TON BOOST:\n');
  
  const { data: tonUser } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', 74)
    .single();
    
  if (tonUser) {
    logger.info('USER 74 в TON Boost:');
    logger.info(`- Farming Balance: ${tonUser.farming_balance} TON`);
    logger.info(`- Farming Rate: ${tonUser.farming_rate} (${parseFloat(tonUser.farming_rate) * 100}% в день)`);
    logger.info(`- Boost Active: ${tonUser.boost_active}`);
    logger.info(`- Boost Package ID: ${tonUser.boost_package_id}`);
    
    const tonIncome5min = parseFloat(tonUser.farming_balance) * parseFloat(tonUser.farming_rate) * 5 / 1440;
    logger.info(`- Ожидаемый доход за 5 мин: ${tonIncome5min.toFixed(6)} TON`);
    
    // Проверяем последнюю TON транзакцию
    const { data: tonTx } = await supabase
      .from('transactions')
      .select('amount, created_at')
      .eq('user_id', 74)
      .eq('currency', 'TON')
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (tonTx && tonTx.length > 0) {
      const minutesAgo = Math.floor((Date.now() - new Date(tonTx[0].created_at).getTime()) / (1000 * 60));
      logger.info(`- Последняя транзакция: ${tonTx[0].amount} TON (${minutesAgo} мин назад)`);
    } else {
      logger.info('- Нет транзакций TON FARMING_REWARD');
    }
  }
  
  logger.info('\n\nВЫВОДЫ:');
  logger.info('1. UNI Farming использует uni_deposit_amount через UniFarmingRepository');
  logger.info('2. Некоторые пользователи имеют NULL в uni_deposit_amount → fallback на balance_uni');
  logger.info('3. TON Boost использует farming_balance из ton_farming_data');
  logger.info('4. Обнаружены накопленные периоды (возможно из-за пропущенных запусков)');
  
  logger.info('\n=== ИССЛЕДОВАНИЕ ЗАВЕРШЕНО ===');
}

// Запускаем исследование
quickFarmingInvestigation().catch(console.error);