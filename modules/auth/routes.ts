import express, { Request, Response } from 'express';
import { AuthController } from './controller';
import { validateBody } from '../../core/middleware/validate';
import { strictRateLimit, liberalRateLimit } from '../../core/middleware/rateLimiting';
import { z } from 'zod';

const router = express.Router();
const authController = new AuthController();

// Схемы валидации
const telegramAuthSchema = z.object({
  initData: z.string().optional(),
  refBy: z.string().optional(),
  // Поля для прямой авторизации
  direct_registration: z.boolean().optional(),
  telegram_id: z.number().optional(),
  username: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  language_code: z.string().optional()
}).refine((data) => {
  // Либо есть initData, либо это прямая авторизация с telegram_id
  return data.initData || (data.direct_registration && data.telegram_id);
}, {
  message: "Either initData or direct authorization with telegram_id is required"
});

const telegramRegistrationSchema = z.object({
  initData: z.string().optional(),
  refBy: z.string().optional(),
  // Поля для прямой регистрации
  direct_registration: z.boolean().optional(),
  telegram_id: z.number().optional(),
  username: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  language_code: z.string().optional()
}).refine((data) => {
  // Либо есть initData, либо это прямая регистрация с telegram_id
  return data.initData || (data.direct_registration && data.telegram_id);
}, {
  message: "Either initData or direct registration with telegram_id is required"
});

const tokenValidationSchema = z.object({
  token: z.string().min(1, 'Token is required')
});

const refreshTokenSchema = z.object({
  token: z.string().min(1, 'Token is required')
});

// POST /api/auth/telegram - Аутентификация через Telegram (строгий лимит для публичного endpoint)
router.post('/telegram', strictRateLimit, validateBody(telegramAuthSchema), authController.authenticateTelegram.bind(authController));

// POST /api/auth/register/telegram - Регистрация через Telegram (строгий лимит для публичного endpoint)
router.post('/register/telegram', strictRateLimit, validateBody(telegramRegistrationSchema), authController.registerTelegram.bind(authController));

// GET /api/auth/check - Проверка токена и получение информации о пользователе (либеральный лимит для проверок)
router.get('/check', liberalRateLimit, authController.checkToken.bind(authController));

// POST /api/auth/validate - Проверка валидности токена (либеральный лимит для проверок)
router.post('/validate', liberalRateLimit, validateBody(tokenValidationSchema), authController.validateToken.bind(authController));

// POST /api/auth/refresh - Обновление JWT токена (либеральный лимит для проверок)
router.post('/refresh', liberalRateLimit, validateBody(refreshTokenSchema), authController.refreshToken.bind(authController));

// POST /api/auth/logout - Выход из системы (либеральный лимит)
router.post('/logout', liberalRateLimit, authController.logout.bind(authController));

// GET /api/auth/session - Получение информации о текущей сессии (либеральный лимит)
router.get('/session', liberalRateLimit, authController.getSessionInfo.bind(authController));

// POST /api/auth/guest - Гостевая авторизация (для тестирования)
router.post('/guest', strictRateLimit, authController.guestAuth.bind(authController));

export default router;