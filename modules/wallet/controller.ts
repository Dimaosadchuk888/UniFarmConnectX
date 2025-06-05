import type { Request, Response } from 'express';
import { WalletService } from './service';

const walletService = new WalletService();

export class WalletController {
  async getWalletData(req: Request, res: Response) {
    try {
      // Telegram пользователь уже проверен middleware
      const telegramUser = (req as any).telegramUser;

      // Используем сервис для получения данных кошелька
      const walletData = await walletService.getWalletDataByTelegramId(
        telegramUser.telegram_id.toString()
      );

      console.log('[Wallet] Данные кошелька для пользователя:', {
        telegram_id: telegramUser.telegram_id,
        uni_balance: walletData.uni_balance,
        ton_balance: walletData.ton_balance,
        transactions_count: walletData.transactions.length
      });

      res.json({
        success: true,
        data: walletData
      });

    } catch (error: any) {
      console.error('[Wallet] Ошибка получения данных кошелька:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения данных кошелька',
        details: error.message
      });
    }
  }

  async getTransactions(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      const transactions = await walletService.getTransactionHistory(userId);
      res.json({ success: true, data: transactions });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  async withdraw(req: Request, res: Response) {
    try {
      const { userId, amount, type } = req.body;
      const result = await walletService.processWithdrawal(userId, amount, type);
      res.json({ success: result, data: { processed: result } });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
}