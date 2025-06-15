import { Router } from 'express';
import { FarmingController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';
import { requireAuth } from '../../core/middleware/auth';

const router = Router();
const farmingController = new FarmingController();

// Маршруты фарминга с обязательной авторизацией
router.get('/', requireTelegramAuth, farmingController.getFarmingData.bind(farmingController));
router.get('/data', requireTelegramAuth, farmingController.getFarmingInfo.bind(farmingController)); // Main data endpoint с авторизацией
router.get('/info', requireTelegramAuth, farmingController.getFarmingInfo.bind(farmingController));
router.get('/status', requireTelegramAuth, farmingController.getFarmingInfo.bind(farmingController)); // Alias for /info
router.post('/start', requireTelegramAuth, farmingController.startFarming.bind(farmingController));
router.get('/start', requireTelegramAuth, farmingController.getFarmingInfo.bind(farmingController)); // GET endpoint for start status
router.post('/claim', requireTelegramAuth, farmingController.claimFarming.bind(farmingController));

// UNI Farming specific routes
router.post('/deposit', requireTelegramAuth, farmingController.depositUni.bind(farmingController));
router.post('/harvest', requireTelegramAuth, farmingController.harvestUni.bind(farmingController));

// Farming history route
router.get('/history', requireTelegramAuth, farmingController.getFarmingHistory.bind(farmingController));

export default router;