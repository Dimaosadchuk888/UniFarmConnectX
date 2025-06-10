import type { Request, Response } from 'express';
import { BaseController } from '@/core/BaseController';
import { WalletService } from './service';

const walletService = new WalletService();

export class WalletController extends BaseController {
  async getWalletData(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegramUser = this.getTelegramUser(req);

      const walletData = await walletService.getWalletDataByTelegramId(
        telegramUser.telegram_id.toString()
      );

      console.log('[Wallet] Данные кошелька для пользователя:', {
        telegram_id: telegramUser.telegram_id,
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