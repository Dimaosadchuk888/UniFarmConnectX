import { Router } from 'express';
import { FarmingController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = Router();
const farmingController = new FarmingController();

// Маршруты фарминга с обязательной авторизацией
router.get('/', requireTelegramAuth, farmingController.getFarmingData.bind(farmingController));
router.get('/info', farmingController.getFarmingInfo.bind(farmingController));
router.get('/status', farmingController.getFarmingInfo.bind(farmingController)); // Alias for /info
router.post('/start', requireTelegramAuth, farmingController.startFarming.bind(farmingController));

export default router;