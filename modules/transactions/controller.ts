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
      
      // Используем transactions service для получения транзакций по database user id
      const result = await transactionsService.getTransactionHistory(
        user.id.toString(), // Use database user ID
        parseInt(page as string),
        parseInt(limit as string),
        currency as string
      );
      
      this.sendSuccess(res, {
        transactions: result.transactions,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
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

  /**
   * Создать тестовую TON транзакцию для диагностики UI
   */
  async createTestTonTransaction(req: Request, res: Response) {
    try {
      const { user_id, type, amount_ton, description } = req.body;

      if (!user_id || !amount_ton) {
        return this.sendError(res, 'Отсутствуют обязательные поля: user_id, amount_ton', 400);
      }

      // Используем UnifiedTransactionService для создания
      const { transactionService } = await import('../../core/TransactionService');
      
      const result = await transactionService.createTransaction({
        user_id: parseInt(user_id),
        type: type || 'TON_BOOST_INCOME',
        amount_uni: 0,
        amount_ton: parseFloat(amount_ton),
        description: description || 'Тестовая TON транзакция для проверки UI'
      });

      if (result.success) {
        this.sendSuccess(res, {
          message: 'Тестовая TON транзакция создана',
          transaction_id: result.transaction_id
        });
      } else {
        this.sendError(res, result.error || 'Ошибка создания транзакции', 500);
      }

    } catch (error) {
      this.handleControllerError(error, res, 'создания тестовой TON транзакции');
    }
  }

  /**
   * Получение истории транзакций пользователя
   */
  async getTransactionHistory(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        const telegram = this.validateTelegramAuth(req, res);
        if (!telegram) return;

        const { page = 1, limit = 20, type } = req.query;
        
        const userRepository = new SupabaseUserRepository();
        const user = await userRepository.getUserByTelegramId(telegram.user.id);
        
        if (!user) {
          return this.sendError(res, 'Пользователь не найден', 404);
        }
        
        const result = await transactionsService.getTransactionHistory(
          user.id.toString(),
          parseInt(page as string),
          parseInt(limit as string),
          type as string
        );

        this.sendSuccess(res, result);
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получение истории изменений баланса
   */
  async getBalanceHistory(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        const telegram = this.validateTelegramAuth(req, res);
        if (!telegram) return;

        const userRepository = new SupabaseUserRepository();
        const user = await userRepository.getUserByTelegramId(telegram.user.id);
        
        if (!user) {
          return this.sendError(res, 'Пользователь не найден', 404);
        }
        
        this.sendSuccess(res, {
          current_balance: {
            uni: user.balance_uni,
            ton: user.balance_ton
          },
          last_updated: new Date().toISOString()
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Создание новой транзакции
   */
  async createTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        const telegram = this.validateTelegramAuth(req, res);
        if (!telegram) return;

        const { type, amount_uni, amount_ton, description } = req.body;
        
        if (!type || (!amount_uni && !amount_ton)) {
          return this.sendError(res, 'Тип транзакции и сумма обязательны', 400);
        }

        const userRepository = new SupabaseUserRepository();
        const user = await userRepository.getUserByTelegramId(telegram.user.id);
        
        if (!user) {
          return this.sendError(res, 'Пользователь не найден', 404);
        }

        const result = await transactionsService.createTransaction({
          user_id: user.id,
          type,
          amount_uni: amount_uni || '0',
          amount_ton: amount_ton || '0',
          description: description || ''
        });

        this.sendSuccess(res, result);
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получение статистики транзакций
   */
  async getTransactionStats(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        const telegram = this.validateTelegramAuth(req, res);
        if (!telegram) return;

        const userRepository = new SupabaseUserRepository();
        const user = await userRepository.getUserByTelegramId(telegram.user.id);
        
        if (!user) {
          return this.sendError(res, 'Пользователь не найден', 404);
        }

        const stats = await transactionsService.getTransactionStats(user.id);
        this.sendSuccess(res, stats);
      });
    } catch (error) {
      next(error);
    }
  }
}