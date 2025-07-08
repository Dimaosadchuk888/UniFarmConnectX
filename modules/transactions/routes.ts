import { Router } from 'express';
import { TransactionsController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';
import { internalRateLimit, liberalRateLimit } from '../../core/middleware/rateLimiting';

const router = Router();
const transactionsController = new TransactionsController();

// Маршруты транзакций с обязательной авторизацией и специальным rate limiting для внутренних API
router.get('/', requireTelegramAuth, internalRateLimit, transactionsController.getTransactions.bind(transactionsController));
router.post('/recalculate-balance', requireTelegramAuth, internalRateLimit, transactionsController.recalculateBalance.bind(transactionsController));

// Тестовый endpoint для создания TON транзакции (диагностика UI) - либеральный лимит
router.post('/create-test', liberalRateLimit, transactionsController.createTestTonTransaction.bind(transactionsController));

export default router;