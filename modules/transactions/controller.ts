import type { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { WalletService } from '../wallet/service';

const walletService = new WalletService();

export class TransactionsController extends BaseController {
  async getTransactions(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен

      const { page = 1, limit = 20, currency } = req.query;
      
      // Используем wallet service для получения транзакций
      const result = await walletService.getTransactionHistory(
        telegram.user.id.toString(),
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
  }
}