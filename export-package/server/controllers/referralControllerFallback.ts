import { Request, Response, NextFunction } from 'express';
import { storage as memStorage } from '../storage-memory';
import { sendSuccess, sendError } from '../utils/responseUtils';
import { wrapServiceFunction } from '../db-service-wrapper';
import { ReferralService } from '../services/referralService';
import { extractUserId } from '../utils/validationUtils';

export class ReferralControllerFallback {
  /**
   * Получает реферальное дерево для пользователя 
   * @route GET /api/referrals/tree
   */
  static async getReferralTree(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Извлекаем ID пользователя
      const userIdRaw = extractUserId(req);
      if (!userIdRaw || isNaN(userIdRaw) || userIdRaw <= 0) {
        return sendError(res, 'Некорректный идентификатор пользователя', 400);
      }
      
      const userId = Number(userIdRaw);
      console.log(`[ReferralControllerFallback] Запрос реферального дерева для пользователя: ${userId}`);
      
      // Заворачиваем вызов сервиса в обработчик ошибок
      const getReferralTreeFallback = wrapServiceFunction(
        ReferralService.getReferralTree.bind(ReferralService),
        async (error, userId) => {
          console.log(`[ReferralControllerFallback] Используем fallback для получения реферального дерева для пользователя: ${userId}`, error);
          
          try {
            // Проверяем существование пользователя
            const user = await memStorage.getUser(userId);
            if (!user) {
              console.log(`[ReferralControllerFallback] Пользователь с ID ${userId} не найден в MemStorage`);
              return {
                user_id: userId,
                ref_code: 'Unknown',
                username: 'Unknown',
                referrals: [],
                total_count: 0,
                message: 'Данные в режиме fallback'
              };
            }
            
            // Получаем всех пользователей из MemStorage
            const allUsers = memStorage['users'];
            console.log(`[ReferralControllerFallback] Получено ${allUsers.length} пользователей из MemStorage`);
            
            // Фильтруем пользователей, чтобы получить рефералов
            const referrals = allUsers.filter(refUser => 
              refUser.parent_ref_code === user.ref_code
            ).map(refUser => ({
              id: refUser.id,
              username: refUser.username || 'user',
              ref_code: refUser.ref_code || 'Unknown',
              created_at: refUser.created_at || new Date(),
              level: 1
            }));
            
            console.log(`[ReferralControllerFallback] Найдено ${referrals.length} прямых рефералов`);
            
            // Формируем результат
            return {
              user_id: userId,
              ref_code: user.ref_code || 'Unknown',
              username: user.username || 'user',
              referrals: referrals,
              total_count: referrals.length,
              is_fallback: true,
              message: 'Данные получены из резервного хранилища'
            };
          } catch (memError) {
            console.error(`[ReferralControllerFallback] Ошибка при получении данных из MemStorage:`, memError);
            
            // Возвращаем пустые данные при ошибке
            return {
              user_id: userId,
              ref_code: 'Unknown',
              username: 'Unknown',
              referrals: [],
              total_count: 0,
              is_fallback: true,
              message: 'Недоступно из-за ошибки в резервном хранилище'
            };
          }
        }
      );
      
      // Получаем данные через обёртку
      const treeData = await getReferralTreeFallback(userId);
      sendSuccess(res, treeData);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Получает статистику по рефералам
   * @route GET /api/referrals/stats
   */
  static async getReferralStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Извлекаем ID пользователя
      const userIdRaw = extractUserId(req);
      if (!userIdRaw || isNaN(userIdRaw) || userIdRaw <= 0) {
        return sendError(res, 'Некорректный идентификатор пользователя', 400);
      }
      
      const userId = Number(userIdRaw);
      console.log(`[ReferralControllerFallback] Запрос реферальной статистики для пользователя: ${userId}`);
      
      // Заворачиваем вызов сервиса в обработчик ошибок
      const getReferralStatsFallback = wrapServiceFunction(
        ReferralService.getReferralStats.bind(ReferralService),
        async (error, userId) => {
          console.log(`[ReferralControllerFallback] Используем fallback для получения реферальной статистики:`, error);
          
          try {
            // Проверяем существование пользователя
            const user = await memStorage.getUser(userId);
            if (!user) {
              console.log(`[ReferralControllerFallback] Пользователь с ID ${userId} не найден в MemStorage`);
              return {
                user_id: userId,
                ref_code: null,
                username: null,
                total_referrals: 0,
                referral_counts: {},
                level_income: {},
                total_income: { uni: 0, ton: 0 },
                status: 'inactive',
                is_fallback: true,
                message: 'Данные в режиме fallback'
              };
            }
            
            // Получаем всех пользователей из MemStorage
            const allUsers = memStorage['users'];
            
            // Фильтруем пользователей, чтобы получить рефералов
            const referrals = allUsers.filter(refUser => 
              refUser.parent_ref_code === user.ref_code
            );
            
            // В режиме fallback все рефералы считаются уровня 1
            const referralCounts = { 1: referrals.length };
            
            // В режиме fallback мы не можем получить информацию о доходах, поэтому возвращаем пустые значения
            const levelIncome = { 1: { uni: 0, ton: 0 } };
            
            // Формируем результат
            return {
              user_id: userId,
              ref_code: user.ref_code || null,
              username: user.username || 'user',
              total_referrals: referrals.length,
              referral_counts: referralCounts,
              level_income: levelIncome,
              total_income: { uni: 0, ton: 0 },
              status: referrals.length > 0 ? 'active' : 'inactive',
              is_fallback: true,
              message: 'Статистика получена из резервного хранилища'
            };
          } catch (memError) {
            console.error(`[ReferralControllerFallback] Ошибка при получении данных из MemStorage:`, memError);
            
            // Возвращаем пустые данные при ошибке
            return {
              user_id: userId,
              ref_code: null,
              username: null,
              total_referrals: 0,
              referral_counts: {},
              level_income: {},
              total_income: { uni: 0, ton: 0 },
              status: 'inactive',
              is_fallback: true,
              message: 'Недоступно из-за ошибки в резервном хранилище'
            };
          }
        }
      );
      
      // Получаем данные через обёртку
      const statsData = await getReferralStatsFallback(userId);
      sendSuccess(res, statsData);
    } catch (error) {
      next(error);
    }
  }
}