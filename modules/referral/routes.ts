import express from 'express';
import { ReferralController } from './controller';

const router = express.Router();
const referralController = new ReferralController();

// POST /api/referrals/process - Обработать реферальный код
router.post('/process', referralController.processReferralCode.bind(referralController));

// GET /api/referrals/validate/:refCode - Валидировать реферальный код (должен быть перед /:userId)
router.get('/validate/:refCode', referralController.validateReferralCode.bind(referralController));

// GET /api/referrals/:userId - Получить реферальную информацию пользователя
router.get('/:userId', referralController.getReferralInfo.bind(referralController));

// GET /api/referrals/:userId/list - Получить список рефералов пользователя
router.get('/:userId/list', referralController.getUserReferrals.bind(referralController));

// GET /api/referrals/:userId/earnings - Получить статистику доходов от рефералов
router.get('/:userId/earnings', referralController.getReferralEarnings.bind(referralController));

// GET /api/referrals/stats - Получить статистику реферальных уровней
router.get('/stats', referralController.getReferralLevelsStats.bind(referralController));

export default router;