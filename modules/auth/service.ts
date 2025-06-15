import { validateTelegramInitData, generateJWTToken, verifyJWTToken, type TelegramUser, type JWTPayload } from '../../utils/telegram';
import { UserService } from '../users/service';
import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';

// Типы для Supabase API
interface User {
  id: number;
  telegram_id: number;
  username?: string;
  first_name?: string;
  ref_code: string;
  referred_by?: string;
  balance_uni: string;
  balance_ton: string;
  created_at: string;
}

interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    telegram_id: number;
    username?: string;
    ref_code: string;
    created_at: string;
  };
  token?: string;
  error?: string;
  isNewUser?: boolean;
}

interface SessionInfo {
  valid: boolean;
  userId?: string;
  telegramId?: number;
  username?: string;
  refCode?: string;
  expiresAt?: string;
  error?: string;
}

export class AuthService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async authenticateFromTelegram(initData: string, userData?: any): Promise<AuthResponse> {
    try {
      if (!initData || initData.length === 0) {
        logger.warn('[AuthService] Пустой initData получен');
        
        if (userData?.telegram_id) {
          logger.info('[AuthService] Attempting direct registration with userData', { telegramId: userData.telegram_id });
          return await this.registerDirectFromTelegramUser(userData);
        }
        
        return {
          success: false,
          error: 'Отсутствуют данные авторизации Telegram'
        };
      }

      const validation = validateTelegramInitData(initData);
      if (!validation.valid || !validation.telegramUser) {
        logger.warn('[AuthService] Невалидные данные Telegram', { validation });
        return {
          success: false,
          error: 'Невалидные данные авторизации'
        };
      }

      const telegramUser = validation.telegramUser;
      logger.info('[AuthService] Валидные данные Telegram получены', { telegramId: telegramUser.id });

      let userInfo = await this.userService.findByTelegramId(telegramUser.id);
      let isNewUser = false;

      if (!userInfo) {
        logger.info('[AuthService] Создание нового пользователя', { telegramId: telegramUser.id });
        
        userInfo = await this.userService.createUserFromTelegram({
          telegram_id: telegramUser.id,
          username: telegramUser.username,
          first_name: telegramUser.first_name
        });
        
        isNewUser = true;
        logger.info('[AuthService] Новый пользователь создан', { userId: userInfo.id });
      }

      const payload: JWTPayload = {
        userId: userInfo.id.toString(),
        telegramId: telegramUser.id,
        username: telegramUser.username || userInfo.username,
        refCode: userInfo.ref_code
      };

      const token = generateJWTToken(payload);
      logger.info('[AuthService] JWT токен создан', { userId: userInfo.id });

      return {
        success: true,
        user: {
          id: userInfo.id.toString(),
          telegram_id: telegramUser.id,
          username: telegramUser.username || (userInfo.username ?? ''),
          ref_code: userInfo.ref_code || '',
          created_at: userInfo.created_at || new Date().toISOString()
        },
        token,
        isNewUser
      };
    } catch (error) {
      logger.error('[AuthService] Ошибка регистрации через Telegram', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: 'Внутренняя ошибка сервера'
      };
    }
  }

  async registerDirectFromTelegramUser(userData: any): Promise<AuthResponse> {
    try {
      if (!userData || !userData.telegram_id) {
        return {
          success: false,
          error: 'Отсутствует telegram_id'
        };
      }

      logger.info('[AuthService] Прямая регистрация пользователя', { telegramId: userData.telegram_id });

      let userInfo = await this.userService.findByTelegramId(userData.telegram_id);
      let isNewUser = false;

      if (!userInfo) {
        logger.info('[AuthService] Создание нового пользователя (прямая регистрация)', { telegramId: userData.telegram_id });
        
        userInfo = await this.userService.createUserFromTelegram({
          telegram_id: userData.telegram_id,
          username: userData.username || userData.first_name,
          first_name: userData.first_name
        });
        
        isNewUser = true;
        logger.info('[AuthService] Новый пользователь создан (прямая регистрация)', { userId: userInfo.id });
      }

      const payload: JWTPayload = {
        userId: userInfo.id.toString(),
        telegramId: userData.telegram_id,
        username: userData.username || userInfo.username,
        refCode: userInfo.ref_code
      };

      const token = generateJWTToken(payload);
      logger.info('[AuthService] JWT токен создан (прямая регистрация)', { userId: userInfo.id });

      return {
        success: true,
        user: {
          id: userInfo.id.toString(),
          telegram_id: userData.telegram_id,
          username: userData.username || (userInfo.username ?? ''),
          ref_code: userInfo.ref_code || '',
          created_at: userInfo.created_at || new Date().toISOString()
        },
        token,
        isNewUser
      };
    } catch (error) {
      logger.error('[AuthService] Ошибка прямой регистрации', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: 'Ошибка при создании пользователя'
      };
    }
  }

  async verifySession(token: string): Promise<SessionInfo> {
    try {
      if (!token) {
        return {
          valid: false,
          error: 'Токен не предоставлен'
        };
      }

      const verification = verifyJWTToken(token);
      if (!verification.valid || !verification.payload) {
        return {
          valid: false,
          error: 'Недействительный токен'
        };
      }

      const payload = verification.payload;
      
      const userInfo = await this.userService.findByTelegramId(payload.telegramId);
      if (!userInfo) {
        return {
          valid: false,
          error: 'Пользователь не найден'
        };
      }

      return {
        valid: true,
        userId: payload.userId,
        telegramId: payload.telegramId,
        username: payload.username,
        refCode: payload.refCode,
        expiresAt: new Date(payload.exp * 1000).toISOString()
      };
    } catch (error) {
      logger.error('[AuthService] Ошибка верификации сессии', { error: error instanceof Error ? error.message : String(error) });
      return {
        valid: false,
        error: 'Ошибка верификации токена'
      };
    }
  }

  async saveUserSession(userId: string, token: string): Promise<boolean> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase
        .from('user_sessions')
        .upsert({
          user_id: parseInt(userId),
          token,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        });

      if (error) {
        logger.error('[AuthService] Ошибка сохранения сессии', { error: error.message });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[AuthService] Ошибка сохранения сессии', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async getUserFromToken(token: string): Promise<User | null> {
    try {
      const sessionInfo = await this.verifySession(token);
      if (!sessionInfo.valid || !sessionInfo.telegramId) {
        return null;
      }

      const userInfo = await this.userService.findByTelegramId(sessionInfo.telegramId);
      return userInfo as User | null;
    } catch (error) {
      logger.error('[AuthService] Ошибка получения пользователя по токену', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Регистрация через Telegram initData
   */
  async registerWithTelegram(initData: string, refBy?: string): Promise<AuthResponse> {
    try {
      // Валидация initData
      const validation = validateTelegramInitData(initData);
      if (!validation.valid || !validation.user) {
        return {
          success: false,
          error: 'Недействительные данные Telegram'
        };
      }

      const telegramUser = validation.user;
      
      // Проверяем существование пользователя
      let userInfo = await this.userService.findByTelegramId(telegramUser.id);
      let isNewUser = false;

      if (!userInfo) {
        // Создаем нового пользователя
        userInfo = await this.userService.createUserFromTelegram({
          telegram_id: telegramUser.id,
          username: telegramUser.username || telegramUser.first_name,
          first_name: telegramUser.first_name
        }, refBy);
        isNewUser = true;
      }

      const payload: JWTPayload = {
        userId: userInfo.id.toString(),
        telegramId: telegramUser.id,
        username: telegramUser.username || userInfo.username,
        refCode: userInfo.ref_code
      };

      const token = generateJWTToken(payload);

      return {
        success: true,
        user: {
          id: userInfo.id.toString(),
          telegram_id: telegramUser.id,
          username: telegramUser.username || (userInfo.username ?? ''),
          ref_code: userInfo.ref_code || '',
          created_at: userInfo.created_at || new Date().toISOString()
        },
        token,
        isNewUser
      };
    } catch (error) {
      logger.error('[AuthService] Ошибка регистрации через Telegram', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: 'Ошибка при регистрации'
      };
    }
  }

  /**
   * Получение информации о сессии
   */
  async getSessionInfo(token: string): Promise<SessionInfo> {
    return this.verifySession(token);
  }

  /**
   * Валидация токена
   */
  async validateToken(token: string): Promise<{ valid: boolean; payload?: JWTPayload; error?: string }> {
    try {
      const verification = verifyJWTToken(token);
      return {
        valid: verification.valid,
        payload: verification.payload,
        error: verification.error
      };
    } catch (error) {
      return {
        valid: false,
        error: 'Token validation failed'
      };
    }
  }
}