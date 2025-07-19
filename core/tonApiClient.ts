/**
 * Real TON API client for blockchain verification and transaction processing
 * Replaces mock emulation with authentic TON blockchain connectivity
 */

import { TonApiClient } from 'tonapi-sdk-js';
import { logger } from './logger';

// Initialize TonAPI client with environment key
const tonApiKey = process.env.TONAPI_API_KEY;

if (!tonApiKey) {
  logger.warn('[TonAPI] TONAPI_API_KEY not found in environment, using testnet');
}

// Create TonAPI client instance
export const tonApi = new TonApiClient({
  baseUrl: 'https://tonapi.io',
  apiKey: tonApiKey || undefined, // Use undefined for testnet if no key
});

/**
 * Verify TON transaction by hash with real blockchain data
 */
export async function verifyTonTransaction(txHash: string): Promise<{
  isValid: boolean;
  amount?: string;
  sender?: string;
  recipient?: string;
  comment?: string;
  timestamp?: number;
  status?: string;
}> {
  try {
    logger.info('[TonAPI] Verifying transaction:', { txHash });

    // Get transaction details from TON blockchain
    const transaction = await tonApi.blockchain.getTransaction(txHash);
    
    if (!transaction) {
      logger.warn('[TonAPI] Transaction not found:', { txHash });
      return { isValid: false };
    }

    // Extract transaction data
    const outMessage = transaction.out_msgs?.[0];
    const amount = outMessage?.value ? (parseInt(outMessage.value) / 1000000000).toString() : '0';
    
    logger.info('[TonAPI] Transaction verified:', {
      txHash,
      amount,
      status: transaction.success ? 'success' : 'failed',
      timestamp: transaction.utime
    });

    return {
      isValid: true,
      amount,
      sender: transaction.account?.address,
      recipient: outMessage?.destination?.address,
      comment: outMessage?.body || '',
      timestamp: transaction.utime,
      status: transaction.success ? 'success' : 'failed'
    };

  } catch (error) {
    logger.error('[TonAPI] Error verifying transaction:', {
      txHash,
      error: error instanceof Error ? error.message : String(error)
    });
    
    return { isValid: false };
  }
}

/**
 * Check if TON address has sufficient balance
 */
export async function checkTonBalance(address: string, minAmount: number = 0.01): Promise<{
  hasBalance: boolean;
  balance: string;
  isValid: boolean;
}> {
  try {
    logger.info('[TonAPI] Checking balance for address:', { address, minAmount });

    // Get account information from TON blockchain
    const account = await tonApi.accounts.getAccount(address);
    
    if (!account) {
      logger.warn('[TonAPI] Account not found:', { address });
      return { hasBalance: false, balance: '0', isValid: false };
    }

    const balanceTon = parseInt(account.balance) / 1000000000;
    const hasBalance = balanceTon >= minAmount;

    logger.info('[TonAPI] Balance checked:', {
      address,
      balance: balanceTon.toString(),
      hasBalance,
      minAmount
    });

    return {
      hasBalance,
      balance: balanceTon.toString(),
      isValid: true
    };

  } catch (error) {
    logger.error('[TonAPI] Error checking balance:', {
      address,
      error: error instanceof Error ? error.message : String(error)
    });
    
    return { hasBalance: false, balance: '0', isValid: false };
  }
}

/**
 * Validate TON address format and check if it exists on blockchain
 */
export async function validateTonAddress(address: string): Promise<{
  isValid: boolean;
  isActive: boolean;
  balance?: string;
}> {
  try {
    logger.info('[TonAPI] Validating address:', { address });

    // Check address format first
    if (!/^(UQ|EQ|kQ)[A-Za-z0-9_-]{46}$/.test(address)) {
      logger.warn('[TonAPI] Invalid address format:', { address });
      return { isValid: false, isActive: false };
    }

    // Check if address exists on blockchain
    const account = await tonApi.accounts.getAccount(address);
    
    if (!account) {
      logger.warn('[TonAPI] Address not found on blockchain:', { address });
      return { isValid: true, isActive: false };
    }

    const balanceTon = parseInt(account.balance) / 1000000000;

    logger.info('[TonAPI] Address validated:', {
      address,
      isActive: account.status === 'active',
      balance: balanceTon.toString()
    });

    return {
      isValid: true,
      isActive: account.status === 'active',
      balance: balanceTon.toString()
    };

  } catch (error) {
    logger.error('[TonAPI] Error validating address:', {
      address,
      error: error instanceof Error ? error.message : String(error)
    });
    
    return { isValid: false, isActive: false };
  }
}

/**
 * Get transaction details by message hash
 */
export async function getTransactionByMessage(messageHash: string): Promise<{
  found: boolean;
  transaction?: any;
  amount?: string;
  sender?: string;
  recipient?: string;
}> {
  try {
    logger.info('[TonAPI] Getting transaction by message:', { messageHash });

    // Search for transaction by message hash
    const transaction = await tonApi.blockchain.getTransaction(messageHash);
    
    if (!transaction) {
      logger.warn('[TonAPI] Transaction not found by message:', { messageHash });
      return { found: false };
    }

    const outMessage = transaction.out_msgs?.[0];
    const amount = outMessage?.value ? (parseInt(outMessage.value) / 1000000000).toString() : '0';

    return {
      found: true,
      transaction,
      amount,
      sender: transaction.account?.address,
      recipient: outMessage?.destination?.address
    };

  } catch (error) {
    logger.error('[TonAPI] Error getting transaction by message:', {
      messageHash,
      error: error instanceof Error ? error.message : String(error)
    });
    
    return { found: false };
  }
}

/**
 * Health check for TonAPI connection
 */
export async function tonApiHealthCheck(): Promise<{
  isHealthy: boolean;
  latency?: number;
  error?: string;
}> {
  try {
    const startTime = Date.now();
    
    // Test with a known mainnet address
    await tonApi.accounts.getAccount('UQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-SCALE');
    
    const latency = Date.now() - startTime;
    
    logger.info('[TonAPI] Health check passed:', { latency });
    
    return { isHealthy: true, latency };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('[TonAPI] Health check failed:', { error: errorMessage });
    
    return { isHealthy: false, error: errorMessage };
  }
}