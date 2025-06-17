import { Router } from 'express';
import { UserController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = Router();
const userController = new UserController();

// Пользовательские маршруты с обязательной авторизацией
router.post('/', requireTelegramAuth, userController.createUser.bind(userController));
router.get('/profile', requireTelegramAuth, userController.getCurrentUser.bind(userController));
router.put('/:id', requireTelegramAuth, userController.updateUser.bind(userController));
router.post('/ref-code', requireTelegramAuth, userController.generateRefCode.bind(userController));
router.post('/recover-ref-code', requireTelegramAuth, userController.recoverRefCode.bind(userController));

export default router;