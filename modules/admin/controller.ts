import type { Request, Response } from 'express';
import { BaseController } from '@/core/BaseController';
import { AdminService } from './service';

export class AdminController extends BaseController {
  private adminService: AdminService;

  constructor() {
    super();
    this.adminService = new AdminService();
  }
  /**
   * Получить статистику системы
   */
  async getSystemStats(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      console.log('[AdminController] Получение статистики системы');
      
      const stats = await this.adminService.getDashboardStats();
      this.sendSuccess(res, stats);
    }, 'получения статистики системы');
  }

  /**
   * Получить список пользователей
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { page, limit } = this.getPagination(req);
      
      console.log(`[AdminController] Получение пользователей, страница ${page}`);
      
      const usersList = await this.adminService.getUsersList(page, limit);
      this.sendSuccess(res, usersList);
    }, 'получения списка пользователей');
  }

  /**
   * Модерация пользователя
   */
  async moderateUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { action, reason } = req.body;
      
      console.log(`[AdminController] Модерация пользователя ${userId}: ${action}`);
      
      if (!userId || !action) {
        res.status(400).json({
          success: false,
          error: 'Не указан userId или action'
        });
        return;
      }

      // Здесь будет логика модерации
      res.json({
        success: true,
        data: {
          user_id: userId,
          action,
          reason: reason || '',
          moderated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('[AdminController] Ошибка модерации пользователя:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка модерации пользователя'
      });
    }
  }

  /**
   * Управление миссиями
   */
  async manageMissions(req: Request, res: Response): Promise<void> {
    try {
      const { action } = req.body;
      
      console.log(`[AdminController] Управление миссиями: ${action}`);
      
      res.json({
        success: true,
        data: {
          action,
          executed_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('[AdminController] Ошибка управления миссиями:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка управления миссиями'
      });
    }
  }
}