import { Router } from 'express';
import { UserController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = Router();
const userController = new UserController();

// Debug middleware для всех user routes
router.use((req, res, next) => {
  console.log('[USER ROUTES] Request received:', req.method, req.path);
  console.log('[USER ROUTES] Full URL:', req.originalUrl);
  console.log('[USER ROUTES] Has auth header:', !!req.headers.authorization);
  next();
});

// Пользовательские маршруты с обязательной авторизацией
router.post('/', requireTelegramAuth, userController.createUser.bind(userController));
router.post('/create', requireTelegramAuth, userController.createUser.bind(userController));
router.get('/profile', requireTelegramAuth, userController.getCurrentUser.bind(userController));
router.put('/:id', requireTelegramAuth, userController.updateUser.bind(userController));
router.post('/ref-code', requireTelegramAuth, userController.generateRefCode.bind(userController));
router.post('/recover-ref-code', requireTelegramAuth, userController.recoverRefCode.bind(userController));
router.get('/balance', requireTelegramAuth, userController.getBalance.bind(userController));
router.get('/sessions', requireTelegramAuth, userController.getSessions.bind(userController));
router.post('/sessions/clear', requireTelegramAuth, userController.clearSessions.bind(userController));

export default router;