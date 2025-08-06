/**
 * Fallback mechanisms for TON deposit processing
 * Ensures deposits are never lost even if primary verification fails
 */

import { logger } from '../core/logger';
import { UnifiedTransactionService } from '../modules/transactions/UnifiedTransactionService';

export interface DepositFallbackResult {
  success: boolean;
  transaction_id?: string;
  error?: string;
  fallbackUsed: boolean;
}

/**
 * Process TON deposit with fallback when primary verification fails
 */
export async function processTonDepositWithFallback(params: {
  user_id: number;
  ton_tx_hash: string;
  amount: number;
  wallet_address: string;
  primaryError?: string;
}): Promise<DepositFallbackResult> {
  try {
    const { user_id, ton_tx_hash, amount, wallet_address, primaryError } = params;

    logger.warn('[DepositFallback] Активирован fallback механизм для TON депозита', {
      userId: user_id,
      amount,
      txHash: ton_tx_hash.substring(0, 20) + '...',
      primaryError,
      timestamp: new Date().toISOString()
    });

    // Проверяем, что это действительно валидные данные депозита
    if (!user_id || user_id <= 0) {
      return {
        success: false,
        error: 'Invalid user_id for fallback processing',
        fallbackUsed: true
      };
    }

    if (!amount || amount <= 0) {
      return {
        success: false,
        error: 'Invalid amount for fallback processing',
        fallbackUsed: true
      };
    }

    if (!ton_tx_hash || ton_tx_hash.length < 10) {
      return {
        success: false,
        error: 'Invalid transaction hash for fallback processing',
        fallbackUsed: true
      };
    }

    // Извлекаем hash из BOC если нужно
    let extractedHash = ton_tx_hash;
    let originalBoc = '';
    
    if (ton_tx_hash.startsWith('te6')) {
      try {
        // Используем правильное извлечение через @ton/core
        const { Cell } = await import('@ton/core');
        const cell = Cell.fromBase64(ton_tx_hash);
        extractedHash = cell.hash().toString('hex');
        originalBoc = ton_tx_hash;
        
        logger.info('[DepositFallback] Real hash extracted from BOC using @ton/core', {
          extractedHash: extractedHash.substring(0, 16) + '...',
          method: 'Cell.hash()'
        });
      } catch (error) {
        logger.error('[DepositFallback] Error extracting hash with @ton/core, trying SHA256 fallback', {
          error: error instanceof Error ? error.message : String(error)
        });
        
        // SHA256 fallback только если @ton/core недоступен
        try {
          const crypto = await import('crypto');
          extractedHash = crypto.createHash('sha256').update(ton_tx_hash).digest('hex');
          logger.warn('[DepositFallback] Using SHA256 fallback (not blockchain hash!)', {
            extractedHash: extractedHash.substring(0, 16) + '...'
          });
        } catch (fallbackError) {
          logger.error('[DepositFallback] Both @ton/core and SHA256 failed', {
            error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          });
          extractedHash = ton_tx_hash; // Используем оригинал как последний резерв
        }
      }
    }

    // Создаем транзакцию через UnifiedTransactionService с маркером fallback
    const transactionService = UnifiedTransactionService.getInstance();
    const result = await transactionService.createTransaction({
      user_id,
      type: 'TON_DEPOSIT',
      amount_ton: amount,
      amount_uni: 0,
      currency: 'TON',
      status: 'completed',
      description: `TON deposit processed via fallback mechanism`,
      metadata: {
        source: 'ton_deposit_fallback',
        original_type: 'TON_DEPOSIT',
        wallet_address,
        tx_hash: extractedHash,
        ton_tx_hash: extractedHash,
        original_boc: originalBoc,
        fallback_reason: primaryError || 'Primary verification failed',
        fallback_timestamp: new Date().toISOString(),
        requires_manual_review: true // Помечаем для ручной проверки
      }
    });

    if (!result.success) {
      logger.error('[DepositFallback] Fallback тоже провалился', {
        userId: user_id,
        error: result.error,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: `Fallback failed: ${result.error}`,
        fallbackUsed: true
      };
    }

    logger.info('[DepositFallback] Депозит успешно обработан через fallback', {
      transaction_id: result.transaction_id,
      userId: user_id,
      amount,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      transaction_id: result.transaction_id?.toString(),
      fallbackUsed: true
    };

  } catch (error) {
    logger.error('[DepositFallback] Критическая ошибка в fallback механизме', {
      error: error instanceof Error ? error.message : String(error),
      params: JSON.stringify(params, null, 2),
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      error: `Fallback mechanism failed: ${error instanceof Error ? error.message : String(error)}`,
      fallbackUsed: true
    };
  }
}

/**
 * Health check for deposit processing system
 */
export async function depositSystemHealthCheck(): Promise<{
  isHealthy: boolean;
  checks: {
    tonApiConnectivity: boolean;
    unifiedTransactionService: boolean;
    balanceManager: boolean;
  };
  timestamp: string;
}> {
  const timestamp = new Date().toISOString();
  const checks = {
    tonApiConnectivity: false,
    unifiedTransactionService: false,
    balanceManager: false
  };

  try {
    // Check TonAPI connectivity
    try {
      const { healthCheck } = await import('../core/tonApiClient');
      checks.tonApiConnectivity = await healthCheck();
    } catch (error) {
      logger.warn('[DepositHealthCheck] TonAPI health check failed', { error });
      checks.tonApiConnectivity = false;
    }

    // Check UnifiedTransactionService
    try {
      const transactionService = UnifiedTransactionService.getInstance();
      checks.unifiedTransactionService = !!transactionService;
    } catch (error) {
      logger.warn('[DepositHealthCheck] UnifiedTransactionService check failed', { error });
      checks.unifiedTransactionService = false;
    }

    // Check BalanceManager
    try {
      const { BalanceManager } = await import('../core/BalanceManager');
      checks.balanceManager = !!BalanceManager;
    } catch (error) {
      logger.warn('[DepositHealthCheck] BalanceManager check failed', { error });
      checks.balanceManager = false;
    }

    const isHealthy = Object.values(checks).every(check => check);

    logger.info('[DepositHealthCheck] System health check completed', {
      isHealthy,
      checks,
      timestamp
    });

    return { isHealthy, checks, timestamp };

  } catch (error) {
    logger.error('[DepositHealthCheck] Health check failed', {
      error: error instanceof Error ? error.message : String(error),
      timestamp
    });

    return {
      isHealthy: false,
      checks,
      timestamp
    };
  }
}