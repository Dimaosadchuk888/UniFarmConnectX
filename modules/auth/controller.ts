import type { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { AuthService } from './service';
import { logger } from '../../core/logger';

export class AuthController extends BaseController {
  private authService: AuthService;

  constructor() {
    super();
    this.authService = new AuthService();
  }

  /**
   * Аутентификация через Telegram
   */
  async authenticateTelegram(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      this.validateRequiredFields(req.body, ['initData']);
      
      const { initData, ref_by } = req.body;
      logger.info('[AuthController] Аутентификация через Telegram', ref_by ? { ref_by } : {});
      console.log('✅ /api/v2/auth/telegram called with initData length:', initData.length);
      
      const result = await this.authService.authenticateWithTelegram(initData, ref_by);
      
      if (result.success) {
        console.log('✅ Authentication successful, returning token and user data');
        this.sendSuccess(res, {
          user: result.user,
          token: result.token
        });
      } else {
        console.log('❌ Authentication failed:', result.error);
        this.sendError(res, result.error || 'Authentication failed', 401);
      }
    }, 'аутентификации через Telegram');
  }

  /**
   * Регистрация пользователя через Telegram
   */
  async registerTelegram(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      this.validateRequiredFields(req.body, ['initData']);
      
      const { initData, ref_by } = req.body;
      logger.info('[AuthController] Регистрация через Telegram', { 
        has_ref: !!ref_by,
        initData_length: initData.length 
      });
      
      const result = await this.authService.registerWithTelegram(initData, ref_by);
      
      if (result.success) {
        this.sendSuccess(res, {
          user: result.user,
          token: result.token,
          isNewUser: result.isNewUser
        });
      } else {
        this.sendError(res, result.error || 'Registration failed', 400);
      }
    }, 'регистрации через Telegram');
  }

  /**
   * Проверка валидности токена и получение информации о пользователе
   */
  async checkToken(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
      
      if (!token) {
        return this.sendError(res, 'Authorization token required', 401);
      }

      const sessionInfo = await this.authService.getSessionInfo(token);
      
      if (!sessionInfo.valid) {
        return this.sendError(res, sessionInfo.error || 'Invalid token', 401);
      }

      this.sendSuccess(res, {
        valid: true,
        user_id: sessionInfo.userId,
        telegram_id: sessionInfo.telegramId,
        username: sessionInfo.username,
        ref_code: sessionInfo.refCode,
        expires_at: sessionInfo.expiresAt
      });
    }, 'проверки токена');
  }

  /**
   * Валидация токена (legacy endpoint)
   */
  async validateToken(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
      
      if (!token) {
        return this.sendError(res, 'Токен не предоставлен', 401);
      }

      const isValid = await this.authService.validateToken(token);
      
      this.sendSuccess(res, {
        valid: isValid,
        checked_at: new Date().toISOString()
      });
    }, 'валидации токена');
  }

  /**
   * Выход из системы (очистка клиентского токена)
   */
  async logout(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      // В JWT архитектуре logout обычно обрабатывается на клиенте
      // Токен просто удаляется из localStorage/sessionStorage
      this.sendSuccess(res, {
        message: 'Выход выполнен успешно',
        logged_out_at: new Date().toISOString()
      });
    }, 'выхода из системы');
  }

  /**
   * Получение информации о текущей сессии
   */
  async getSessionInfo(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return this.sendError(res, 'Токен не предоставлен', 401);
      }

      const sessionInfo = await this.authService.getSessionInfo(token);
      this.sendSuccess(res, sessionInfo);
    }, 'получения информации о сессии');
  }
}