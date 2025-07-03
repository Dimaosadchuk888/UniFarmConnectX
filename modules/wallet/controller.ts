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
      this.validateRequiredFields(req.body, ['userId', 'amount', 'type']);
      
      const { userId, amount, type } = req.body;
      const result = await walletService.processWithdrawal(userId, amount, type);
      
      this.sendSuccess(res, { processed: result });
    }, 'вывода средств');
    } catch (error) {
      next(error);
    }
  }

  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
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
}