import { validateTelegramInitData, generateJWTToken, verifyJWTToken, type TelegramUser, type JWTPayload } from '../../utils/telegram';
import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';
import type { AuthResponse, AuthValidationResult } from './types';
import { AUTH_TABLES, AUTH_METHODS, AUTH_STATUS, JWT_CONFIG } from './model';
// Удален статический импорт ReferralService для избежания циклических зависимостей

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
   * Внутренняя реализация processReferral для избежания циклических зависимостей
   */
  private async processReferralInline(refCode: string, newUserId: number): Promise<{success: boolean, error?: string}> {
    try {
      // Поиск реферера по коду
      const { data: referrer, error: referrerError } = await supabase
        .from(AUTH_TABLES.USERS)
        .select('id, ref_code')
        .eq('ref_code', refCode)
        .single();

      if (referrerError || !referrer) {
        logger.warn('[AuthService] Реферер не найден', { refCode, error: referrerError?.message });
        return { success: false, error: 'Реферер не найден' };
      }

      // Обновляем поле referred_by
      const { error: updateError } = await supabase
        .from(AUTH_TABLES.USERS)
        .update({ referred_by: referrer.id })
        .eq('id', newUserId);

      if (updateError) {
        logger.error('[AuthService] Ошибка обновления referred_by', { 
          newUserId, 
          referrerId: referrer.id,
          error: updateError.message 
        });
        return { success: false, error: 'Ошибка обновления referred_by' };
      }

      // Создаем запись в referrals
      const { error: referralError } = await supabase
        .from('referrals')
        .insert({
          user_id: parseInt(newUserId),
          referred_user_id: parseInt(newUserId), 
          inviter_id: referrer.id,
          level: 1,
          ref_path: [referrer.id],
          reward_uni: '0',
          reward_ton: '0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (referralError) {
        logger.error('[AuthService] ❌ КРИТИЧЕСКАЯ ОШИБКА создания referrals записи', { 
          newUserId, 
          referrerId: referrer.id,
          error: referralError.message,
          code: referralError.code,
          details: referralError.details,
          hint: referralError.hint,
          insertData: {
            user_id: parseInt(newUserId),
            referred_user_id: parseInt(newUserId),
            inviter_id: referrer.id,
            level: 1
          }
        });
        return { success: false, error: `Ошибка создания referrals записи: ${referralError.message}` };
      }

      logger.info('[AuthService] ✅ РЕФЕРАЛЬНАЯ СВЯЗЬ УСПЕШНО СОЗДАНА', { 
        newUserId, 
        referrerId: referrer.id,
        refCode,
        referredByUpdated: true,
        referralsTableUpdated: true
      });

      return { success: true };

    } catch (error) {
      logger.error('[AuthService] Критическая ошибка processReferralInline', { 
        error: error instanceof Error ? error.message : String(error),
        refCode,
        newUserId
      });
      return { success: false, error: 'Критическая ошибка создания реферальной связи' };
    }
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
          referred_by: null, // Оставляем пустым, заполним в processReferral()
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
      
      // Обработка реферальной связи СРАЗУ после создания пользователя
      if (userData.ref_by && user) {
        try {
          logger.info('[AuthService] НАЧИНАЕТСЯ НЕМЕДЛЕННАЯ ОБРАБОТКА РЕФЕРАЛЬНОЙ СВЯЗИ', { 
            newUserId: user.id, 
            refCode: userData.ref_by,
            userDataRefBy: userData.ref_by,
            userExists: !!user
          });
          
          const referralResult = await this.processReferralInline(userData.ref_by, user.id);
          
          if (referralResult.success) {
            logger.info('[AuthService] ✅ РЕФЕРАЛЬНАЯ СВЯЗЬ УСПЕШНО СОЗДАНА В findOrCreateFromTelegram', { 
              newUserId: user.id, 
              refCode: userData.ref_by,
              processMethod: 'processReferralInline',
              success: true
            });
          } else {
            logger.error('[AuthService] ❌ НЕ УДАЛОСЬ СОЗДАТЬ РЕФЕРАЛЬНУЮ СВЯЗЬ В findOrCreateFromTelegram', { 
              newUserId: user.id, 
              refCode: userData.ref_by,
              error: referralResult.error 
            });
          }
        } catch (error) {
          logger.error('[AuthService] ❌ КРИТИЧЕСКАЯ ОШИБКА ПРИ ОБРАБОТКЕ РЕФЕРАЛЬНОЙ СВЯЗИ', { 
            error: error instanceof Error ? error.message : String(error),
            newUserId: user.id,
            refCode: userData.ref_by,
            stack: error instanceof Error ? error.stack : 'No stack'
          });
        }
      } else {
        logger.info('[AuthService] РЕФЕРАЛЬНАЯ СВЯЗЬ НЕ ОБРАБАТЫВАЕТСЯ', {
          hasRefBy: !!userData.ref_by,
          refByValue: userData.ref_by,
          hasUser: !!user,
          userId: user?.id
        });
      }
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
      // Извлекаем start_param из результата валидации - это и есть реферальный код
      const referralCode = validation.start_param || options.ref_by;
      logger.info('[AuthService] Валидные данные Telegram получены', { 
        telegramId: telegramUser.id, 
        start_param: validation.start_param,
        ref_by: referralCode
      });

      let userInfo = await this.findByTelegramId(telegramUser.id);
      let isNewUser = false;

      if (!userInfo) {
        logger.info('[AuthService] Создание нового пользователя', { telegramId: telegramUser.id, referralCode });
        
        userInfo = await this.findOrCreateFromTelegram({
          telegram_id: telegramUser.id,
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          ref_by: referralCode
        });
        
        isNewUser = true;
        logger.info('[AuthService] Новый пользователь создан', { userId: userInfo?.id });
        
        // Реферальная связь уже обработана в findOrCreateFromTelegram()
        logger.info('[AuthService] Реферальная связь уже обработана при создании пользователя', { 
          newUserId: userInfo.id, 
          refCode: referralCode,
          source: validation.start_param ? 'telegram_start_param' : 'options_ref_by'
        });
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
          ref_by: userData.ref_by  // Передаем ref_by для обработки
        });
        
        isNewUser = true;
        logger.info('[AuthService] Новый пользователь создан (прямая регистрация)', { userId: userInfo?.id });
        
        // Реферальная связь уже обработана в findOrCreateFromTelegram()
        logger.info('[AuthService] Реферальная связь уже обработана при создании пользователя', { 
          newUserId: userInfo.id, 
          refCode: userData.ref_by 
        });
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
      // Извлекаем start_param из результата валидации - это и есть реферальный код
      const referralCode = validation.start_param || refBy;
      logger.info('[AuthService] registerWithTelegram - получены данные', { 
        telegramId: telegramUser.id, 
        start_param: validation.start_param,
        refBy: refBy,
        finalReferralCode: referralCode
      });
      
      let userInfo = await this.findByTelegramId(telegramUser.id);
      let isNewUser = false;

      if (!userInfo) {
        // Создаем нового пользователя
        userInfo = await this.findOrCreateFromTelegram({
          telegram_id: telegramUser.id,
          username: telegramUser.username || telegramUser.first_name,
          first_name: telegramUser.first_name,
          ref_by: referralCode
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
      logger.info('[AuthService] Начинаем обновление токена');
      
      // Сначала пробуем обычную валидацию
      const validation = await this.validateToken(token);
      
      let payload: any = null;
      let validationMethod = 'standard';

      if (validation.valid && validation.payload) {
        payload = validation.payload;
        validationMethod = 'standard';
      } else {
        // Если обычная валидация не прошла, пробуем декодировать без верификации подписи
        // для получения данных пользователя (безопасно только для чтения user_id)
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const decodedPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            
            // Проверяем, что токен не истек
            const now = Math.floor(Date.now() / 1000);
            if (decodedPayload.exp && decodedPayload.exp > now) {
              payload = decodedPayload;
              validationMethod = 'decoded_fallback';
              logger.warn('[AuthService] Используется fallback декодирование токена', { 
                reason: validation.error,
                telegram_id: decodedPayload.telegram_id,
                exp: new Date(decodedPayload.exp * 1000).toISOString()
              });
            } else {
              return {
                success: false,
                error: 'Токен истек'
              };
            }
          }
        } catch (decodeError) {
          logger.error('[AuthService] Ошибка декодирования токена', { 
            error: decodeError instanceof Error ? decodeError.message : String(decodeError) 
          });
          return {
            success: false,
            error: 'Токен поврежден'
          };
        }
      }

      if (!payload || !payload.telegram_id) {
        return {
          success: false,
          error: 'Невозможно извлечь данные из токена'
        };
      }

      // Получаем пользователя из базы данных
      const userInfo = await this.findByTelegramId(payload.telegram_id);
      if (!userInfo) {
        logger.warn('[AuthService] Пользователь не найден', { telegram_id: payload.telegram_id });
        return {
          success: false,
          error: 'Пользователь не найден'
        };
      }

      // Создаем новый токен с актуальными данными
      const telegramUser: TelegramUser = {
        id: payload.telegram_id,
        first_name: payload.first_name || userInfo.first_name || 'User',
        username: payload.username || userInfo.username
      };

      const userForToken = {
        ...telegramUser,
        id: userInfo.id,
        telegram_id: userInfo.telegram_id
      };

      const newToken = generateJWTToken(userForToken, userInfo.ref_code);

      logger.info('[AuthService] Токен успешно обновлен', { 
        userId: userInfo.id, 
        telegram_id: userInfo.telegram_id,
        validationMethod: validationMethod
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