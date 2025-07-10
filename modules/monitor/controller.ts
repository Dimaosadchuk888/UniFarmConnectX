/**
 * Monitor Controller
 * Контроллер для мониторинга состояния системы и базы данных
 */

import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../core/BaseController';
import { MonitorService } from './service';
import { logger } from '../../core/logger';

export class MonitorController extends BaseController {
  private monitorService: MonitorService;

  constructor() {
    super();
    this.monitorService = new MonitorService();
  }
  /**
   * GET /api/v2/monitor/health
   * Возвращает общее состояние системы
   */
  async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      await this.handleRequest(req, res, async () => {
        const health = await this.monitorService.getSystemHealth();
        this.sendSuccess(res, health);
      }, 'получения состояния системы');
    } catch (error) {
      this.handleControllerError(error, res, 'получения состояния системы');
    }
  }

  /**
   * GET /api/v2/monitor/stats
   * Возвращает статистику системы
   */
  async getSystemStats(req: Request, res: Response): Promise<void> {
    try {
      await this.handleRequest(req, res, async () => {
        const stats = await this.monitorService.getSystemStats();
        this.sendSuccess(res, stats);
      }, 'получения статистики системы');
    } catch (error) {
      this.handleControllerError(error, res, 'получения статистики системы');
    }
  }

  /**
   * GET /api/v2/monitor/status
   * Проверяет доступность критических API endpoints
   */
  async getEndpointsStatus(req: Request, res: Response): Promise<void> {
    try {
      await this.handleRequest(req, res, async () => {
        const endpoints = await this.monitorService.checkCriticalEndpoints();
        
        // Логируем результаты проверки
        logger.info('[MonitorController] Результаты проверки endpoints:', endpoints);
        
        res.json(endpoints);
      }, 'проверки критических endpoints');
    } catch (error) {
      this.handleControllerError(error, res, 'проверки критических endpoints');
    }
  }

  /**
   * GET /api/v2/monitor/scheduler-status
   * Возвращает состояние scheduler'ов
   */
  async getSchedulerStatus(req: Request, res: Response): Promise<void> {
    try {
      await this.handleRequest(req, res, async () => {
        const status = await this.monitorService.getSchedulerStatus();
        this.sendSuccess(res, status);
      }, 'получения состояния scheduler\'ов');
    } catch (error) {
      this.handleControllerError(error, res, 'получения состояния scheduler\'ов');
    }
  }
}