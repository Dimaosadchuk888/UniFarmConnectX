import type { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../core/BaseController';
import { WalletService } from './service';
import { SupabaseUserRepository } from '../user/service';
import { logger } from '../../core/logger';

const walletService = new WalletService();
const userRepository = new SupabaseUserRepository();

export class WalletController extends BaseController {
  async getWalletData(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен

      // Автоматическая регистрация пользователя
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegram.user.id,
        username: telegram.user.username,
        first_name: telegram.user.first_name,
        ref_by: req.query.start_param as string
      });

      const walletData = await walletService.getWalletDataByTelegramId(
        telegram.user.id.toString()
      );

      logger.info('[Wallet] Данные кошелька для пользователя', {
        telegram_id: telegram.user.id,
        uni_balance: walletData.uni_balance,
        ton_balance: walletData.ton_balance,
        transactions_count: walletData.transactions.length
      });

      this.sendSuccess(res, walletData);
    }, 'получения данных кошелька');
    } catch (error) {
      next(error);
    }
  }

  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      if (!this.validateParams(req, ['userId'])) {
        return this.sendError(res, 'Отсутствует параметр userId', 400);
      }

      const userId = req.params.userId;
      const transactions = await walletService.getTransactionHistory(userId);
      
      this.sendSuccess(res, transactions);
    }, 'получения транзакций');
    } catch (error) {
      next(error);
    }
  }

  async withdraw(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;
      
      const { amount, currency, wallet_address } = req.body;
      
      // Автоматическая регистрация пользователя если нужно
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegram.user.id,
        username: telegram.user.username,
        first_name: telegram.user.first_name
      });
      
      if (!user) {
        return this.sendError(res, 'Не удалось создать или найти пользователя', 500);
      }
      
      const result = await walletService.processWithdrawal(
        user.id.toString(), 
        amount, 
        currency as 'UNI' | 'TON',
        wallet_address
      );
      
      if (typeof result === 'object' && result.success === false) {
        return this.sendError(res, result.error, 400);
      }
      
      if (!result) {
        return this.sendError(res, 'Не удалось обработать вывод средств', 400);
      }
      
      this.sendSuccess(res, { 
        success: true,
        message: `Заявка на вывод ${amount} ${currency} создана успешно` 
      });
    }, 'вывода средств');
    } catch (error) {
      next(error);
    }
  }

  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      // Проверяем JWT авторизацию
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен

      const userId = req.query.user_id as string;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'Отсутствует параметр user_id'
        });
      }

      // Получаем данные пользователя напрямую из базы
      const user = await userRepository.getUserById(parseInt(userId));
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден'
        });
      }

      const balanceData = {
        uniBalance: parseFloat(user.balance_uni?.toString() || "0"),
        tonBalance: parseFloat(user.balance_ton?.toString() || "0"),
        uniFarmingActive: user.uni_farming_active || false,
        uniDepositAmount: parseFloat(user.uni_deposit_amount?.toString() || "0"),
        uniFarmingBalance: parseFloat(user.uni_farming_balance?.toString() || "0")
      };

      logger.info('[Wallet] Баланс пользователя получен', {
        user_id: userId,
        uniBalance: balanceData.uniBalance,
        tonBalance: balanceData.tonBalance
      });

      return res.status(200).json({
        success: true,
        data: balanceData
      });
    } catch (error) {
      logger.error('[Wallet] Ошибка получения баланса', { error });
      return res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }

  async createDeposit(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен

      // Валидация параметров депозита
      const { amount, currency, type = 'manual', wallet_address } = req.body;
      
      if (!amount || !currency) {
        return this.sendError(res, 'Отсутствуют обязательные параметры: amount, currency', 400);
      }

      if (currency !== 'UNI' && currency !== 'TON') {
        return this.sendError(res, 'Поддерживаемые валюты: UNI, TON', 400);
      }

      if (amount <= 0) {
        return this.sendError(res, 'Сумма депозита должна быть больше 0', 400);
      }

      // Автоматическая регистрация пользователя
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegram.user.id,
        username: telegram.user.username,
        first_name: telegram.user.first_name,
        ref_by: req.query.start_param as string
      });

      if (!user) {
        return this.sendError(res, 'Не удалось создать или найти пользователя', 500);
      }

      // Создание депозита
      const depositResult = await walletService.createDeposit({
        user_id: user.id,
        telegram_id: telegram.user.id,
        amount: parseFloat(amount),
        currency: currency as 'UNI' | 'TON',
        deposit_type: type,
        wallet_address: wallet_address || null
      });

      logger.info('[Wallet] Депозит создан', {
        telegram_id: telegram.user.id,
        amount: amount,
        currency: currency,
        type: type,
        transaction_id: depositResult.transaction_id
      });

      this.sendSuccess(res, {
        message: `Депозит ${amount} ${currency} успешно создан`,
        transaction_id: depositResult.transaction_id,
        amount: amount,
        currency: currency,
        status: 'pending'
      });
    }, 'создания депозита');
    } catch (error) {
      next(error);
    }
  }

  async getTransactionsList(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        const telegram = this.validateTelegramAuth(req, res);
        if (!telegram) return;

        const user = await userRepository.getUserByTelegramId(telegram.user.id);
        if (!user) {
          return this.sendError(res, 'Пользователь не найден', 404);
        }

        const { page = 1, limit = 20 } = req.query;
        const transactions = await walletService.getTransactionHistory(
          user.id.toString(),
          parseInt(page as string),
          parseInt(limit as string)
        );

        this.sendSuccess(res, transactions);
      }, 'получения истории транзакций');
    } catch (error) {
      next(error);
    }
  }

  async saveTonAddress(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        const telegram = this.validateTelegramAuth(req, res);
        if (!telegram) return;

        const { address } = req.body;

        if (!address || typeof address !== 'string') {
          return this.sendError(res, 'Некорректный адрес кошелька', 400);
        }

        const user = await userRepository.getUserByTelegramId(telegram.user.id);
        if (!user) {
          return this.sendError(res, 'Пользователь не найден', 404);
        }

        // Обновляем адрес в базе данных
        const { error } = await supabase
          .from('users')
          .update({
            ton_wallet_address: address,
            ton_wallet_verified: true,
            ton_wallet_linked_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          logger.error('[WalletController] Ошибка сохранения TON адреса', {
            userId: user.id,
            error: error.message
          });
          return this.sendError(res, 'Ошибка сохранения адреса', 500);
        }

        logger.info('[WalletController] TON адрес успешно сохранен', {
          userId: user.id,
          address: address.slice(0, 10) + '...' + address.slice(-10)
        });

        this.sendSuccess(res, {
          message: 'TON адрес успешно сохранен',
          address: address
        });
      }, 'сохранения TON адреса');
    } catch (error) {
      next(error);
    }
  }

  async transfer(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        const telegram = this.validateTelegramAuth(req, res);
        if (!telegram) return;

        const { to_user_id, amount, currency } = req.body;

        const fromUser = await userRepository.getUserByTelegramId(telegram.user.id);
        if (!fromUser) {
          return this.sendError(res, 'Пользователь-отправитель не найден', 404);
        }

        const toUser = await userRepository.getUserById(parseInt(to_user_id));
        if (!toUser) {
          return this.sendError(res, 'Пользователь-получатель не найден', 404);
        }

        const result = await walletService.transferFunds({
          from_user_id: fromUser.id,
          to_user_id: parseInt(to_user_id),
          amount: parseFloat(amount),
          currency: currency as 'UNI' | 'TON'
        });

        if (!result.success) {
          return this.sendError(res, result.error || 'Ошибка перевода', 400);
        }

        this.sendSuccess(res, {
          message: `Перевод ${amount} ${currency} успешно выполнен`,
          transaction_id: result.transaction_id,
          from_balance: result.from_balance,
          to_balance: result.to_balance
        });
      }, 'перевода средств');
    } catch (error) {
      next(error);
    }
  }

  async depositInternal(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        // Внутренний депозит может использоваться системой для начисления бонусов, комиссий и т.д.
        const { user_id, amount, currency, type, description } = req.body;

        if (!user_id || !amount || !currency) {
          return this.sendError(res, 'Отсутствуют обязательные параметры: user_id, amount, currency', 400);
        }

        if (currency !== 'UNI' && currency !== 'TON') {
          return this.sendError(res, 'Поддерживаемые валюты: UNI, TON', 400);
        }

        if (parseFloat(amount) <= 0) {
          return this.sendError(res, 'Сумма должна быть больше 0', 400);
        }

        // Проверяем существование пользователя
        const user = await userRepository.getUserById(parseInt(user_id));
        if (!user) {
          return this.sendError(res, 'Пользователь не найден', 404);
        }

        // Создаем внутренний депозит
        const result = await walletService.createInternalDeposit({
          user_id: parseInt(user_id),
          amount: parseFloat(amount),
          currency: currency as 'UNI' | 'TON',
          type: type || 'internal_credit',
          description: description || 'Внутреннее начисление'
        });

        if (!result.success) {
          return this.sendError(res, result.error || 'Ошибка создания депозита', 400);
        }

        logger.info('[Wallet] Внутренний депозит создан', {
          user_id,
          amount,
          currency,
          type,
          transaction_id: result.transaction_id
        });

        this.sendSuccess(res, {
          message: `Внутренний депозит ${amount} ${currency} успешно создан`,
          transaction_id: result.transaction_id,
          new_balance: result.new_balance
        });
      }, 'создания внутреннего депозита');
    } catch (error) {
      next(error);
    }
  }

  async withdrawInternal(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        // Внутреннее списание может использоваться для комиссий, штрафов и т.д.
        const { user_id, amount, currency, type, description } = req.body;

        if (!user_id || !amount || !currency) {
          return this.sendError(res, 'Отсутствуют обязательные параметры: user_id, amount, currency', 400);
        }

        if (currency !== 'UNI' && currency !== 'TON') {
          return this.sendError(res, 'Поддерживаемые валюты: UNI, TON', 400);
        }

        if (parseFloat(amount) <= 0) {
          return this.sendError(res, 'Сумма должна быть больше 0', 400);
        }

        // Проверяем существование пользователя
        const user = await userRepository.getUserById(parseInt(user_id));
        if (!user) {
          return this.sendError(res, 'Пользователь не найден', 404);
        }

        // Проверяем достаточность средств
        const balance = currency === 'UNI' ? user.balance_uni : user.balance_ton;
        if (parseFloat(balance?.toString() || '0') < parseFloat(amount)) {
          return this.sendError(res, 'Недостаточно средств на балансе', 400);
        }

        // Создаем внутреннее списание
        const result = await walletService.createInternalWithdrawal({
          user_id: parseInt(user_id),
          amount: parseFloat(amount),
          currency: currency as 'UNI' | 'TON',
          type: type || 'internal_debit',
          description: description || 'Внутреннее списание'
        });

        if (!result.success) {
          return this.sendError(res, result.error || 'Ошибка создания списания', 400);
        }

        logger.info('[Wallet] Внутреннее списание создано', {
          user_id,
          amount,
          currency,
          type,
          transaction_id: result.transaction_id
        });

        this.sendSuccess(res, {
          message: `Внутреннее списание ${amount} ${currency} успешно выполнено`,
          transaction_id: result.transaction_id,
          new_balance: result.new_balance
        });
      }, 'создания внутреннего списания');
    } catch (error) {
      next(error);
    }
  }
}