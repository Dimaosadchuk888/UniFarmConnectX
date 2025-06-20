import express from 'express';
import { AuthController } from './controller';

const router = express.Router();
const authController = new AuthController();

// POST /api/auth/telegram - Аутентификация через Telegram
router.post('/telegram', authController.authenticateTelegram.bind(authController));

// POST /api/auth/validate - Проверка валидности токена
router.post('/validate', authController.validateToken.bind(authController));

// POST /api/auth/refresh - Обновление токена
router.post('/refresh', authController.refreshToken.bind(authController));

// POST /api/auth/logout - Выход из системы
router.post('/logout', authController.logout.bind(authController));

// GET /api/auth/session - Получение информации о текущей сессии
router.get('/session', authController.getSessionInfo.bind(authController));

export default router;