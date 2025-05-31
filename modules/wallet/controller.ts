import type { Request, Response } from 'express';
import { WalletService } from './service';

const walletService = new WalletService();

export class WalletController {
  async getWalletData(req: Request, res: Response) {
    let pool: any;
    try {
      // Проверяем Telegram авторизацию
      const telegramUser = (req as any).telegram?.user;
      const isValidated = (req as any).telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App'
        });
      }

      const { Pool } = await import('pg');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });

      // Получаем данные кошелька из базы
      const walletQuery = `
        SELECT 
          uni_balance,
          ton_balance,
          total_earned,
          total_spent,
          created_at,
          last_transaction_date
        FROM users 
        WHERE telegram_id = $1
      `;
      
      const walletResult = await pool.query(walletQuery, [telegramUser.telegram_id]);
      
      let walletData = {
        uni_balance: 0,
        ton_balance: 0,
        total_earned: 0,
        total_spent: 0,
        transactions: []
      };

      if (walletResult.rows.length > 0) {
        const user = walletResult.rows[0];
        walletData = {
          uni_balance: parseFloat(user.uni_balance) || 0,
          ton_balance: parseFloat(user.ton_balance) || 0,
          total_earned: parseFloat(user.total_earned) || 0,
          total_spent: parseFloat(user.total_spent) || 0,
          transactions: []
        };
      }

      // Получаем последние транзакции
      const transactionsQuery = `
        SELECT 
          id,
          transaction_type,
          amount,
          currency,
          description,
          created_at,
          status
        FROM wallet_transactions 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 10
      `;
      
      const transactionsResult = await pool.query(transactionsQuery, [telegramUser.id]);
      
      if (transactionsResult.rows.length > 0) {
        walletData.transactions = transactionsResult.rows.map((tx: any) => ({
          id: tx.id,
          type: tx.transaction_type,
          amount: parseFloat(tx.amount),
          currency: tx.currency,
          description: tx.description,
          date: tx.created_at,
          status: tx.status
        }));
      }

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
    } finally {
      if (pool) {
        try {
          await pool.end();
        } catch (e: any) {
          console.error('[Wallet] Ошибка закрытия пула:', e.message);
        }
      }
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