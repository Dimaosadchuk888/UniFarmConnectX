/**
 * TON Blockchain Transaction Checker
 * Проверка статуса транзакций через TON API
 */

import { logger } from '../core/logger';
import { getTonBoostWalletAddress } from '../config/tonBoost';

export interface TonTransactionResult {
  success: boolean;
  confirmed: boolean;
  amount?: string;
  error?: string;
}

/**
 * Проверяет статус TON транзакции через tonapi.io
 * @param txHash Хеш транзакции в TON blockchain
 * @returns Результат проверки транзакции
 */
export async function checkTonTransaction(txHash: string): Promise<TonTransactionResult> {
  try {
    logger.info('[TON Checker] Начало проверки транзакции', { txHash });

    if (!txHash || txHash.length < 10) {
      logger.error('[TON Checker] Невалидный tx_hash', { txHash });
      return {
        success: false,
        confirmed: false,
        error: 'Невалидный хеш транзакции'
      };
    }

    // Используем tonapi.io для проверки транзакции
    const apiUrl = `https://tonapi.io/v2/blockchain/transactions/${txHash}`;
    
    logger.info('[TON Checker] Запрос к TON API', { apiUrl });

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'UniFarm-Bot/1.0'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        logger.warn('[TON Checker] Транзакция не найдена в блокчейне', { 
          txHash, 
          status: response.status 
        });
        return {
          success: true,
          confirmed: false,
          error: 'Транзакция не найдена в блокчейне'
        };
      }

      logger.error('[TON Checker] Ошибка TON API', { 
        txHash, 
        status: response.status,
        statusText: response.statusText
      });
      
      return {
        success: false,
        confirmed: false,
        error: `TON API error: ${response.status}`
      };
    }

    const transactionData = await response.json();

    logger.info('[TON Checker] Получены данные транзакции', {
      txHash,
      hasData: !!transactionData,
      success: transactionData?.success
    });

    // Проверяем статус транзакции
    const isConfirmed = transactionData && 
                       transactionData.success === true &&
                       transactionData.compute_phase?.exit_code === 0;

    // Извлекаем сумму транзакции если доступна
    let amount: string | undefined;
    if (transactionData?.in_msg?.value) {
      // Конвертируем из нанотонов в TON
      const nanotons = parseInt(transactionData.in_msg.value);
      amount = (nanotons / 1e9).toString();
    }

    // Проверяем, что транзакция отправлена на правильный адрес
    const expectedWalletAddress = getTonBoostWalletAddress();
    const receiverAddress = transactionData?.in_msg?.destination?.address;
    
    if (isConfirmed && receiverAddress && receiverAddress !== expectedWalletAddress) {
      logger.warn('[TON Checker] Транзакция отправлена на неправильный адрес', {
        txHash,
        expected: expectedWalletAddress,
        actual: receiverAddress
      });
      
      return {
        success: false,
        confirmed: false,
        error: 'Транзакция отправлена на неправильный адрес кошелька'
      };
    }

    const result: TonTransactionResult = {
      success: true,
      confirmed: isConfirmed,
      amount
    };

    logger.info('[TON Checker] Результат проверки транзакции', {
      txHash,
      confirmed: result.confirmed,
      amount: result.amount
    });

    return result;

  } catch (error) {
    logger.error('[TON Checker] Критическая ошибка проверки транзакции', {
      txHash,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      confirmed: false,
      error: `Ошибка проверки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

/**
 * Проверяет статус множественных транзакций
 * @param txHashes Массив хешей транзакций
 * @returns Результаты проверки для каждой транзакции
 */
export async function checkMultipleTonTransactions(txHashes: string[]): Promise<Record<string, TonTransactionResult>> {
  logger.info('[TON Checker] Проверка множественных транзакций', { 
    count: txHashes.length 
  });

  const results: Record<string, TonTransactionResult> = {};

  // Проверяем транзакции с задержкой чтобы не перегружать API
  for (const txHash of txHashes) {
    results[txHash] = await checkTonTransaction(txHash);
    
    // Задержка 100ms между запросами
    if (txHashes.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  logger.info('[TON Checker] Завершена проверка множественных транзакций', {
    total: txHashes.length,
    confirmed: Object.values(results).filter(r => r.confirmed).length
  });

  return results;
}