import { Router } from 'express';
import { WalletController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = Router();
const walletController = new WalletController();

// Маршруты кошелька с обязательной авторизацией
router.get('/', requireTelegramAuth, walletController.getWalletData.bind(walletController));
router.get('/balance', requireTelegramAuth, walletController.getWalletData.bind(walletController)); // Alias
router.get('/:userId/transactions', requireTelegramAuth, walletController.getTransactions.bind(walletController));
router.post('/withdraw', requireTelegramAuth, walletController.withdraw.bind(walletController));

export default router;