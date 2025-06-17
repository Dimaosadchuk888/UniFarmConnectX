import { Router } from 'express';
import { FarmingController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';
import { requireAuth } from '../../core/middleware/auth';
import { validateBody } from '../../core/middleware/validate';
import { z } from 'zod';

const router = Router();
const farmingController = new FarmingController();

// Валидационные схемы для farming операций
const farmingDepositSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid amount format').refine(
    (val) => parseFloat(val) >= 0.1,
    'Minimum deposit amount is 0.1 UNI'
  ).refine(
    (val) => parseFloat(val) <= 1000000,
    'Maximum deposit amount is 1,000,000 UNI'
  )
});

const farmingStartSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid amount format').refine(
    (val) => parseFloat(val) > 0,
    'Amount must be greater than 0'
  ).optional()
});

// Маршруты фарминга с обязательной авторизацией и валидацией
router.get('/', requireTelegramAuth, farmingController.getFarmingData.bind(farmingController));
router.get('/data', requireTelegramAuth, farmingController.getFarmingInfo.bind(farmingController)); // Main data endpoint с авторизацией
router.get('/info', requireTelegramAuth, farmingController.getFarmingInfo.bind(farmingController));
router.get('/status', requireTelegramAuth, farmingController.getFarmingInfo.bind(farmingController)); // Alias for /info
router.post('/start', requireTelegramAuth, validateBody(farmingStartSchema), farmingController.startFarming.bind(farmingController));
router.get('/start', requireTelegramAuth, farmingController.getFarmingInfo.bind(farmingController)); // GET endpoint for start status
router.post('/claim', requireTelegramAuth, farmingController.claimFarming.bind(farmingController));

// UNI Farming specific routes с валидацией депозитов
router.post('/deposit', requireTelegramAuth, validateBody(farmingDepositSchema), farmingController.depositUni.bind(farmingController));
router.post('/harvest', requireTelegramAuth, farmingController.harvestUni.bind(farmingController));

// Farming history route
router.get('/history', requireTelegramAuth, farmingController.getFarmingHistory.bind(farmingController));

export default router;