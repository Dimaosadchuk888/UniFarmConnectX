import express, { Request, Response, NextFunction } from 'express';
import { AdminController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';
import { requireAdminAuth } from '../../core/middleware/adminAuth';
import { requireAuth } from '../../core/middleware/auth';

const router = express.Router();
const adminController = new AdminController();

// GET /api/admin/test - Тестовый роут без авторизации  
router.get('/test', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Admin routes работают!',
    timestamp: new Date().toISOString()
  });
});

// GET /api/admin/stats - Получить статистику системы
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await requireAuth(req, res, next);
    await requireTelegramAuth(req, res, next);
    await requireAdminAuth(req, res, next);
    await adminController.getSystemStats(req, res);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/admin/users - Получить список пользователей
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await requireAuth(req, res, next);
    await requireTelegramAuth(req, res, next);
    await requireAdminAuth(req, res, next);
    await adminController.getUsers(req, res);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/admin/users/:userId/moderate - Модерация пользователя
router.post('/users/:userId/moderate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await requireAuth(req, res, next);
    await requireTelegramAuth(req, res, next);
    await requireAdminAuth(req, res, next);
    await adminController.moderateUser(req, res);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/admin/missions/manage - Управление миссиями
router.post('/missions/manage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await requireAuth(req, res, next);
    await requireTelegramAuth(req, res, next);
    await requireAdminAuth(req, res, next);
    await adminController.manageMissions(req, res);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;