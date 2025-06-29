import { Router } from 'express';
import { MissionsController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = Router();
const missionsController = new MissionsController();

// Маршруты миссий с обязательной авторизацией
router.get('/active', requireTelegramAuth, missionsController.getActiveMissions);
router.post('/complete', requireTelegramAuth, missionsController.completeMission);

export default router;