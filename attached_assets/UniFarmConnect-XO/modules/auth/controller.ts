import { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { AuthService } from './service';

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
      
      const { initData } = req.body;
      console.log('[AuthController] Аутентификация через Telegram');
      
      const result = await this.authService.authenticateWithTelegram(initData);
      
      if (result.success) {
        this.sendSuccess(res, {
          user: result.user,
          token: result.token,
          session_id: result.sessionId
        });
      } else {
        this.sendError(res, result.error, 401);
      }
    }, 'аутентификации через Telegram');
  }

  /**
   * Проверка валидности токена
   */
  async validateToken(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
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
   * Обновление токена
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      this.validateRequiredFields(req.body, ['refreshToken']);
      
      const { refreshToken } = req.body;
      const result = await this.authService.refreshToken(refreshToken);
      
      if (result.success) {
        this.sendSuccess(res, {
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          expires_in: result.expiresIn
        });
      } else {
        this.sendError(res, result.error, 401);
      }
    }, 'обновления токена');
  }

  /**
   * Выход из системы
   */
  async logout(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        await this.authService.invalidateToken(token);
      }

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