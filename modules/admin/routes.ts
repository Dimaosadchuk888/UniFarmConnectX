import express from 'express';
import { AdminController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';
import { requireAdminAuth } from '../../core/middleware/adminAuth';
import { requireAuth } from '../../core/middleware/auth';

const router = express.Router();
const adminController = new AdminController();

// GET /api/admin/stats - Получить статистику системы
router.get('/stats', requireAuth, requireTelegramAuth, requireAdminAuth, adminController.getSystemStats.bind(adminController));

// GET /api/admin/test - Тестовый роут без авторизации  
router.get('/test', async (req, res) => {
  res.json({
    success: true,
    message: 'Admin routes работают!',
    timestamp: new Date().toISOString()
  });
});

// GET /api/admin/users - Получить список пользователей
router.get('/users', requireAuth, requireTelegramAuth, requireAdminAuth, adminController.getUsers.bind(adminController));

// POST /api/admin/users/:userId/moderate - Модерация пользователя
router.post('/users/:userId/moderate', requireAuth, requireTelegramAuth, requireAdminAuth, adminController.moderateUser.bind(adminController));

// POST /api/admin/missions/manage - Управление миссиями
router.post('/missions/manage', requireAuth, requireTelegramAuth, requireAdminAuth, adminController.manageMissions.bind(adminController));

export default router;