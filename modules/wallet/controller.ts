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

  async createDeposit(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен

      // Валидация параметров депозита
      const { amount, currency, type, wallet_address } = req.body;
      
      if (!amount || !currency || !type) {
        return this.sendError(res, 'Отсутствуют обязательные параметры: amount, currency, type', 400);
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