import { Router } from 'express';
import { WalletController } from './controller';

const router = Router();
const walletController = new WalletController();

// Маршруты кошелька
router.get('/', walletController.getWalletData);
router.get('/:userId/transactions', walletController.getTransactions);
router.post('/withdraw', walletController.withdraw);

export default router;