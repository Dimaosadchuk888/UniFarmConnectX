import { Router } from 'express';
import { MissionsController } from './controller';

const router = Router();
const missionsController = new MissionsController();

// Маршруты миссий
router.get('/active', missionsController.getActiveMissions);

export default router;