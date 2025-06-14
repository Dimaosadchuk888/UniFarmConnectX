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
      // Извлекаем initData из заголовка или тела запроса
      const initDataFromHeaders = req.headers['x-telegram-init-data'] as string;
      const { initData: initDataFromBody, ref_by } = req.body;
      
      const initData = initDataFromHeaders || initDataFromBody;
      
      if (!initData) {
        throw new Error('InitData is required in headers or body');
      }
      
      logger.info('[AuthController] Аутентификация через Telegram', { 
        has_ref: !!ref_by,
        initData_source: initDataFromHeaders ? 'headers' : 'body',
        initData_length: initData.length
      });
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
      // Извлекаем initData из заголовка или тела запроса
      const initDataFromHeaders = req.headers['x-telegram-init-data'] as string;
      const { 
        initData: initDataFromBody, 
        ref_by, 
        direct_registration,
        telegram_id,
        username,
        first_name,
        last_name,
        language_code
      } = req.body;
      
      const initData = initDataFromHeaders || initDataFromBody;
      
      // Проверяем, что это прямая регистрация с данными пользователя
      if (direct_registration && telegram_id) {
        logger.info('[AuthController] Прямая регистрация через Telegram данные пользователя', { 
          telegram_id,
          username,
          has_ref: !!ref_by
        });
        
        const result = await this.authService.registerDirectFromTelegramUser({
          telegram_id: parseInt(telegram_id.toString()),
          username: username || '',
          first_name: first_name || '',
          last_name: last_name || '',
          language_code: language_code || 'en'
        }, ref_by);
        
        if (result.success) {
          this.sendSuccess(res, {
            user: result.user,
            token: result.token,
            isNewUser: result.isNewUser
          });
        } else {
          this.sendError(res, result.error || 'Direct registration failed', 400);
        }
        return;
      }
      
      // Стандартная регистрация через initData
      if (!initData) {
        throw new Error('InitData is required in headers or body for standard registration');
      }
      
      logger.info('[AuthController] Стандартная регистрация через Telegram', { 
        has_ref: !!ref_by,
        initData_source: initDataFromHeaders ? 'headers' : 'body',
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