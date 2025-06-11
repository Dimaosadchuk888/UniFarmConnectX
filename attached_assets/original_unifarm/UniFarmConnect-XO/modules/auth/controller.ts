import { Request, Response } from 'express';
import { AuthService } from './service';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Аутентификация через Telegram
   */
  async authenticateTelegram(req: Request, res: Response): Promise<void> {
    try {
      const { initData } = req.body;
      console.log('[AuthController] Аутентификация через Telegram');
      
      if (!initData) {
        res.status(400).json({
          success: false,
          error: 'Не предоставлены данные initData'
        });
        return;
      }

      const result = await this.authService.authenticateWithTelegram(initData);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            user: result.user,
            token: result.token,
            session_id: result.sessionId
          }
        });
      } else {
        res.status(401).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('[AuthController] Ошибка аутентификации:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка аутентификации'
      });
    }
  }

  /**
   * Проверка валидности токена
   */
  async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Токен не предоставлен'
        });
        return;
      }

      const isValid = await this.authService.validateToken(token);
      
      res.json({
        success: true,
        data: {
          valid: isValid,
          checked_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('[AuthController] Ошибка валидации токена:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка валидации токена'
      });
    }
  }

  /**
   * Обновление токена
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token не предоставлен'
        });
        return;
      }

      const result = await this.authService.refreshToken(refreshToken);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            access_token: result.accessToken,
            refresh_token: result.refreshToken,
            expires_in: result.expiresIn
          }
        });
      } else {
        res.status(401).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('[AuthController] Ошибка обновления токена:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка обновления токена'
      });
    }
  }

  /**
   * Выход из системы
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        await this.authService.invalidateToken(token);
      }

      res.json({
        success: true,
        data: {
          message: 'Выход выполнен успешно',
          logged_out_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('[AuthController] Ошибка выхода:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка выхода из системы'
      });
    }
  }

  /**
   * Получение информации о текущей сессии
   */
  async getSessionInfo(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Токен не предоставлен'
        });
        return;
      }

      const sessionInfo = await this.authService.getSessionInfo(token);
      
      res.json({
        success: true,
        data: sessionInfo
      });
    } catch (error) {
      console.error('[AuthController] Ошибка получения информации о сессии:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения информации о сессии'
      });
    }
  }
}