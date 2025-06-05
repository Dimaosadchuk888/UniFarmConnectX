import { Router } from 'express';
import { FarmingController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = Router();
const farmingController = new FarmingController();

// Маршруты фарминга с обязательной авторизацией
router.get('/', requireTelegramAuth, farmingController.getFarmingData);
router.post('/start', requireTelegramAuth, farmingController.startFarming);
router.post('/claim', requireTelegramAuth, farmingController.claimRewards);

export default router;