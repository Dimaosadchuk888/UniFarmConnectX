#!/usr/bin/env tsx
/**
 * Test script to verify WebSocket balance integration is sending proper change amounts
 * This will trigger a small balance update and check if WebSocket sends the correct notification
 */

import { BalanceManager } from '../core/BalanceManager';
import { logger } from '../core/logger';

async function testWebSocketBalanceUpdate() {
  logger.info('=== Testing WebSocket Balance Integration ===');
  
  const balanceManager = BalanceManager.getInstance();
  const testUserId = 74;
  const testAmount = 100; // Small test amount
  
  try {
    // Get current balance
    const currentBalance = await balanceManager.getUserBalance(testUserId);
    if (!currentBalance.success) {
      logger.error('Failed to get current balance', currentBalance.error);
      return;
    }
    
    logger.info('Current balance:', {
      userId: testUserId,
      uniBalance: currentBalance.balance?.balance_uni,
      tonBalance: currentBalance.balance?.balance_ton
    });
    
    // Add test amount to trigger WebSocket notification
    logger.info('Adding test amount to trigger WebSocket notification...', {
      amount: testAmount,
      currency: 'UNI'
    });
    
    const result = await balanceManager.addBalance(
      testUserId,
      testAmount, // UNI amount
      0,          // TON amount
      'test_websocket_integration',
      'TEST_WEBSOCKET'
    );
    
    if (!result.success) {
      logger.error('Failed to update balance', result.error);
      return;
    }
    
    logger.info('Balance updated successfully:', {
      newUniBalance: result.newBalance?.balance_uni,
      newTonBalance: result.newBalance?.balance_ton,
      changeAmount: testAmount
    });
    
    logger.info('✅ WebSocket notification should have been sent with changeAmount:', testAmount);
    logger.info('Check the browser console for balance_update WebSocket message');
    
    // Wait a moment for WebSocket to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Revert the test change
    logger.info('Reverting test balance change...');
    await balanceManager.subtractBalance(
      testUserId,
      testAmount,
      0,
      'test_websocket_revert',
      'TEST_WEBSOCKET_REVERT'
    );
    
    logger.info('✅ Test completed. Check logs for WebSocketBalanceIntegration messages.');
    
  } catch (error) {
    logger.error('Test failed:', error);
  }
  
  process.exit(0);
}

// Run the test
testWebSocketBalanceUpdate();