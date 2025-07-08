import express from 'express';
import { BoostController } from './controller';
import { requireTelegramAuth } from '../../core/middleware/telegramAuth';
import { validateBody, validateParams } from '../../core/middleware/validate';
import { strictRateLimit, standardRateLimit, liberalRateLimit, internalRateLimit } from '../../core/middleware/rateLimiting';
import { z } from 'zod';

const router = express.Router();
const boostController = new BoostController();

// Валидационные схемы для boost операций
const boostActivationSchema = z.object({
  package_id: z.number().int().positive('Package ID must be positive integer'),
  duration_days: z.number().int().min(1).max(365, 'Duration must be between 1-365 days').optional()
});

const boostPurchaseSchema = z.object({
  user_id: z.string().regex(/^\d+$/, 'User ID must be numeric'),
  boost_id: z.string().regex(/^\d+$/, 'Boost ID must be numeric'),
  payment_method: z.enum(['wallet', 'ton'], { errorMap: () => ({ message: 'Payment method must be wallet or ton' }) }),
  tx_hash: z.string().optional()
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
router.get('/', requireTelegramAuth, liberalRateLimit, boostController.getAvailableBoosts.bind(boostController));

// GET /api/boosts/user/:userId - Получить активные бусты пользователя
router.get('/user/:userId', requireTelegramAuth, liberalRateLimit, validateParams(userIdParamSchema), boostController.getUserBoosts.bind(boostController));

// POST /api/boosts/activate - Активировать буст
router.post('/activate', requireTelegramAuth, standardRateLimit, validateBody(boostActivationSchema), boostController.activateBoost.bind(boostController));

// DELETE /api/boosts/deactivate/:boostId - Деактивировать буст
router.delete('/deactivate/:boostId', requireTelegramAuth, standardRateLimit, validateParams(boostIdParamSchema), boostController.deactivateBoost.bind(boostController));

// GET /api/boosts/stats/:userId - Получить статистику использования бустов
router.get('/stats/:userId', requireTelegramAuth, liberalRateLimit, validateParams(userIdParamSchema), boostController.getBoostStats.bind(boostController));

// GET /api/boosts/packages - Получить доступные пакеты бустов
router.get('/packages', requireTelegramAuth, liberalRateLimit, boostController.getPackages.bind(boostController));

// POST /api/boosts/purchase - Покупка Boost-пакета (используем internalRateLimit для массовых операций)
router.post('/purchase', requireTelegramAuth, internalRateLimit, validateBody(boostPurchaseSchema), boostController.purchaseBoost.bind(boostController));

// POST /api/boosts/verify-ton-payment - Проверка и подтверждение TON платежа (оставляем строгий лимит для безопасности)
router.post('/verify-ton-payment', requireTelegramAuth, strictRateLimit, validateBody(tonPaymentSchema), boostController.verifyTonPayment.bind(boostController));

// GET /api/boosts/farming-status - Получить статус TON Boost фарминга для дашборда (используем internalRateLimit для частых обновлений)
router.get('/farming-status', requireTelegramAuth, internalRateLimit, boostController.getFarmingStatus.bind(boostController));

export default router;