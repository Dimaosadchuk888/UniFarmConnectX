import { Router } from 'express';
import { TonFarmingController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = Router();
const tonFarmingController = new TonFarmingController();

// TON Farming маршруты с обязательной авторизацией
router.get('/', requireTelegramAuth, tonFarmingController.getTonFarmingData.bind(tonFarmingController));
router.get('/data', requireTelegramAuth, tonFarmingController.getTonFarmingData.bind(tonFarmingController));
router.get('/info', requireTelegramAuth, tonFarmingController.getTonFarmingData.bind(tonFarmingController));
router.get('/status', requireTelegramAuth, tonFarmingController.getTonFarmingStatus.bind(tonFarmingController));
router.post('/start', requireTelegramAuth, tonFarmingController.startTonFarming.bind(tonFarmingController));
router.post('/claim', requireTelegramAuth, tonFarmingController.claimTonFarming.bind(tonFarmingController));

export default router;