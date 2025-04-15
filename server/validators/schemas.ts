import { z } from 'zod';
import { 
  insertUserSchema, 
  insertTransactionSchema, 
  insertFarmingDepositSchema 
} from '@shared/schema';

/**
 * Схемы валидации запросов API
 */

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