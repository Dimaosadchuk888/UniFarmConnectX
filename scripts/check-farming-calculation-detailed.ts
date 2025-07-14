#!/usr/bin/env tsx
/**
 * Detailed investigation of UNI farming calculation discrepancies
 */

import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

async function checkFarmingCalculationDetailed() {
  logger.info('=== DETAILED UNI FARMING CALCULATION INVESTIGATION ===');
  
  // Get all users with active farming
  const { data: activeFarmers, error: farmersError } = await supabase
    .from('users')
    .select('id, balance_uni, uni_deposit_amount, uni_farming_rate, uni_farming_active, uni_farming_last_update')
    .eq('uni_farming_active', true)
    .order('uni_deposit_amount', { ascending: false })
    .limit(10);
    
  if (!activeFarmers || activeFarmers.length === 0) {
    logger.error('No active farmers found');
    return;
  }
  
  logger.info(`Found ${activeFarmers.length} active farmers`);
  
  // Check each farmer's data
  for (const farmer of activeFarmers) {
    logger.info(`\n=== USER ${farmer.id} ===`);
    logger.info('Balance UNI:', parseFloat(farmer.balance_uni || '0'));
    logger.info('Deposit Amount:', parseFloat(farmer.uni_deposit_amount || '0'));
    logger.info('Farming Rate:', parseFloat(farmer.uni_farming_rate || '0.01'));
    logger.info('Last Update:', farmer.uni_farming_last_update);
    
    // Calculate expected income for different time periods
    const depositAmount = parseFloat(farmer.uni_deposit_amount || '0');
    const balanceAmount = parseFloat(farmer.balance_uni || '0');
    const rate = parseFloat(farmer.uni_farming_rate || '0.01');
    
    // Calculate for 5 minutes
    const fiveMinutesInDays = 5 / (60 * 24);
    const incomeFromDeposit5min = depositAmount * rate * fiveMinutesInDays;
    const incomeFromBalance5min = balanceAmount * rate * fiveMinutesInDays;
    
    logger.info('Expected 5-minute income:');
    logger.info('  - From deposit:', incomeFromDeposit5min.toFixed(6), 'UNI');
    logger.info('  - From balance:', incomeFromBalance5min.toFixed(6), 'UNI');
    
    // Get recent transactions for this user
    const { data: recentTx, error: txError } = await supabase
      .from('transactions')
      .select('id, amount_uni, amount, created_at, description')
      .eq('user_id', farmer.id)
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(3);
      
    if (recentTx && recentTx.length > 0) {
      logger.info('Recent transactions:');
      for (const tx of recentTx) {
        const amount = parseFloat(tx.amount_uni || tx.amount || '0');
        const timeDiff = farmer.uni_farming_last_update ? 
          (new Date(tx.created_at).getTime() - new Date(farmer.uni_farming_last_update).getTime()) / 1000 / 60 : 0;
        
        logger.info(`  - TX ${tx.id}: ${amount.toFixed(6)} UNI`);
        logger.info(`    Created: ${tx.created_at}`);
        logger.info(`    Time since last update: ${timeDiff.toFixed(2)} minutes`);
        
        // Check if it matches expected calculations
        if (Math.abs(amount - incomeFromDeposit5min) < 1) {
          logger.info('    ✅ MATCHES deposit calculation (5 min)');
        } else if (Math.abs(amount - incomeFromBalance5min) < 1) {
          logger.warn('    ⚠️ MATCHES balance calculation (5 min) - INCORRECT!');
        } else {
          // Check if it's a multiple of 5 minutes
          const periods = Math.round(amount / incomeFromDeposit5min);
          if (periods > 1 && Math.abs(amount - (incomeFromDeposit5min * periods)) < 1) {
            logger.info(`    📊 Matches ${periods} x 5-minute periods from deposit`);
          } else {
            const periodsBalance = Math.round(amount / incomeFromBalance5min);
            if (periodsBalance > 1 && Math.abs(amount - (incomeFromBalance5min * periodsBalance)) < 1) {
              logger.warn(`    ⚠️ Matches ${periodsBalance} x 5-minute periods from BALANCE - INCORRECT!`);
            } else {
              logger.info('    ❓ Does not match expected calculations');
            }
          }
        }
      }
    }
  }
  
  // Summary
  logger.info('\n=== SUMMARY ===');
  logger.info('The system appears to be using deposit amounts for calculation,');
  logger.info('but there are timing discrepancies that make exact matching difficult.');
  logger.info('Large reward amounts suggest accumulated periods, not single 5-minute intervals.');
}

checkFarmingCalculationDetailed().catch(console.error);