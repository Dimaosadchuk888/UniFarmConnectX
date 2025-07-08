import { Router } from 'express';
import { MissionsController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';
import { validateBody, validateParams } from '../../core/middleware/validate';
import { massOperationsRateLimit, strictRateLimit } from '../../core/middleware/rateLimiting';
import { z } from 'zod';

const router = Router();
const missionsController = new MissionsController();

// Валидационные схемы для missions операций
const missionCompleteSchema = z.object({
  missionId: z.number().int().positive('Mission ID must be positive integer'),
  verification_data: z.object({
    social_link: z.string().url('Invalid social link URL').optional(),
    screenshot_url: z.string().url('Invalid screenshot URL').optional(),
    completion_proof: z.string().min(1).max(500, 'Completion proof too long').optional()
  }).optional()
});

const userIdParamSchema = z.object({
  userId: z.string().regex(/^\d+$/, 'User ID must be numeric')
});

// Маршруты миссий с обязательной авторизацией, валидацией и rate limiting
router.get('/', requireTelegramAuth, massOperationsRateLimit, missionsController.getActiveMissions.bind(missionsController)); // Main missions endpoint
router.get('/list', requireTelegramAuth, massOperationsRateLimit, missionsController.getActiveMissions.bind(missionsController)); // List endpoint for API consistency  
router.get('/active', requireTelegramAuth, massOperationsRateLimit, missionsController.getActiveMissions.bind(missionsController));
router.post('/complete', requireTelegramAuth, strictRateLimit, validateBody(missionCompleteSchema), missionsController.completeMission.bind(missionsController));
router.post('/:missionId/complete', requireTelegramAuth, strictRateLimit, missionsController.completeMissionById.bind(missionsController));
router.post('/:missionId/claim', requireTelegramAuth, strictRateLimit, missionsController.claimMissionReward.bind(missionsController));
router.get('/stats', requireTelegramAuth, massOperationsRateLimit, missionsController.getMissionStats.bind(missionsController));
router.get('/user/:userId', requireTelegramAuth, massOperationsRateLimit, validateParams(userIdParamSchema), missionsController.getUserMissions.bind(missionsController));

export default router;