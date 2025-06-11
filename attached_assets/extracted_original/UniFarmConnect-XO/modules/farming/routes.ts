import { Router } from 'express';
import { FarmingController } from './controller';

const router = Router();
const farmingController = new FarmingController();

// Маршруты фарминга
router.get('/', farmingController.getFarmingData);

export default router;