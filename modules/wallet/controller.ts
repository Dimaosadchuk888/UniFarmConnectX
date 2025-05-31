import type { Request, Response } from 'express';
import { WalletService } from './service';

const walletService = new WalletService();

export class WalletController {
  async getBalance(req: express.Request, res: express.Response) {
    try {
      const userId = req.params.userId;
      const balance = await walletService.getBalance(userId);
      res.json({ success: true, data: balance });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
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