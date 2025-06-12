import { Router } from 'express';
import { UserController } from './controller';

const router = Router();
const userController = new UserController();

// Пользовательские маршруты
router.post('/', userController.createUser.bind(userController));
router.get('/profile', userController.getCurrentUser.bind(userController));
router.put('/:id', userController.updateUser.bind(userController));
router.post('/ref-code', userController.generateRefCode.bind(userController));

export default router;