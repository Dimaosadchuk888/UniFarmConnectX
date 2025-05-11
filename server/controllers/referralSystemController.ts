/**
 * Контроллер для управления реферальной системой
 * 
 * Предоставляет API для:
 * - Получения структуры реферальной сети пользователя
 * - Переключения между обычной и оптимизированной реализациями
 * - Просмотра метрик производительности
 */

import { Request as ExpressRequest, Response } from 'express';

// Расширяем интерфейс Request для поддержки пользовательских свойств
interface Request extends ExpressRequest {
  user?: {
    id: number;
    isAdmin?: boolean;
  };
}
import { referralSystemIntegrator } from '../services/referralSystemIntegrator';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { users } from '@shared/schema';

export class ReferralSystemController {
  /**
   * Получает дерево рефералов для пользователя
   */
  static async getReferralTree(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.user?.id);
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const maxDepth = Number(req.query.maxDepth) || 5;
      
      // Получаем дерево рефералов с использованием текущей активной системы
      const referralTree = await referralSystemIntegrator.getReferralTree(userId, maxDepth);
      
      res.json({
        success: true,
        data: referralTree
      });
    } catch (error) {
      console.error('[ReferralSystemController] Error getting referral tree:', error);
      res.status(500).json({ 
        error: 'Не удалось получить структуру рефералов',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }
  
  /**
   * Получает структуру и статистику реферальной сети
   */
  static async getReferralStructureInfo(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.user?.id);
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      // Получаем и анализируем структуру рефералов
      const structureInfo = await referralSystemIntegrator.getReferralStructureInfo(userId);
      
      // Получаем общие данные о пользователе
      const userInfo = await db.select({
        username: users.username,
        ref_code: users.ref_code
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
      
      res.json({
        success: true,
        user: userInfo[0] || null,
        stats: structureInfo
      });
    } catch (error) {
      console.error('[ReferralSystemController] Error getting referral structure info:', error);
      res.status(500).json({ 
        error: 'Не удалось получить информацию о структуре рефералов',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }
  
  /**
   * Переключает между стандартной и оптимизированной версиями
   * Только для разработки и администраторов
   */
  static async toggleOptimizedSystem(req: Request, res: Response): Promise<void> {
    try {
      // Проверяем права доступа (только для разработки или админов)
      if (!req.headers['x-development-mode'] && !req.user?.isAdmin) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      
      const { enabled } = req.body;
      
      if (typeof enabled !== 'boolean') {
        res.status(400).json({ error: 'Invalid request. "enabled" field must be a boolean' });
        return;
      }
      
      // Переключаем режим
      referralSystemIntegrator.setOptimizedVersion(enabled);
      
      res.json({
        success: true,
        optimizedSystemEnabled: referralSystemIntegrator.isOptimizedVersionEnabled(),
        message: `Оптимизированная реферальная система ${enabled ? 'включена' : 'отключена'}`
      });
    } catch (error) {
      console.error('[ReferralSystemController] Error toggling optimized system:', error);
      res.status(500).json({ 
        error: 'Не удалось переключить режим реферальной системы',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }
  
  /**
   * Получает статус и метрики производительности системы
   * Только для разработки и администраторов
   */
  static async getSystemMetrics(req: Request, res: Response): Promise<void> {
    try {
      // Проверяем права доступа (только для разработки или админов)
      if (!req.headers['x-development-mode'] && !req.user?.isAdmin) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      
      // Получаем статус и метрики
      const systemMetrics = await referralSystemIntegrator.getSystemMetrics();
      const performanceStats = await referralSystemIntegrator.getPerformanceStats();
      
      res.json({
        success: true,
        metrics: systemMetrics,
        performance: performanceStats
      });
    } catch (error) {
      console.error('[ReferralSystemController] Error getting system metrics:', error);
      res.status(500).json({ 
        error: 'Не удалось получить метрики производительности',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }
}