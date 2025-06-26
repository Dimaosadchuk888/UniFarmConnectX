import { Router } from 'express';
import { MissionsController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';
import { validateBody, validateParams } from '../../core/middleware/validate';
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

// Маршруты миссий с обязательной авторизацией и валидацией
router.get('/', requireTelegramAuth, missionsController.getActiveMissions.bind(missionsController)); // Main missions endpoint
router.get('/list', requireTelegramAuth, missionsController.getActiveMissions.bind(missionsController)); // List endpoint for API consistency
router.get('/active', requireTelegramAuth, missionsController.getActiveMissions.bind(missionsController));
router.post('/complete', requireTelegramAuth, validateBody(missionCompleteSchema), missionsController.completeMission.bind(missionsController));
router.post('/:missionId/complete', requireTelegramAuth, missionsController.completeMissionById.bind(missionsController));
router.post('/:missionId/claim', requireTelegramAuth, missionsController.claimMissionReward.bind(missionsController));
router.get('/stats', requireTelegramAuth, missionsController.getMissionStats.bind(missionsController));
router.get('/user/:userId', requireTelegramAuth, validateParams(userIdParamSchema), missionsController.getUserMissions.bind(missionsController));

export default router;