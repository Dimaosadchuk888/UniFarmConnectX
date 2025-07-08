import { Router } from 'express';
import { AirdropController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = Router();
const airdropController = new AirdropController();

// Airdrop registration route
router.post('/register', requireTelegramAuth, airdropController.registerForAirdrop.bind(airdropController));

// GET /api/v2/airdrop/active - Активные airdrop кампании
router.get('/active', requireTelegramAuth, airdropController.getActiveAirdrops.bind(airdropController));

// POST /api/v2/airdrop/claim - Получение airdrop
router.post('/claim', requireTelegramAuth, airdropController.claimAirdrop.bind(airdropController));

// GET /api/v2/airdrop/history - История airdrop
router.get('/history', requireTelegramAuth, airdropController.getAirdropHistory.bind(airdropController));

// GET /api/v2/airdrop/eligibility - Проверка права на airdrop
router.get('/eligibility', requireTelegramAuth, airdropController.checkEligibility.bind(airdropController));

export default router;