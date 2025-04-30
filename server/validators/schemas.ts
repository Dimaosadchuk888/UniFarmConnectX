import { z } from 'zod';
import { 
  insertUserSchema, 
  insertTransactionSchema, 
  insertFarmingDepositSchema 
} from '@shared/schema';

/**
 * Схемы валидации запросов API
 */

// Схема для получения пользователя по ID
export const userIdSchema = z.object({
  user_id: z.number().int().positive({
    message: 'ID пользователя должен быть положительным числом'
  })
});

// Схема для получения пользователя по guest_id
export const guestIdSchema = z.object({
  guest_id: z.string().min(1, {
    message: 'guest_id должен быть непустой строкой'
  })
});

// Схема для валидации данных баланса
export const userBalanceSchema = z.object({
  balance_uni: z.string().optional(),
  balance_ton: z.string().optional()
});

// Схема для валидации данных при обновлении пользователя
export const updateUserSchema = z.object({
  user_id: z.number().int().positive({
    message: 'ID пользователя должен быть положительным числом'
  }),
  data: z.object({
    username: z.string().min(3).optional(),
    ref_code: z.string().min(6).optional(),
    wallet_address: z.string().optional(),
    telegram_id: z.number().int().nullable().optional(),
    balance_uni: z.string().optional(),
    balance_ton: z.string().optional(),
    guest_id: z.string().optional(),
    parent_id: z.number().int().nullable().optional(),
    parent_ref_code: z.string().nullable().optional()
  })
});

// Схема для валидации запроса на получение пользователя по ID
export const getUserParamsSchema = z.object({
  id: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: 'ID должен быть положительным числом'
  })
});

// Схема для валидации запроса на получение транзакций
export const getTransactionsQuerySchema = z.object({
  user_id: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: 'user_id должен быть положительным числом'
  })
});

// Схема для валидации запроса на завершение миссии
export const completeMissionSchema = z.object({
  user_id: z.number().int().positive(),
  mission_id: z.number().int().positive()
});

// Схема для валидации запроса на депозит
export const depositSchema = z.object({
  user_id: z.number().int().positive(),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Сумма должна быть положительным числом'
  }),
  package_id: z.number().int().nonnegative().optional(),
});

// Схема для валидации запроса на вывод средств
export const withdrawSchema = z.object({
  user_id: z.number().int().positive(),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Сумма должна быть положительным числом'
  }),
  currency: z.enum(['UNI', 'TON']),
  wallet: z.string().min(5),
});

// Расширяем схемы из shared/schema.ts для конкретных запросов API
export const createUserSchema = insertUserSchema.extend({
  // Можно добавить дополнительные поля или валидацию
});

export const createTransactionSchema = insertTransactionSchema.extend({
  // Можно добавить дополнительные поля или валидацию
});

export const createFarmingDepositSchema = insertFarmingDepositSchema.extend({
  // Можно добавить дополнительные поля или валидацию
});