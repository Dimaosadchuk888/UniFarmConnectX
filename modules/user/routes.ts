import { Router } from 'express';
import { UserController } from './controller';

const router = Router();
const userController = new UserController();

// Пользовательские маршруты
router.get('/me', userController.getCurrentUser);
router.put('/:id', userController.updateUser);
router.post('/generate-ref-code', userController.generateRefCode);

export default router;