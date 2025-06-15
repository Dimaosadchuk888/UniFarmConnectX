import { Router } from 'express';
import { MissionsController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = Router();
const missionsController = new MissionsController();

// Маршруты миссий с обязательной авторизацией
router.get('/', requireTelegramAuth, missionsController.getActiveMissions.bind(missionsController)); // Main missions endpoint
router.get('/list', requireTelegramAuth, missionsController.getActiveMissions.bind(missionsController)); // List endpoint for API consistency
router.get('/active', requireTelegramAuth, missionsController.getActiveMissions.bind(missionsController));
router.post('/complete', requireTelegramAuth, missionsController.completeMission.bind(missionsController));
router.get('/stats', requireTelegramAuth, missionsController.getMissionStats.bind(missionsController));
router.get('/user/:userId', requireTelegramAuth, missionsController.getUserMissions.bind(missionsController));

export default router;