/**
 * Контроллер для API транзакций
 * 
 * Обрабатывает HTTP-запросы, связанные с транзакциями, балансами и финансовыми операциями.
 */

import { Request, Response } from 'express';
import { transactionService, Currency, TransactionType } from '../services';
import { StorageErrors, StorageErrorType } from '../storage-interface';

/**
 * Получение транзакций пользователя
 * @param req Запрос Express
 * @param res Ответ Express
 */
export async function getUserTransactions(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId, 10);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }
    
    const result = await transactionService.getUserTransactions(userId, limit, offset);
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[TransactionController] Ошибка получения транзакций пользователя:', error);
    
    if (error.type === StorageErrorType.NOT_FOUND) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get transactions'
    });
  }
}

/**
 * Пополнение баланса пользователя
 * @param req Запрос Express
 * @param res Ответ Express
 */
export async function depositFunds(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId, 10);
    const { currency, amount, source, description } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }
    
    if (!currency || (currency !== Currency.UNI && currency !== Currency.TON)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency'
      });
    }
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }
    
    const result = await transactionService.depositFunds(
      userId,
      currency as Currency,
      amount,
      source,
      description
    );
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[TransactionController] Ошибка пополнения баланса:', error);
    
    if (error.type === StorageErrorType.NOT_FOUND) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (error.type === StorageErrorType.VALIDATION) {
      return res.status(400).json({
        success: false,
        error: error.message || 'Invalid input data'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to deposit funds'
    });
  }
}

/**
 * Вывод средств с баланса пользователя
 * @param req Запрос Express
 * @param res Ответ Express
 */
export async function withdrawFunds(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId, 10);
    const { currency, amount, walletAddress, description } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }
    
    if (!currency || (currency !== Currency.UNI && currency !== Currency.TON)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency'
      });
    }
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }
    
    const result = await transactionService.withdrawFunds(
      userId,
      currency as Currency,
      amount,
      walletAddress,
      description
    );
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[TransactionController] Ошибка вывода средств:', error);
    
    if (error.type === StorageErrorType.NOT_FOUND) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (error.type === StorageErrorType.VALIDATION) {
      return res.status(400).json({
        success: false,
        error: error.message || 'Invalid input data'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to withdraw funds'
    });
  }
}

/**
 * Создание новой транзакции
 * @param req Запрос Express
 * @param res Ответ Express
 */
export async function createTransaction(req: Request, res: Response) {
  try {
    const {
      userId,
      type,
      currency,
      amount,
      status,
      source,
      category,
      txHash,
      description,
      sourceUserId,
      walletAddress,
      data,
      updateBalance
    } = req.body;
    
    if (!userId || isNaN(parseInt(userId, 10))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }
    
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Transaction type is required'
      });
    }
    
    if (!currency || (currency !== Currency.UNI && currency !== Currency.TON)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency'
      });
    }
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }
    
    const transaction = await transactionService.createTransaction({
      userId: parseInt(userId, 10),
      type,
      currency,
      amount,
      status,
      source,
      category,
      txHash,
      description,
      sourceUserId: sourceUserId ? parseInt(sourceUserId, 10) : undefined,
      walletAddress,
      data,
      updateBalance
    });
    
    return res.status(201).json({
      success: true,
      data: { transaction }
    });
  } catch (error: any) {
    console.error('[TransactionController] Ошибка создания транзакции:', error);
    
    if (error.type === StorageErrorType.NOT_FOUND) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (error.type === StorageErrorType.VALIDATION) {
      return res.status(400).json({
        success: false,
        error: error.message || 'Invalid input data'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create transaction'
    });
  }
}