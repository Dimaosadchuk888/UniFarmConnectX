import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { UniFarmingService } from '../services/uniFarmingService';
import { NewUniFarmingService } from '../services/newUniFarmingService';
import { sendSuccess, sendError, sendServerError } from '../utils/responseUtils';
import { extractUserId } from '../utils/validationUtils';
import { getUserParamsSchema } from '../validators/schemas';
import { ZodError } from 'zod';
import BigNumber from 'bignumber.js';
import { db } from '../db';
import { uniFarmingDeposits, users } from '@shared/schema';
import { and, eq } from 'drizzle-orm';

/**
 * Контроллер для работы с пользователями
 */
export class UserController {
  /**
   * Получает информацию о текущем пользователе по сессии
   */
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      // Получаем userId из сессии или заголовка запроса
      // В реальном приложении это будет получено из сессии или JWT-токена
      const userId = req.query.user_id ? parseInt(req.query.user_id as string) : 
                   req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : 1; // Используем 1 как fallback для тестирования
      
      if (isNaN(userId)) {
        return sendError(res, 'Invalid user ID', 400);
      }

      const user = await UserService.getUserById(userId);

      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      sendSuccess(res, {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        balance_uni: user.balance_uni,
        balance_ton: user.balance_ton
      });
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      sendServerError(res, error);
    }
  }
  
  /**
   * Получает информацию о пользователе по ID
   */
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      // Валидация параметров запроса
      const validationResult = getUserParamsSchema.safeParse(req.params);
      if (!validationResult.success) {
        return sendError(res, 'Invalid user ID', 400, validationResult.error.format());
      }

      const userId = parseInt(req.params.id);
      const user = await UserService.getUserById(userId);

      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      sendSuccess(res, user);
    } catch (error) {
      console.error('Error in getUserById:', error);
      sendServerError(res, error);
    }
  }

  /**
   * Создает нового пользователя
   */
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      // Здесь должна быть валидация тела запроса
      const userData = req.body;
      
      // Проверка на существование пользователя с таким telegram_id
      if (userData.telegram_id) {
        const existingUser = await UserService.getUserByTelegramId(userData.telegram_id);
        if (existingUser) {
          return sendError(res, 'User with this Telegram ID already exists', 409);
        }
      }

      const newUser = await UserService.createUser(userData);
      sendSuccess(res, newUser);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, 'Invalid user data', 400, error.format());
      }
      sendServerError(res, error);
    }
  }

  /**
   * Обновляет данные пользователя
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = extractUserId(req, 'params');
      
      if (!userId) {
        return sendError(res, 'Invalid user ID', 400);
      }

      const userData = req.body;
      const updatedUser = await UserService.updateUser(userId, userData);

      if (!updatedUser) {
        return sendError(res, 'User not found', 404);
      }

      sendSuccess(res, updatedUser);
    } catch (error) {
      sendServerError(res, error);
    }
  }

  /**
   * Получает информацию о балансе пользователя
   */
  static async getUserBalance(req: Request, res: Response): Promise<void> {
    try {
      // Получаем user_id из параметров запроса
      const userId = parseInt(req.query.user_id as string);
      
      if (isNaN(userId)) {
        return sendError(res, 'Invalid user ID', 400);
      }
      
      // Проверяем наличие новых депозитов
      const newDeposits = await db
        .select()
        .from(uniFarmingDeposits)
        .where(and(
          eq(uniFarmingDeposits.user_id, userId),
          eq(uniFarmingDeposits.is_active, true)
        ));
      
      // Обновляем фарминг перед получением данных из базы
      // Это гарантирует, что мы получим актуальный баланс
      try {
        if (newDeposits.length > 0) {
          // Если есть новые депозиты, используем новый сервис
          await NewUniFarmingService.calculateAndUpdateUserFarming(userId);
        } else {
          // Иначе используем старый сервис для обратной совместимости
          await UniFarmingService.calculateAndUpdateUserFarming(userId);
        }
      } catch (farmingError) {
        console.error('[getUserBalance] Error updating farming before balance fetch:', farmingError);
        // Не возвращаем ошибку, так как основная функция - получение баланса
      }

      // Получаем пользователя с обновленным балансом
      const user = await UserService.getUserById(userId);

      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      // Форматируем баланс для отображения
      // Увеличиваем количество знаков после запятой для лучшего отслеживания изменений
      
      // Для правильного отображения реалтайм баланса объединяем основной баланс + накопленный фарминг
      const baseUniBalance = new BigNumber(user.balance_uni || 0);
      const farmingAccumulated = new BigNumber(user.uni_farming_balance || 0);
      
      // Создаем виртуальный баланс, добавляя накопленное значение к основному балансу
      // Это позволяет видеть микроизменения до 8 знаков после запятой
      const virtualUniBalance = baseUniBalance.plus(farmingAccumulated);
      
      // Форматируем балансы с увеличенной точностью
      const balanceUni = virtualUniBalance.toFixed(8); // Увеличиваем точность до 8 знаков
      const balanceTon = user.balance_ton ? new BigNumber(user.balance_ton).toFixed(5) : '0.00000';
      
      // Логируем для отладки полное значение как основного, так и виртуального баланса
      console.log(`[getUserBalance] User ${userId} balance: ${baseUniBalance.toFixed(8)} UNI + ${farmingAccumulated.toFixed(8)} (virtual: ${balanceUni})`);

      // Получаем информацию о фарминге для новых депозитов
      let uniFarmingInfo = {
        active: false,
        depositAmount: '0',
        depositCount: 0,
        ratePerSecond: '0'
      };

      if (newDeposits.length > 0) {
        // Если есть новые депозиты, собираем статистику
        const totalDepositsAmount = newDeposits.reduce((sum, deposit) => 
          sum.plus(new BigNumber(deposit.amount.toString())), new BigNumber(0));
          
        const totalRatePerSecond = newDeposits.reduce((sum, deposit) => 
          sum.plus(new BigNumber(deposit.rate_per_second.toString())), new BigNumber(0));
        
        uniFarmingInfo = {
          active: true,
          depositAmount: totalDepositsAmount.toFixed(6),
          depositCount: newDeposits.length,
          ratePerSecond: totalRatePerSecond.toFixed(12)
        };
      } else if (user.uni_deposit_amount && new BigNumber(user.uni_deposit_amount).gt(0)) {
        // Для обратной совместимости используем старые данные
        uniFarmingInfo = {
          active: true,
          depositAmount: new BigNumber(user.uni_deposit_amount).toFixed(6),
          depositCount: 1,
          ratePerSecond: UniFarmingService.calculateRatePerSecond(user.uni_deposit_amount)
        };
      }

      sendSuccess(res, {
        balance_uni: balanceUni,
        balance_ton: balanceTon,
        // Добавляем дополнительные данные для фарминга
        uni_farming_active: uniFarmingInfo.active,
        uni_deposit_amount: uniFarmingInfo.depositAmount,
        uni_deposit_count: uniFarmingInfo.depositCount,
        uni_farming_rate: uniFarmingInfo.ratePerSecond,
        uni_farming_balance: user.uni_farming_balance ? 
                           new BigNumber(user.uni_farming_balance).toFixed(8) : '0.00000000' // Увеличиваем точность
      });
    } catch (error) {
      console.error('Error in getUserBalance:', error);
      sendServerError(res, error);
    }
  }
}