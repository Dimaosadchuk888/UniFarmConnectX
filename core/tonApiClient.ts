/**
 * Real TON API client for blockchain verification and transaction processing
 * Replaces mock emulation with authentic TON blockchain connectivity
 */

import { Api, HttpClient } from 'tonapi-sdk-js';
import { logger } from './logger';

// Initialize TonAPI client with environment key
const tonApiKey = process.env.TONAPI_API_KEY;

if (!tonApiKey) {
  logger.warn('[TonAPI] TONAPI_API_KEY not found in environment, using testnet');
}

// Create TonAPI client instance with enhanced configuration
const httpClient = new HttpClient({
  baseUrl: 'https://tonapi.io',
  baseApiParams: {
    headers: tonApiKey ? { Authorization: `Bearer ${tonApiKey}` } : {}
  }
});

export const tonApi = new Api(httpClient);

// Rate limiting configuration for production stability
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // 100ms between requests

/**
 * Rate-limited wrapper for TonAPI calls to prevent hitting API limits
 */
async function rateLimitedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  return requestFn();
}

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

    // Input validation
    if (!txHash || typeof txHash !== 'string' || txHash.length < 10) {
      logger.error('[TonAPI] Invalid transaction hash provided:', { txHash });
      return { isValid: false };
    }

    // Handle BOC data - extract hash if needed
    let actualHash = txHash;
    if (txHash.startsWith('te6')) {
      // This is BOC data, not a hash - extract the actual hash
      logger.info('[TonAPI] BOC data detected, extracting hash:', { 
        bocLength: txHash.length,
        bocPrefix: txHash.substring(0, 20) 
      });
      
      try {
        // Extract hash from BOC data
        actualHash = await extractHashFromBoc(txHash);
        logger.info('[TonAPI] Hash extracted from BOC:', { 
          originalBoc: txHash.substring(0, 20) + '...',
          extractedHash: actualHash 
        });
      } catch (error) {
        logger.error('[TonAPI] Failed to extract hash from BOC:', { 
          bocData: txHash.substring(0, 50) + '...',
          error: error instanceof Error ? error.message : String(error)
        });
        return { isValid: false };
      }
    }

    // Get transaction details from TON blockchain with rate limiting
    const transactionResponse = await rateLimitedRequest(() => 
      tonApi.traces.getTrace(actualHash)
    );
    
    if (!transactionResponse || !transactionResponse.transaction) {
      logger.warn('[TonAPI] Transaction not found:', { txHash: actualHash });
      return { isValid: false };
    }

    const transaction = transactionResponse.transaction;
    
    // Extract transaction data with correct TonAPI v2 structure
    const outMessage = transaction.out_msgs && transaction.out_msgs.length > 0 ? transaction.out_msgs[0] : null;
    const amount = outMessage?.value ? (parseInt(outMessage.value.toString()) / 1000000000).toString() : '0';
    
    logger.info('[TonAPI] Transaction verified:', {
      txHash: actualHash,
      amount,
      timestamp: transaction.utime
    });

    return {
      isValid: true,
      amount,
      sender: transaction.account?.address || '',
      recipient: outMessage?.destination?.address || '',
      comment: outMessage?.body || '',
      timestamp: transaction.utime ? transaction.utime * 1000 : Date.now(),
      status: 'completed'
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

    // Input validation
    if (!address || typeof address !== 'string') {
      logger.error('[TonAPI] Invalid address provided:', { address });
      return { hasBalance: false, balance: '0', isValid: false };
    }

    // Get account information from TON blockchain with rate limiting
    const account = await rateLimitedRequest(() => 
      tonApi.accounts.getAccount(address)
    );
    
    if (!account) {
      logger.warn('[TonAPI] Account not found:', { address });
      return { hasBalance: false, balance: '0', isValid: false };
    }

    const balanceTon = parseInt(account.balance?.toString() || '0') / 1000000000;
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
 * Get account information for address validation
 */
export async function getAccountInfo(address: string): Promise<{
  isValid: boolean;
  status?: string;
  balance?: string;
}> {
  try {
    logger.info('[TonAPI] Getting account info:', { address });

    const account = await rateLimitedRequest(() => 
      tonApi.accounts.getAccount(address)
    );

    if (!account) {
      return { isValid: false };
    }

    const balance = (parseInt(account.balance?.toString() || '0') / 1000000000).toString();

    return {
      isValid: true,
      status: account.status || 'active',
      balance
    };

  } catch (error) {
    logger.error('[TonAPI] Error getting account info:', {
      address,
      error: error instanceof Error ? error.message : String(error)
    });
    
    return { isValid: false };
  }
}

/**
 * Extract transaction hash from BOC (Bag of Cells) data
 */
export async function extractHashFromBoc(bocData: string): Promise<string> {
  try {
    logger.info('[TonAPI] Extracting hash from BOC data:', { 
      bocLength: bocData.length,
      bocPrefix: bocData.substring(0, 20)
    });

    // Use proper TON SDK to decode BOC and extract real blockchain hash
    const { Cell } = await import('@ton/core');
    
    // Try to parse BOC data to Cell and extract the real hash
    let cell: any;
    let hash: string;
    
    try {
      // First try as base64
      cell = Cell.fromBase64(bocData);
      hash = cell.hash().toString('hex');
    } catch (base64Error) {
      // If base64 fails, try as hex
      try {
        const buffer = Buffer.from(bocData, 'hex');
        cell = Cell.fromBoc(buffer)[0];
        hash = cell.hash().toString('hex');
      } catch (hexError) {
        // If both fail, try direct BOC parsing
        const buffer = Buffer.from(bocData, 'base64');
        cell = Cell.fromBoc(buffer)[0];
        hash = cell.hash().toString('hex');
      }
    }
    
    logger.info('[TonAPI] Real hash extracted from BOC using @ton/core:', { 
      bocData: bocData.substring(0, 30) + '...',
      extractedHash: hash.substring(0, 16) + '...',
      method: 'Cell.hash()'
    });
    
    return hash;
    
  } catch (error) {
    logger.error('[TonAPI] Error extracting hash from BOC:', {
      bocData: bocData.substring(0, 50) + '...',
      error: error instanceof Error ? error.message : String(error)
    });
    
    // НЕ используем SHA256 fallback - лучше отклонить депозит, чем создать фейковый хэш
    throw new Error(`Failed to extract blockchain hash from BOC: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate TON address format
 */
export async function validateTonAddress(address: string): Promise<{
  isValid: boolean;
  format?: string;
  error?: string;
}> {
  try {
    logger.info('[TonAPI] Validating TON address:', { address });

    // Basic TON address validation
    if (!address || typeof address !== 'string') {
      return { isValid: false, error: 'Address is required and must be a string' };
    }

    // Check for common TON address formats
    const isValidFormat = /^[0-9a-fA-F-:]{48,}$/.test(address) || // Hex format
                         /^[A-Za-z0-9_-]{48}$/.test(address);     // Base64 format

    if (!isValidFormat) {
      return { isValid: false, error: 'Invalid TON address format' };
    }

    logger.info('[TonAPI] Address validation successful:', { address, isValid: true });
    return { isValid: true, format: 'valid' };

  } catch (error) {
    logger.error('[TonAPI] Error validating address:', {
      address,
      error: error instanceof Error ? error.message : String(error)
    });
    
    return { isValid: false, error: 'Address validation failed' };
  }
}

/**
 * Health check for TonAPI connectivity
 */
export async function healthCheck(): Promise<boolean> {
  try {
    // Simple test to verify API connectivity
    const testAddress = 'EQBYTuYbLf8INxFtD8tQeNk5ZLy-nAX9ahQbG_yl1qQ-GEMS'; // Well-known address
    const result = await getAccountInfo(testAddress);
    
    logger.info('[TonAPI] Health check completed:', { success: result.isValid });
    return result.isValid;
    
  } catch (error) {
    logger.error('[TonAPI] Health check failed:', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}