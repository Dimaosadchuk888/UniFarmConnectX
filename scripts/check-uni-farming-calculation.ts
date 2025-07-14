#!/usr/bin/env tsx
/**
 * Script to check UNI farming calculation logic
 * Investigates whether system uses balance_uni or deposit amount
 */

import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

async function checkUniFarmingCalculation() {
  logger.info('=== INVESTIGATING UNI FARMING CALCULATION ===');
  
  // Get user 74 data
  const { data: user74, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', 74)
    .single();
    
  if (!user74) {
    logger.error('User 74 not found');
    return;
  }
  
  logger.info('User 74 data:', {
    balance_uni: user74.balance_uni,
    uni_deposit_amount: user74.uni_deposit_amount,
    uni_farming_active: user74.uni_farming_active,
    uni_farming_rate: user74.uni_farming_rate,
    uni_farming_balance: user74.uni_farming_balance,
    uni_farming_deposit: user74.uni_farming_deposit
  });
  
  // Check what fields are used in calculation
  const depositAmount = parseFloat(user74.uni_deposit_amount || '0');
  const balanceUni = parseFloat(user74.balance_uni || '0');
  const farmingRate = parseFloat(user74.uni_farming_rate || '0.01');
  
  logger.info('\n=== COMPARISON ===');
  logger.info('Balance UNI:', balanceUni);
  logger.info('Deposit Amount:', depositAmount);
  logger.info('Farming Rate:', farmingRate);
  
  // Calculate what income would be for 5 minutes
  const fiveMinutesInDays = 5 / (60 * 24);
  
  const incomeFromBalance = balanceUni * farmingRate * fiveMinutesInDays;
  const incomeFromDeposit = depositAmount * farmingRate * fiveMinutesInDays;
  
  logger.info('\n=== INCOME CALCULATION (5 minutes) ===');
  logger.info('If calculated from balance_uni:', incomeFromBalance.toFixed(6), 'UNI');
  logger.info('If calculated from deposit_amount:', incomeFromDeposit.toFixed(6), 'UNI');
  
  // Check recent farming reward transactions
  const { data: recentTx, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (recentTx && recentTx.length > 0) {
    logger.info('\n=== RECENT FARMING REWARDS ===');
    recentTx.forEach(tx => {
      const amount = parseFloat(tx.amount_uni || tx.amount || '0');
      const matchesBalance = Math.abs(amount - incomeFromBalance) < 0.01;
      const matchesDeposit = Math.abs(amount - incomeFromDeposit) < 0.01;
      
      logger.info(`Transaction ${tx.id}:`, {
        amount: amount.toFixed(6),
        created_at: tx.created_at,
        matches_balance_calculation: matchesBalance,
        matches_deposit_calculation: matchesDeposit
      });
    });
  }
  
  // Check uni_farming_data table if exists
  const { data: farmingData, error: farmingError } = await supabase
    .from('uni_farming_data')
    .select('*')
    .eq('user_id', 74)
    .single();
    
  if (farmingData) {
    logger.info('\n=== UNI_FARMING_DATA TABLE ===');
    logger.info('Farming data:', {
      deposit_amount: farmingData.deposit_amount,
      farming_balance: farmingData.farming_balance,
      farming_rate: farmingData.farming_rate,
      is_active: farmingData.is_active
    });
  } else {
    logger.info('\n=== UNI_FARMING_DATA TABLE ===');
    logger.info('No data found in uni_farming_data table (using fallback to users table)');
  }
  
  // Conclusion
  logger.info('\n=== CONCLUSION ===');
  if (Math.abs(depositAmount - balanceUni) < 0.01) {
    logger.warn('⚠️ DEPOSIT AMOUNT EQUALS BALANCE - Cannot determine which is used');
  } else if (recentTx && recentTx.length > 0) {
    const lastAmount = parseFloat(recentTx[0].amount_uni || recentTx[0].amount || '0');
    const matchesBalance = Math.abs(lastAmount - incomeFromBalance) < 0.01;
    const matchesDeposit = Math.abs(lastAmount - incomeFromDeposit) < 0.01;
    
    if (matchesBalance && !matchesDeposit) {
      logger.error('❌ SYSTEM USES BALANCE_UNI FOR CALCULATION');
      logger.error('This is a business logic violation!');
    } else if (matchesDeposit && !matchesBalance) {
      logger.info('✅ SYSTEM CORRECTLY USES DEPOSIT_AMOUNT FOR CALCULATION');
    } else {
      logger.warn('⚠️ Cannot determine calculation source');
    }
  }
}

checkUniFarmingCalculation().catch(console.error);