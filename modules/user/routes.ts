import { Router } from 'express';
import { UserController } from './controller';

const router = Router();
const userController = new UserController();

// Пользовательские маршруты
router.post('/', userController.createUser);
router.get('/by-guest-id', userController.getUserByGuestId);
router.get('/profile', userController.getCurrentUser);
router.put('/:id', userController.updateUser);
router.post('/ref-code', userController.generateRefCode);

export default router;