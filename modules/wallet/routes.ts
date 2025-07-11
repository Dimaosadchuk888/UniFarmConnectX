import { Router } from 'express';
import { WalletController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';
import { validateBody, validateParams } from '../../core/middleware/validate';
import { strictRateLimit, liberalRateLimit, massOperationsRateLimit } from '../../core/middleware/rateLimiting';
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
}).refine(
  (data) => {
    // Проверка минимальной суммы для TON
    if (data.currency === 'TON') {
      const amount = parseFloat(data.amount);
      return amount >= 1;
    }
    return true;
  },
  {
    message: 'Минимальная сумма вывода — 1 TON',
    path: ['amount']
  }
);

const userIdSchema = z.object({
  userId: z.string().regex(/^\d+$/, 'User ID must be numeric')
});

const depositSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid amount format').refine(
    (val) => parseFloat(val) >= 0.001, 
    'Minimum deposit amount is 0.001'
  ),
  currency: z.enum(['UNI', 'TON'], { errorMap: () => ({ message: 'Currency must be UNI or TON' }) }),
  type: z.string().min(1, 'Deposit type is required'),
  wallet_address: z.string().optional()
});

const transferSchema = z.object({
  to_user_id: z.string().regex(/^\d+$/, 'User ID must be numeric'),
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid amount format').refine(
    (val) => parseFloat(val) > 0,
    'Amount must be greater than 0'
  ),
  currency: z.enum(['UNI', 'TON'], { errorMap: () => ({ message: 'Currency must be UNI or TON' }) })
});

// Простой обработчик для получения баланса по user_id - используем massOperationsRateLimit для частых обновлений
router.get('/balance', massOperationsRateLimit, getDirectBalance);

// Маршруты кошелька с обязательной авторизацией, валидацией и оптимизированным rate limiting
router.get('/', requireTelegramAuth, liberalRateLimit, walletController.getWalletData.bind(walletController));
router.get('/data', requireTelegramAuth, liberalRateLimit, walletController.getWalletData.bind(walletController)); // Alias для Telegram авторизации
router.get('/transactions', requireTelegramAuth, liberalRateLimit, walletController.getTransactionsList.bind(walletController)); // История транзакций текущего пользователя
router.get('/:userId/transactions', requireTelegramAuth, massOperationsRateLimit, validateParams(userIdSchema), walletController.getTransactions.bind(walletController));
router.post('/deposit', requireTelegramAuth, massOperationsRateLimit, validateBody(depositSchema), walletController.createDeposit.bind(walletController));
router.post('/withdraw', requireTelegramAuth, strictRateLimit, validateBody(withdrawSchema), walletController.withdraw.bind(walletController)); // Оставляем строгий лимит для выводов
router.post('/transfer', requireTelegramAuth, strictRateLimit, validateBody(transferSchema), walletController.transfer.bind(walletController)); // Внутренние переводы
router.post('/save-ton-address', requireTelegramAuth, strictRateLimit, walletController.saveTonAddress.bind(walletController)); // Сохранение TON адреса
router.post('/connect-ton', requireTelegramAuth, strictRateLimit, walletController.connectTonWallet.bind(walletController)); // Подключение TON кошелька

// Внутренние системные endpoints (для использования другими модулями)
// Эти endpoints предназначены для внутренних операций системы и требуют специальной авторизации
router.post('/deposit-internal', requireTelegramAuth, massOperationsRateLimit, walletController.depositInternal.bind(walletController));
router.post('/withdraw-internal', requireTelegramAuth, massOperationsRateLimit, walletController.withdrawInternal.bind(walletController));

export default router;