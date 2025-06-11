import express from 'express';
import { AdminController } from './controller';

const router = express.Router();
const adminController = new AdminController();

// GET /api/admin/stats - Получить статистику системы
router.get('/stats', adminController.getSystemStats.bind(adminController));

// GET /api/admin/users - Получить список пользователей
router.get('/users', adminController.getUsers.bind(adminController));

// POST /api/admin/users/:userId/moderate - Модерация пользователя
router.post('/users/:userId/moderate', adminController.moderateUser.bind(adminController));

// POST /api/admin/missions/manage - Управление миссиями
router.post('/missions/manage', adminController.manageMissions.bind(adminController));

export default router;