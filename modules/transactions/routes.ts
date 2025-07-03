import { Router } from 'express';
import { TransactionsController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = Router();
const transactionsController = new TransactionsController();

// Маршруты транзакций с обязательной авторизацией
router.get('/', requireTelegramAuth, transactionsController.getTransactions.bind(transactionsController));
router.post('/recalculate-balance', requireTelegramAuth, transactionsController.recalculateBalance.bind(transactionsController));

// Тестовый endpoint для создания TON транзакции (диагностика UI)
router.post('/create-test', transactionsController.createTestTonTransaction.bind(transactionsController));

export default router;