import { Router } from 'express';
import { WalletController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';
import { validateBody, validateParams } from '../../core/middleware/validate';
import { strictRateLimit, liberalRateLimit } from '../../core/middleware/rateLimiting';
import { getDirectBalance } from './directBalanceHandler';
import { z } from 'zod';

const router = Router();
const walletController = new WalletController();

// Валидационные схемы для wallet операций
const withdrawSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid amount format').refine(
    (val) => parseFloat(val) > 0, 
    'Amount must be greater than 0'
  ),
  currency: z.enum(['UNI', 'TON'], { errorMap: () => ({ message: 'Currency must be UNI or TON' }) }),
  wallet_address: z.string().min(10, 'Invalid wallet address').max(100, 'Wallet address too long')
});

const userIdSchema = z.object({
  userId: z.string().regex(/^\d+$/, 'User ID must be numeric')
});

const depositSchema = z.object({
  amount: z.number().min(0.001, 'Minimum deposit amount is 0.001'),
  currency: z.enum(['UNI', 'TON'], { errorMap: () => ({ message: 'Currency must be UNI or TON' }) }),
  type: z.string().min(1, 'Deposit type is required'),
  wallet_address: z.string().optional()
});

// Простой обработчик для получения баланса по user_id без авторизации
router.get('/balance', getDirectBalance);

// Маршруты кошелька с обязательной авторизацией, валидацией и rate limiting
router.get('/', requireTelegramAuth, liberalRateLimit, walletController.getWalletData.bind(walletController));
router.get('/data', requireTelegramAuth, liberalRateLimit, walletController.getWalletData.bind(walletController)); // Alias для Telegram авторизации
router.get('/:userId/transactions', requireTelegramAuth, liberalRateLimit, validateParams(userIdSchema), walletController.getTransactions.bind(walletController));
router.post('/deposit', requireTelegramAuth, strictRateLimit, validateBody(depositSchema), walletController.createDeposit.bind(walletController));
router.post('/withdraw', requireTelegramAuth, strictRateLimit, validateBody(withdrawSchema), walletController.withdraw.bind(walletController));

export default router;