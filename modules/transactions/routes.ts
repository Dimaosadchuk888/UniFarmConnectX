import { Router } from 'express';
import { TransactionsController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = Router();
const transactionsController = new TransactionsController();

// Маршруты транзакций с обязательной авторизацией
router.get('/', requireTelegramAuth, transactionsController.getTransactions.bind(transactionsController));

export default router;