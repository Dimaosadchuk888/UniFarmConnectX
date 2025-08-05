/**
 * Real TON API verification service for Boost transactions
 * Replaces mock emulation with authentic blockchain verification
 */

import { logger } from '../../core/logger';
import { verifyTonTransaction, validateTonAddress, checkTonBalance, getAccountInfo } from '../../core/tonApiClient';
import { getTonBoostReceiverAddress } from '../../config/tonBoostPayment';

export class TonApiVerificationService {
  // Cache for verified transactions to prevent duplicate API calls
  private static verificationCache = new Map<string, any>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Comprehensive TON transaction verification with real blockchain data
   */
  static async verifyBoostTransaction(txHash: string, expectedAmount: number = 0.01): Promise<{
    isValid: boolean;
    amount?: string;
    sender?: string;
    recipient?: string;
    timestamp?: number;
    error?: string;
    verificationDetails?: any;
  }> {
    try {
      logger.info('[TonApiVerification] Starting comprehensive transaction verification', {
        txHash,
        expectedAmount
      });

      // Input validation
      if (!txHash || typeof txHash !== 'string' || txHash.length < 10) {
        logger.error('[TonApiVerification] Invalid transaction hash provided:', { txHash });
        return {
          isValid: false,
          error: 'Invalid transaction hash format'
        };
      }

      if (typeof expectedAmount !== 'number' || expectedAmount <= 0) {
        logger.error('[TonApiVerification] Invalid expected amount:', { expectedAmount });
        return {
          isValid: false,
          error: 'Invalid expected amount'
        };
      }

      // Check cache first
      const cacheKey = `${txHash}-${expectedAmount}`;
      const cached = this.verificationCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        logger.info('[TonApiVerification] Returning cached verification result:', { txHash });
        return cached.result;
      }

      // Step 1: Verify transaction exists and is valid
      const verification = await verifyTonTransaction(txHash);
      
      if (!verification.isValid) {
        logger.warn('[TonApiVerification] Transaction not found on blockchain', { txHash });
        return {
          isValid: false,
          error: 'Transaction not found on TON blockchain'
        };
      }

      // Step 2: Check transaction status
      if (verification.status && verification.status !== 'completed' && verification.status !== 'success') {
        logger.warn('[TonApiVerification] Transaction not successful', {
          txHash,
          status: verification.status
        });
        return {
          isValid: false,
          error: `Transaction failed with status: ${verification.status}`
        };
      }

      // Step 3: Verify transaction amount
      const transactionAmount = parseFloat(verification.amount || '0');
      if (transactionAmount < expectedAmount) {
        logger.warn('[TonApiVerification] Insufficient transaction amount', {
          txHash,
          expected: expectedAmount,
          actual: transactionAmount
        });
        return {
          isValid: false,
          error: `Insufficient amount. Expected: ${expectedAmount} TON, got: ${transactionAmount} TON`
        };
      }

      // Step 4: Verify recipient address
      const expectedRecipient = getTonBoostReceiverAddress();
      if (verification.recipient && verification.recipient !== expectedRecipient) {
        logger.warn('[TonApiVerification] Wrong recipient address', {
          txHash,
          expected: expectedRecipient,
          actual: verification.recipient
        });
        return {
          isValid: false,
          error: 'Transaction sent to wrong recipient address'
        };
      }

      // Step 5: Verify sender address format
      if (verification.sender) {
        const senderValidation = await validateTonAddress(verification.sender);
        if (!senderValidation.isValid) {
          logger.warn('[TonApiVerification] Invalid sender address format', {
            txHash,
            sender: verification.sender,
            validationError: senderValidation.error
          });
          return {
            isValid: false,
            error: `Invalid sender address format: ${senderValidation.error}`
          };
        }
      }

      logger.info('[TonApiVerification] Transaction verification successful', {
        txHash,
        amount: verification.amount,
        sender: verification.sender,
        recipient: verification.recipient,
        timestamp: verification.timestamp
      });

      const result = {
        isValid: true,
        amount: verification.amount,
        sender: verification.sender,
        recipient: verification.recipient,
        timestamp: verification.timestamp,
        verificationDetails: {
          expectedAmount,
          actualAmount: transactionAmount,
          amountValid: transactionAmount >= expectedAmount,
          recipientValid: verification.recipient === expectedRecipient,
          statusValid: verification.status === 'success',
          verifiedAt: new Date().toISOString()
        }
      };

      // Cache successful verification
      this.verificationCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      logger.error('[TonApiVerification] Critical error during verification', {
        txHash,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        isValid: false,
        error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Clear verification cache (useful for testing or manual cache refresh)
   */
  static clearCache(): void {
    this.verificationCache.clear();
    logger.info('[TonApiVerification] Verification cache cleared');
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.verificationCache.size,
      entries: Array.from(this.verificationCache.keys())
    };
  }

  /**
   * Check if a TON address has sufficient balance for boost purchase
   */
  static async checkSufficientBalance(address: string, requiredAmount: number): Promise<{
    hasSufficientBalance: boolean;
    currentBalance?: string;
    error?: string;
  }> {
    try {
      logger.info('[TonApiVerification] Checking address balance', {
        address,
        requiredAmount
      });

      const balanceCheck = await checkTonBalance(address, requiredAmount);
      
      if (!balanceCheck.isValid) {
        return {
          hasSufficientBalance: false,
          error: 'Address not found or invalid'
        };
      }

      logger.info('[TonApiVerification] Balance check completed', {
        address,
        balance: balanceCheck.balance,
        required: requiredAmount,
        sufficient: balanceCheck.hasBalance
      });

      return {
        hasSufficientBalance: balanceCheck.hasBalance,
        currentBalance: balanceCheck.balance
      };

    } catch (error) {
      logger.error('[TonApiVerification] Error checking balance', {
        address,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        hasSufficientBalance: false,
        error: 'Error checking balance'
      };
    }
  }

  /**
   * Validate TON address format and blockchain existence
   */
  static async validateTonWalletAddress(address: string): Promise<{
    isValidFormat: boolean;
    existsOnBlockchain: boolean;
    isActive: boolean;
    balance?: string;
    error?: string;
  }> {
    try {
      logger.info('[TonApiVerification] Validating TON address', { address });

      const validation = await validateTonAddress(address);
      
      // Get account info to check if address exists on blockchain
      const accountInfo = await getAccountInfo(address);

      logger.info('[TonApiVerification] Address validation completed', {
        address,
        isValid: validation.isValid,
        existsOnBlockchain: accountInfo.isValid,
        balance: accountInfo.balance
      });

      return {
        isValidFormat: validation.isValid,
        existsOnBlockchain: accountInfo.isValid,
        isActive: accountInfo.isValid && accountInfo.status === 'active',
        balance: accountInfo.balance
      };

    } catch (error) {
      logger.error('[TonApiVerification] Error validating address', {
        address,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        isValidFormat: false,
        existsOnBlockchain: false,
        isActive: false,
        error: 'Error validating address'
      };
    }
  }

  /**
   * Get detailed transaction information for debugging
   */
  static async getTransactionDetails(txHash: string): Promise<{
    found: boolean;
    details?: any;
    formattedInfo?: string;
    error?: string;
  }> {
    try {
      logger.info('[TonApiVerification] Getting transaction details', { txHash });

      const verification = await verifyTonTransaction(txHash);
      
      if (!verification.isValid) {
        return {
          found: false,
          error: 'Transaction not found'
        };
      }

      const formattedInfo = `
Transaction Hash: ${txHash}
Status: ${verification.status}
Amount: ${verification.amount} TON
Sender: ${verification.sender}
Recipient: ${verification.recipient}
Timestamp: ${verification.timestamp ? new Date(verification.timestamp * 1000).toISOString() : 'Unknown'}
      `.trim();

      return {
        found: true,
        details: verification,
        formattedInfo
      };

    } catch (error) {
      logger.error('[TonApiVerification] Error getting transaction details', {
        txHash,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        found: false,
        error: 'Error retrieving transaction details'
      };
    }
  }
}