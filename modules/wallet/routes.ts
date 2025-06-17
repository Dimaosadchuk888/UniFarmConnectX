import { Router } from 'express';
import { WalletController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';
import { validateBody, validateParams } from '../../core/middleware/validate';
import { strictRateLimit, liberalRateLimit } from '../../core/middleware/rateLimiting';
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

// Маршруты кошелька с обязательной авторизацией, валидацией и rate limiting
router.get('/', requireTelegramAuth, liberalRateLimit, walletController.getWalletData.bind(walletController));
router.get('/balance', requireTelegramAuth, liberalRateLimit, walletController.getWalletData.bind(walletController)); // Alias
router.get('/:userId/transactions', requireTelegramAuth, liberalRateLimit, validateParams(userIdSchema), walletController.getTransactions.bind(walletController));
router.post('/withdraw', requireTelegramAuth, strictRateLimit, validateBody(withdrawSchema), walletController.withdraw.bind(walletController));

export default router;