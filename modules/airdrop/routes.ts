import { Router } from 'express';
import { AirdropController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = Router();
const airdropController = new AirdropController();

// Airdrop registration route
router.post('/register', requireTelegramAuth, airdropController.registerForAirdrop.bind(airdropController));

export default router;