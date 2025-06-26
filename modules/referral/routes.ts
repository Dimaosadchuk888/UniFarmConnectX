import express from 'express';
import { ReferralController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = express.Router();
const referralController = new ReferralController();

// POST /api/referrals/process - Обработать реферальный код
router.post('/process', requireTelegramAuth, referralController.processReferralCode.bind(referralController));

// GET /api/referrals/validate/:refCode - Валидировать реферальный код (должен быть перед /:userId)
router.get('/validate/:refCode', requireTelegramAuth, referralController.validateReferralCode.bind(referralController));

// GET /api/referrals/:userId - Получить реферальную информацию пользователя
router.get('/:userId', requireTelegramAuth, referralController.getReferralInfo.bind(referralController));

// GET /api/referrals/:userId/list - Получить список рефералов пользователя
router.get('/:userId/list', requireTelegramAuth, referralController.getUserReferrals.bind(referralController));

// GET /api/referrals/:userId/earnings - Получить статистику доходов от рефералов
router.get('/:userId/earnings', requireTelegramAuth, referralController.getReferralEarnings.bind(referralController));

// GET /api/referrals/stats - Получить статистику реферальных уровней  
router.get('/stats', requireTelegramAuth, referralController.getReferralLevelsStats.bind(referralController));

// GET /api/referrals/:userId/code - Получить реферальный код пользователя
router.get('/:userId/code', requireTelegramAuth, referralController.getUserReferralCode.bind(referralController));

// GET /api/referrals/levels - Получить статистику уровней (алиас для stats)
router.get('/levels', requireTelegramAuth, referralController.getReferralLevelsStats.bind(referralController));

export default router;