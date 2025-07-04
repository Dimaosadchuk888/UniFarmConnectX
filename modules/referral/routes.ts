import express from 'express';
import { ReferralController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = express.Router();
const referralController = new ReferralController();

// POST /api/referrals/process - Обработать реферальный код
router.post('/process', requireTelegramAuth, referralController.processReferralCode.bind(referralController));

// ПРИОРИТЕТНЫЕ РОУТЫ (должны быть перед /:userId)
// ТЕСТОВЫЙ endpoint для проверки роутинга
router.get('/test-routing', (req, res) => {
  console.log('[REFERRAL ROUTES] TEST ROUTING WORKS!');
  res.json({ success: true, message: 'Referral routing is working', timestamp: Date.now() });
});

// GET /api/referrals/debug-stats - ВРЕМЕННЫЙ endpoint без авторизации для диагностики
router.get('/debug-stats', (req, res) => {
  console.log('[REFERRAL ROUTES] DEBUG-STATS ROUTE HIT!');
  referralController.getReferralLevelsStats(req, res);
});

// GET /api/referrals/stats - Получить статистику реферальных уровней  
router.get('/stats', requireTelegramAuth, referralController.getReferralLevelsStats.bind(referralController));

// GET /api/referrals/my-referrals - Получить список рефералов текущего пользователя
router.get('/my-referrals', requireTelegramAuth, async (req: any, res: any) => {
  const userId = req.user?.id || req.telegramUser?.id;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'Пользователь не найден' });
  }
  req.params.userId = userId.toString();
  return referralController.getUserReferrals(req, res);
});

// GET /api/referrals/levels - Получить статистику уровней (алиас для stats)
router.get('/levels', requireTelegramAuth, referralController.getReferralLevelsStats.bind(referralController));

// GET /api/referrals/validate/:refCode - Валидировать реферальный код (должен быть перед /:userId)
router.get('/validate/:refCode', requireTelegramAuth, referralController.validateReferralCode.bind(referralController));

// GET /api/referrals/:userId - Получить реферальную информацию пользователя
router.get('/:userId', requireTelegramAuth, referralController.getReferralInfo.bind(referralController));

// GET /api/referrals/:userId/list - Получить список рефералов пользователя
router.get('/:userId/list', requireTelegramAuth, referralController.getUserReferrals.bind(referralController));

// GET /api/referrals/:userId/earnings - Получить статистику доходов от рефералов
router.get('/:userId/earnings', requireTelegramAuth, referralController.getReferralEarnings.bind(referralController));

// GET /api/referrals/:userId/code - Получить реферальный код пользователя
router.get('/:userId/code', requireTelegramAuth, referralController.getUserReferralCode.bind(referralController));

// POST /api/referrals/generate-code - Генерировать реферальный код
router.post('/generate-code', requireTelegramAuth, referralController.generateReferralCode.bind(referralController));

export default router;