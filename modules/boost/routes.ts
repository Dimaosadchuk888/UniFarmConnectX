import express from 'express';
import { BoostController } from './controller';

const router = express.Router();
const boostController = new BoostController();

// GET /api/boosts - Получить список доступных бустов
router.get('/', boostController.getAvailableBoosts.bind(boostController));

// GET /api/boosts/user/:userId - Получить активные бусты пользователя
router.get('/user/:userId', boostController.getUserBoosts.bind(boostController));

// POST /api/boosts/activate - Активировать буст
router.post('/activate', boostController.activateBoost.bind(boostController));

// DELETE /api/boosts/deactivate/:boostId - Деактивировать буст
router.delete('/deactivate/:boostId', boostController.deactivateBoost.bind(boostController));

// GET /api/boosts/stats/:userId - Получить статистику использования бустов
router.get('/stats/:userId', boostController.getBoostStats.bind(boostController));

export default router;