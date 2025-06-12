import express from 'express';
import { AdminController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = express.Router();
const adminController = new AdminController();

// GET /api/admin/stats - Получить статистику системы
router.get('/stats', requireTelegramAuth, adminController.getSystemStats.bind(adminController));

// GET /api/admin/users - Получить список пользователей
router.get('/users', requireTelegramAuth, adminController.getUsers.bind(adminController));

// POST /api/admin/users/:userId/moderate - Модерация пользователя
router.post('/users/:userId/moderate', requireTelegramAuth, adminController.moderateUser.bind(adminController));

// POST /api/admin/missions/manage - Управление миссиями
router.post('/missions/manage', requireTelegramAuth, adminController.manageMissions.bind(adminController));

export default router;