import { Router } from 'express';
import { TransactionsController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';
import { massOperationsRateLimit, liberalRateLimit } from '../../core/middleware/rateLimiting';

const router = Router();
const transactionsController = new TransactionsController();

// Health check endpoint для проверки работы модуля
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    module: 'transactions',
    timestamp: new Date().toISOString()
  });
});

// Маршруты транзакций с обязательной авторизацией и специальным rate limiting для массовых операций
router.get('/', requireTelegramAuth, massOperationsRateLimit, transactionsController.getTransactions.bind(transactionsController));
router.get('/history', requireTelegramAuth, liberalRateLimit, transactionsController.getTransactionHistory.bind(transactionsController));
router.get('/balance', requireTelegramAuth, liberalRateLimit, transactionsController.getBalanceHistory.bind(transactionsController));
router.post('/recalculate-balance', requireTelegramAuth, massOperationsRateLimit, transactionsController.recalculateBalance.bind(transactionsController));
router.post('/create', requireTelegramAuth, massOperationsRateLimit, transactionsController.createTransaction.bind(transactionsController));
router.get('/stats', requireTelegramAuth, liberalRateLimit, transactionsController.getTransactionStats.bind(transactionsController));

// Тестовый endpoint для создания TON транзакции (диагностика UI) - либеральный лимит
router.post('/create-test', liberalRateLimit, transactionsController.createTestTonTransaction.bind(transactionsController));

export default router;