import type { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { WalletService } from './service';
import { UserService } from '../user/service';
import { logger } from '../../core/logger';

const walletService = new WalletService();
const userService = new UserService();

export class WalletController extends BaseController {
  async getWalletData(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен

      // Автоматическая регистрация пользователя
      const user = await userService.getOrCreateUserFromTelegram({
        telegram_id: telegram.user.id,
        username: telegram.user.username,
        ref_code: req.query.start_param as string
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
  }

  async getTransactions(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!this.validateParams(req, ['userId'])) {
        return this.sendError(res, 'Отсутствует параметр userId', 400);
      }

      const userId = req.params.userId;
      const transactions = await walletService.getTransactionHistory(userId);
      
      this.sendSuccess(res, transactions);
    }, 'получения транзакций');
  }

  async withdraw(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      this.validateRequiredFields(req.body, ['userId', 'amount', 'type']);
      
      const { userId, amount, type } = req.body;
      const result = await walletService.processWithdrawal(userId, amount, type);
      
      this.sendSuccess(res, { processed: result });
    }, 'вывода средств');
  }
}