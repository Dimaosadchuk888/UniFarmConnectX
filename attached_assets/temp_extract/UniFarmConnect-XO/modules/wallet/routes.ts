import { Router } from 'express';
import { WalletController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = Router();
const walletController = new WalletController();

// Маршруты кошелька с обязательной авторизацией
router.get('/', requireTelegramAuth, walletController.getWalletData);
router.get('/:userId/transactions', requireTelegramAuth, walletController.getTransactions);
router.post('/withdraw', requireTelegramAuth, walletController.withdraw);

export default router;