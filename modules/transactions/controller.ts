import type { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../core/BaseController';
import { WalletService } from '../wallet/service';
import { SupabaseUserRepository } from '../index';
import { TransactionsService } from './service';

const walletService = new WalletService();
const transactionsService = new TransactionsService();

export class TransactionsController extends BaseController {
  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен

      const { page = 1, limit = 20, currency } = req.query;
      
      // Сначала получаем пользователя по telegram_id
      const userRepository = new SupabaseUserRepository();
      const user = await userRepository.getUserByTelegramId(telegram.user.id);
      
      if (!user) {
        return this.sendError(res, 'Пользователь не найден', 404);
      }
      
      // Используем wallet service для получения транзакций по database user id
      const result = await walletService.getTransactionHistory(
        user.id.toString(), // Use database user ID
        parseInt(page as string),
        parseInt(limit as string)
      );
      
      // Фильтрация по валюте если указана
      const filteredTransactions = currency && currency !== 'ALL' 
        ? result.transactions.filter((tx: any) => tx.currency === currency)
        : result.transactions;
      
      this.sendSuccess(res, {
        transactions: filteredTransactions,
        total: result.total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(result.total / parseInt(limit as string)),
        hasMore: result.hasMore
      });
    }, 'получения транзакций');
    } catch (error) {
      next(error);
    }
  }

  async recalculateBalance(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        const telegram = this.validateTelegramAuth(req, res);
        if (!telegram) return; // 401 уже отправлен

        // Получаем пользователя по telegram_id
        const userRepository = new SupabaseUserRepository();
        const user = await userRepository.getUserByTelegramId(telegram.user.id);
        
        if (!user) {
          return this.sendError(res, 'Пользователь не найден', 404);
        }

        // Пересчитываем баланс
        const newBalance = await transactionsService.recalculateUserBalance(user.id);
        
        this.sendSuccess(res, {
          message: 'Баланс успешно пересчитан',
          balance: newBalance
        });
      }, 'пересчёта баланса');
    } catch (error) {
      next(error);
    }
  }
}