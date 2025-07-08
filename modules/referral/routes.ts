import express from 'express';
import { ReferralController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';
import { strictRateLimit, liberalRateLimit } from '../../core/middleware/rateLimiting';

const router = express.Router();
const referralController = new ReferralController();

// POST /api/referrals/process - Обработать реферальный код (строгий лимит для публичного endpoint)
router.post('/process', requireTelegramAuth, strictRateLimit, referralController.processReferralCode.bind(referralController));

// ПРИОРИТЕТНЫЕ РОУТЫ (должны быть перед /:userId)
// [SECURITY FIX] Удалены незащищенные тестовые маршруты /test-routing и /debug-stats

// GET /api/referrals/stats - Получить статистику реферальных уровней (строгий лимит для публичного endpoint)
router.get('/stats', requireTelegramAuth, strictRateLimit, referralController.getReferralLevelsStats.bind(referralController));

// GET /api/referrals/my-referrals - Получить список рефералов текущего пользователя
// ВРЕМЕННО ОТКЛЮЧЕН ДЛЯ ДИАГНОСТИКИ
// router.get('/my-referrals', requireTelegramAuth, async (req: any, res: any) => {
//   const userId = req.user?.id || req.telegramUser?.id;
//   if (!userId) {
//     return res.status(400).json({ success: false, error: 'Пользователь не найден' });
//   }
//   req.params.userId = userId.toString();
//   return referralController.getUserReferrals(req, res);
// });

// GET /api/referrals/levels - Получить статистику уровней (алиас для stats, строгий лимит)
router.get('/levels', requireTelegramAuth, strictRateLimit, referralController.getReferralLevelsStats.bind(referralController));

// GET /api/referrals/validate/:refCode - Валидировать реферальный код (строгий лимит для публичного endpoint)
router.get('/validate/:refCode', requireTelegramAuth, strictRateLimit, referralController.validateReferralCode.bind(referralController));

// POST /api/referrals/generate-code - Генерировать реферальный код (строгий лимит для публичного endpoint)
router.post('/generate-code', requireTelegramAuth, strictRateLimit, referralController.generateReferralCode.bind(referralController));

// WILDCARD ROUTES (ДОЛЖНЫ БЫТЬ В КОНЦЕ!)
// GET /api/referrals/:userId - Получить реферальную информацию пользователя
router.get('/:userId', requireTelegramAuth, referralController.getReferralInfo.bind(referralController));

// GET /api/referrals/:userId/list - Получить список рефералов пользователя
router.get('/:userId/list', requireTelegramAuth, referralController.getUserReferrals.bind(referralController));

// GET /api/referrals/:userId/earnings - Получить статистику доходов от рефералов
router.get('/:userId/earnings', requireTelegramAuth, referralController.getReferralEarnings.bind(referralController));

// GET /api/referrals/:userId/code - Получить реферальный код пользователя
router.get('/:userId/code', requireTelegramAuth, referralController.getUserReferralCode.bind(referralController));

export default router;