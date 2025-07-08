import { Router } from 'express';
import { FarmingController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';
import { requireAuth } from '../../core/middleware/auth';
import { validateBody } from '../../core/middleware/validate';
import { strictRateLimit, standardRateLimit, liberalRateLimit, internalRateLimit } from '../../core/middleware/rateLimiting';
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

// Маршруты фарминга с обязательной авторизацией, валидацией и оптимизированным rate limiting
router.get('/', requireTelegramAuth, liberalRateLimit, farmingController.getFarmingData.bind(farmingController));
router.get('/data', requireTelegramAuth, liberalRateLimit, farmingController.getFarmingInfo.bind(farmingController)); // Main data endpoint с авторизацией
router.get('/info', requireTelegramAuth, liberalRateLimit, farmingController.getFarmingInfo.bind(farmingController));
router.get('/status', requireTelegramAuth, internalRateLimit, farmingController.getFarmingInfo.bind(farmingController)); // Используем internalRateLimit для частых обновлений статуса
router.post('/start', requireTelegramAuth, internalRateLimit, validateBody(farmingStartSchema), farmingController.startFarming.bind(farmingController));
router.get('/start', requireTelegramAuth, liberalRateLimit, farmingController.getFarmingInfo.bind(farmingController)); // GET endpoint for start status
router.post('/claim', requireTelegramAuth, internalRateLimit, farmingController.claimFarming.bind(farmingController));

// UNI Farming specific routes с валидацией депозитов (используем internalRateLimit для массовых операций)
router.post('/deposit', requireTelegramAuth, internalRateLimit, validateBody(farmingDepositSchema), farmingController.depositUni.bind(farmingController));
router.post('/harvest', requireTelegramAuth, internalRateLimit, farmingController.harvestUni.bind(farmingController));

// Farming history route
router.get('/history', requireTelegramAuth, liberalRateLimit, farmingController.getFarmingHistory.bind(farmingController));

export default router;