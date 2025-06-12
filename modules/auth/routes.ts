import express, { Request, Response } from 'express';
import { AuthController } from './controller';
import { validateBody } from '../../core/middleware/validate';
import { z } from 'zod';

const router = express.Router();
const authController = new AuthController();

// Схемы валидации
const telegramAuthSchema = z.object({
  initData: z.string().min(1, 'InitData is required'),
  refBy: z.string().optional()
});

const tokenValidationSchema = z.object({
  token: z.string().min(1, 'Token is required')
});

// POST /api/auth/telegram - Аутентификация через Telegram
router.post('/telegram', validateBody(telegramAuthSchema), authController.authenticateTelegram.bind(authController));

// GET /api/auth/check - Проверка токена и получение информации о пользователе
router.get('/check', authController.checkToken.bind(authController));

// POST /api/auth/validate - Проверка валидности токена
router.post('/validate', validateBody(tokenValidationSchema), authController.validateToken.bind(authController));

// POST /api/auth/logout - Выход из системы
router.post('/logout', authController.logout.bind(authController));

// GET /api/auth/session - Получение информации о текущей сессии
router.get('/session', authController.getSessionInfo.bind(authController));

export default router;