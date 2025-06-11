import express, { Request, Response } from 'express';
import { AuthController } from './controller';

const router = express.Router();
const authController = new AuthController();

// POST /api/auth/telegram - Аутентификация через Telegram
router.post('/telegram', authController.authenticateTelegram.bind(authController));

// GET /api/auth/check - Проверка токена и получение информации о пользователе
router.get('/check', authController.checkToken.bind(authController));

// POST /api/auth/validate - Проверка валидности токена
router.post('/validate', authController.validateToken.bind(authController));

// POST /api/auth/logout - Выход из системы
router.post('/logout', authController.logout.bind(authController));

// GET /api/auth/session - Получение информации о текущей сессии
router.get('/session', authController.getSessionInfo.bind(authController));

export default router;