import { validateTelegramInitData, generateJWTToken, verifyJWTToken, type TelegramUser, type JWTPayload } from '../../utils/telegram';
import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';
import type { AuthResponse, AuthValidationResult } from './types';
import { AUTH_TABLES, AUTH_METHODS, AUTH_STATUS, JWT_CONFIG } from './model';

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

interface AuthenticationResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  isNewUser?: boolean;
}

interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

export class AuthService {
  constructor() {}

  /**
   * Генерирует уникальный реферальный код
   */
  private generateRefCode(): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `REF_${timestamp}_${randomStr}`;
  }

  /**
   * Находит пользователя по telegram_id
   */
  private async findByTelegramId(telegramId: number): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from(AUTH_TABLES.USERS)
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('[AuthService] Ошибка поиска пользователя', { error: error.message, telegramId });
        return null;
      }

      return data;
    } catch (error) {
      logger.error('[AuthService] Ошибка поиска пользователя', { error, telegramId });
      return null;
    }
  }

  /**
   * Создает нового пользователя
   */
  private async createUser(userData: { telegram_id: number; username?: string; first_name?: string; ref_by?: string }): Promise<User | null> {
    try {
      const refCode = this.generateRefCode();
      
      const { data, error } = await supabase
        .from(AUTH_TABLES.USERS)
        .insert({
          telegram_id: userData.telegram_id,
          username: userData.username || userData.first_name || `user_${userData.telegram_id}`,
          first_name: userData.first_name || 'User',
          ref_code: refCode,
          referred_by: userData.ref_by || null,
          balance_uni: '0',
          balance_ton: '0',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('[AuthService] Ошибка создания пользователя', { error: error.message, userData });
        return null;
      }

      return data;
    } catch (error) {
      logger.error('[AuthService] Ошибка создания пользователя', { error, userData });
      return null;
    }
  }

  /**
   * Находит или создает пользователя
   */
  private async findOrCreateFromTelegram(userData: { telegram_id: number; username?: string; first_name?: string; ref_by?: string }): Promise<User | null> {
    let user = await this.findByTelegramId(userData.telegram_id);
    
    if (!user) {
      user = await this.createUser(userData);
    }
    
    return user;
  }

  /**
   * Аутентификация пользователя через Telegram
   */
  async authenticateFromTelegram(initData: string, options: { ref_by?: string } = {}): Promise<AuthenticationResult> {
    try {
      logger.info('[AuthService] Начало аутентификации через Telegram');

      if (!initData || initData.length === 0) {
        logger.warn('[AuthService] Пустые данные инициализации Telegram');
        return {
          success: false,
          error: 'Отсутствуют данные авторизации Telegram'
        };
      }

      if (!process.env.TELEGRAM_BOT_TOKEN) {
        logger.error('[AuthService] TELEGRAM_BOT_TOKEN not set');
        return {
          success: false,
          error: 'Сервер неправильно настроен'
        };
      }
      const validation = validateTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
      if (!validation.valid || !validation.user) {
        logger.warn('[AuthService] Невалидные данные Telegram', { validation });
        return {
          success: false,
          error: 'Невалидные данные авторизации'
        };
      }

      const telegramUser = validation.user;
      logger.info('[AuthService] Валидные данные Telegram получены', { telegramId: telegramUser.id });

      let userInfo = await this.findByTelegramId(telegramUser.id);
      let isNewUser = false;

      if (!userInfo) {
        logger.info('[AuthService] Создание нового пользователя', { telegramId: telegramUser.id });
        
        userInfo = await this.findOrCreateFromTelegram({
          telegram_id: telegramUser.id,
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          ref_by: options.ref_by
        });
        
        isNewUser = true;
        logger.info('[AuthService] Новый пользователь создан', { userId: userInfo?.id });
        
        // Обработка реферальной связи для нового пользователя
        if (options.ref_by && userInfo) {
          try {
            const { ReferralService } = await import('../referral/service');
            const referralService = new ReferralService();
            
            logger.info('[AuthService] Обработка реферальной связи', { 
              newUserId: userInfo.id, 
              refCode: options.ref_by 
            });
            
            const referralResult = await referralService.processReferral(options.ref_by, userInfo.id.toString());
            
            if (referralResult.success) {
              logger.info('[AuthService] Реферальная связь успешно создана', { 
                newUserId: userInfo.id, 
                refCode: options.ref_by 
              });
            } else {
              logger.warn('[AuthService] Не удалось создать реферальную связь', { 
                newUserId: userInfo.id, 
                refCode: options.ref_by,
                error: referralResult.error 
              });
            }
          } catch (error) {
            logger.error('[AuthService] Ошибка при обработке реферальной связи', { 
              error: error instanceof Error ? error.message : String(error),
              newUserId: userInfo.id,
              refCode: options.ref_by
            });
          }
        }
      }

      if (!userInfo) {
        return {
          success: false,
          error: 'Ошибка создания пользователя'
        };
      }

      // Передаем правильные данные для JWT с userId из базы данных
      const userForToken = {
        ...telegramUser,
        id: userInfo.id, // Используем реальный user_id из базы
        telegram_id: userInfo.telegram_id // Добавляем реальный telegram_id из базы
      };
      const token = generateJWTToken(userForToken, userInfo.ref_code);
      logger.info('[AuthService] JWT токен создан', { userId: userInfo.id, telegram_id: userInfo.telegram_id });

      return {
        success: true,
        user: {
          ...userInfo,
          telegram_id: userInfo.telegram_id || telegramUser.id
        } as User,
        token: token,
        isNewUser
      };
    } catch (error) {
      logger.error('[AuthService] Ошибка аутентификации', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: 'Ошибка аутентификации через Telegram'
      };
    }
  }

  /**
   * Прямая регистрация пользователя без HMAC проверки (fallback)
   */
  async registerDirectFromTelegramUser(userData: { telegram_id: number; username?: string; first_name?: string; ref_by?: string }): Promise<AuthenticationResult> {
    try {
      logger.info('[AuthService] Прямая регистрация пользователя', { telegramId: userData.telegram_id });

      let userInfo = await this.findByTelegramId(userData.telegram_id);
      let isNewUser = false;

      if (!userInfo) {
        logger.info('[AuthService] Создание нового пользователя (прямая регистрация)', { telegramId: userData.telegram_id });
        
        userInfo = await this.findOrCreateFromTelegram({
          telegram_id: userData.telegram_id,
          username: userData.username || userData.first_name,
          first_name: userData.first_name,
          ref_by: userData.ref_by
        });
        
        isNewUser = true;
        logger.info('[AuthService] Новый пользователь создан (прямая регистрация)', { userId: userInfo?.id });
      }

      if (!userInfo) {
        return {
          success: false,
          error: 'Ошибка создания пользователя'
        };
      }

      const telegramUser: TelegramUser = {
        id: userData.telegram_id,
        first_name: userData.first_name || 'User',
        username: userData.username
      };

      // Передаем правильные данные для JWT с userId из базы данных
      const userForToken = {
        ...telegramUser,
        id: userInfo.id, // Используем реальный user_id из базы
        telegram_id: userInfo.telegram_id // Добавляем реальный telegram_id из базы
      };
      const token = generateJWTToken(userForToken, userInfo.ref_code);
      logger.info('[AuthService] JWT токен создан (прямая регистрация)', { userId: userInfo.id, telegram_id: userInfo.telegram_id });

      return {
        success: true,
        user: {
          ...userInfo,
          telegram_id: userInfo.telegram_id || userData.telegram_id
        } as User,
        token: token,
        isNewUser
      };
    } catch (error) {
      logger.error('[AuthService] Ошибка прямой регистрации', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: 'Ошибка прямой регистрации пользователя'
      };
    }
  }

  /**
   * Валидация JWT токена
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      if (!token) {
        return { valid: false, error: 'Токен отсутствует' };
      }

      const verification = verifyJWTToken(token);
      if (!verification) {
        return { valid: false, error: 'Невалидный токен' };
      }

      return { valid: true, payload: verification };
    } catch (error) {
      logger.error('[AuthService] Ошибка валидации токена', { error: error instanceof Error ? error.message : String(error) });
      return { valid: false, error: 'Ошибка валидации токена' };
    }
  }

  /**
   * Регистрация через Telegram (с HMAC проверкой)
   */
  async registerWithTelegram(initData: string, refBy?: string): Promise<AuthenticationResult> {
    try {
      if (!process.env.TELEGRAM_BOT_TOKEN) {
        logger.error('[AuthService] TELEGRAM_BOT_TOKEN not set');
        return {
          success: false,
          error: 'Сервер неправильно настроен'
        };
      }
      const validation = validateTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
      if (!validation.valid || !validation.user) {
        return {
          success: false,
          error: 'Невалидные данные Telegram'
        };
      }

      const telegramUser = validation.user;
      let userInfo = await this.findByTelegramId(telegramUser.id);
      let isNewUser = false;

      if (!userInfo) {
        // Создаем нового пользователя
        userInfo = await this.findOrCreateFromTelegram({
          telegram_id: telegramUser.id,
          username: telegramUser.username || telegramUser.first_name,
          first_name: telegramUser.first_name,
          ref_by: refBy
        });
        isNewUser = true;
      }

      if (!userInfo) {
        return {
          success: false,
          error: 'Ошибка создания пользователя'
        };
      }

      // Передаем правильные данные для JWT с userId из базы данных
      const userForToken = {
        ...telegramUser,
        id: userInfo.id, // Используем реальный user_id из базы
        telegram_id: userInfo.telegram_id // Добавляем реальный telegram_id из базы
      };
      const token = generateJWTToken(userForToken, userInfo.ref_code);

      return {
        success: true,
        user: {
          ...userInfo,
          telegram_id: userInfo.telegram_id || telegramUser.id
        } as User,
        token: token,
        isNewUser
      };
    } catch (error) {
      logger.error('[AuthService] Ошибка регистрации через Telegram', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: 'Ошибка регистрации через Telegram'
      };
    }
  }

  /**
   * Проверка токена и получение информации о пользователе
   */
  async checkToken(token: string): Promise<AuthenticationResult> {
    try {
      const validation = await this.validateToken(token);
      if (!validation.valid || !validation.payload) {
        return {
          success: false,
          error: validation.error || 'Невалидный токен'
        };
      }

      const userInfo = await this.findByTelegramId(validation.payload.telegram_id);
      if (!userInfo) {
        return {
          success: false,
          error: 'Пользователь не найден'
        };
      }

      return {
        success: true,
        user: userInfo as User
      };
    } catch (error) {
      logger.error('[AuthService] Ошибка проверки токена', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: 'Ошибка проверки токена'
      };
    }
  }

  /**
   * Обновление JWT токена
   */
  async refreshToken(token: string): Promise<{ success: boolean; newToken?: string; user?: User; error?: string }> {
    try {
      const validation = await this.validateToken(token);
      if (!validation.valid || !validation.payload) {
        return {
          success: false,
          error: validation.error || 'Невалидный токен для обновления'
        };
      }

      // Получаем пользователя из базы данных
      const userInfo = await this.findByTelegramId(validation.payload.telegram_id);
      if (!userInfo) {
        return {
          success: false,
          error: 'Пользователь не найден'
        };
      }

      // Создаем новый токен
      const telegramUser: TelegramUser = {
        id: validation.payload.telegram_id,
        first_name: validation.payload.first_name || 'User',
        username: validation.payload.username
      };

      const userForToken = {
        ...telegramUser,
        id: userInfo.id,
        telegram_id: userInfo.telegram_id
      };

      const newToken = generateJWTToken(userForToken, userInfo.ref_code);

      logger.info('[AuthService] Токен успешно обновлен', { 
        userId: userInfo.id, 
        telegram_id: userInfo.telegram_id 
      });

      return {
        success: true,
        newToken,
        user: userInfo as User
      };
    } catch (error) {
      logger.error('[AuthService] Ошибка обновления токена', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return {
        success: false,
        error: 'Ошибка обновления токена'
      };
    }
  }

  /**
   * Выход из системы (очистка клиентского токена)
   */
  async logout(): Promise<{ success: boolean }> {
    // В данной реализации logout только клиентский
    return { success: true };
  }

  /**
   * Получение информации о сессии
   */
  async getSessionInfo(token: string): Promise<AuthenticationResult> {
    return this.checkToken(token);
  }
}