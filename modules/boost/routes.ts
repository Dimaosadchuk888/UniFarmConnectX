import express from 'express';
import { BoostController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';

const router = express.Router();
const boostController = new BoostController();

// GET /api/boosts - Получить список доступных бустов
router.get('/', requireTelegramAuth, boostController.getAvailableBoosts.bind(boostController));

// GET /api/boosts/user/:userId - Получить активные бусты пользователя
router.get('/user/:userId', requireTelegramAuth, boostController.getUserBoosts.bind(boostController));

// POST /api/boosts/activate - Активировать буст
router.post('/activate', requireTelegramAuth, boostController.activateBoost.bind(boostController));

// DELETE /api/boosts/deactivate/:boostId - Деактивировать буст
router.delete('/deactivate/:boostId', requireTelegramAuth, boostController.deactivateBoost.bind(boostController));

// GET /api/boosts/stats/:userId - Получить статистику использования бустов
router.get('/stats/:userId', requireTelegramAuth, boostController.getBoostStats.bind(boostController));

// GET /api/boosts/packages - Получить доступные пакеты бустов
router.get('/packages', requireTelegramAuth, boostController.getPackages.bind(boostController));

export default router;