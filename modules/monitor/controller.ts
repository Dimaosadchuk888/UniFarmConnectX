/**
 * Monitor Controller
 * Контроллер для мониторинга состояния системы и базы данных
 */

import { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { supabase } from '../../core/supabase';

export class MonitorController extends BaseController {
  /**
   * GET /api/monitor/pool
   * Возвращает статистику connection pool
   */
  async getPoolStatus(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const stats = getPoolStats();
      
      this.sendSuccess(res, {
        active: stats.activeCount,
        idle: stats.idleCount,
        waiting: stats.waitingCount,
        total: stats.totalCount,
        timestamp: new Date().toISOString()
      });
    }, 'получения статистики пула соединений');
  }

  /**
   * GET /api/monitor/pool/detailed
   * Возвращает расширенную статистику с анализом здоровья
   */
  async getDetailedPoolStatus(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const stats = getDetailedPoolStats();
      
      this.sendSuccess(res, {
        ...stats,
        timestamp: new Date().toISOString()
      });
    }, 'получения детальной статистики пула');
  }

  /**
   * POST /api/monitor/pool/log
   * Выводит текущую статистику в консоль сервера
   */
  async logPoolStatus(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      logPoolStats();
      
      this.sendSuccess(res, {
        message: 'Статистика пула выведена в консоль сервера'
      });
    }, 'вывода статистики пула в консоль');
  }
}