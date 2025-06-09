import { Router } from 'express';
import { FarmingController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = Router();
const farmingController = new FarmingController();

// Маршруты фарминга с обязательной авторизацией
router.get('/', requireTelegramAuth, farmingController.getFarmingData);
router.get('/info', farmingController.getFarmingInfo);
router.post('/start', requireTelegramAuth, farmingController.startFarming);

export default router;