import express from 'express';
import { BoostController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';
import { validateBody, validateParams } from '../../core/middleware/validate';
import { strictRateLimit, standardRateLimit, liberalRateLimit } from '../../core/middleware/rateLimiting';
import { z } from 'zod';

const router = express.Router();
const boostController = new BoostController();

// Валидационные схемы для boost операций
const boostActivationSchema = z.object({
  package_id: z.number().int().positive('Package ID must be positive integer'),
  duration_days: z.number().int().min(1).max(365, 'Duration must be between 1-365 days').optional()
});

const boostPurchaseSchema = z.object({
  package_id: z.number().int().positive('Package ID must be positive integer'),
  payment_method: z.enum(['UNI', 'TON'], { errorMap: () => ({ message: 'Payment method must be UNI or TON' }) }),
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid amount format').refine(
    (val) => parseFloat(val) > 0,
    'Amount must be greater than 0'
  )
});

const tonPaymentSchema = z.object({
  transaction_hash: z.string().min(64, 'Invalid transaction hash').max(64, 'Invalid transaction hash'),
  amount: z.string().regex(/^\d+(\.\d{1,9})?$/, 'Invalid TON amount format'),
  package_id: z.number().int().positive('Package ID must be positive integer')
});

const userIdParamSchema = z.object({
  userId: z.string().regex(/^\d+$/, 'User ID must be numeric')
});

const boostIdParamSchema = z.object({
  boostId: z.string().regex(/^\d+$/, 'Boost ID must be numeric')
});

// GET /api/boosts - Получить список доступных бустов
router.get('/', requireTelegramAuth, boostController.getAvailableBoosts.bind(boostController));

// GET /api/boosts/user/:userId - Получить активные бусты пользователя
router.get('/user/:userId', requireTelegramAuth, validateParams(userIdParamSchema), boostController.getUserBoosts.bind(boostController));

// POST /api/boosts/activate - Активировать буст
router.post('/activate', requireTelegramAuth, validateBody(boostActivationSchema), boostController.activateBoost.bind(boostController));

// DELETE /api/boosts/deactivate/:boostId - Деактивировать буст
router.delete('/deactivate/:boostId', requireTelegramAuth, validateParams(boostIdParamSchema), boostController.deactivateBoost.bind(boostController));

// GET /api/boosts/stats/:userId - Получить статистику использования бустов
router.get('/stats/:userId', requireTelegramAuth, validateParams(userIdParamSchema), boostController.getBoostStats.bind(boostController));

// GET /api/boosts/packages - Получить доступные пакеты бустов
router.get('/packages', requireTelegramAuth, boostController.getPackages.bind(boostController));

// POST /api/boosts/purchase - Покупка Boost-пакета
router.post('/purchase', requireTelegramAuth, validateBody(boostPurchaseSchema), boostController.purchaseBoost.bind(boostController));

// POST /api/boosts/verify-ton-payment - Проверка и подтверждение TON платежа
router.post('/verify-ton-payment', requireTelegramAuth, validateBody(tonPaymentSchema), boostController.verifyTonPayment.bind(boostController));

export default router;