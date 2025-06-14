import { validateTelegramInitData, generateJWTToken, verifyJWTToken, type TelegramUser, type JWTPayload } from '../../utils/telegram';
import { UserService } from '../user/service';
import { db } from '../../server/db';
import { users, type User } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../core/logger';

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

/**
 * Типизированный интерфейс для данных пользователя из JWT токена
 */
export interface UserPayload {
  telegram_id: number;
  username?: string;
  ref_code: string;
}

export class AuthService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Registers user via Telegram initData with HMAC validation
   */
  async registerWithTelegram(initData: string, refBy?: string): Promise<AuthResponse> {
    try {
      logger.info('[AuthService] Starting Telegram registration');
      
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        throw new Error('TELEGRAM_BOT_TOKEN not configured');
      }

      // Validate initData using HMAC
      const validation = validateTelegramInitData(initData, botToken);
      if (!validation.valid || !validation.user) {
        logger.error('[AuthService] Telegram validation failed', { error: validation.error });
        return {
          success: false,
          error: validation.error || 'Invalid Telegram data'
        };
      }

      const telegramUser = validation.user;
      logger.info('[AuthService] Telegram validation successful for user ID', { userId: telegramUser.id });

      // Find or create user using UserService
      const userInfo = await this.userService.findOrCreateFromTelegram({
        telegram_id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        ref_by: refBy
      });

      // Check if this is a new user (simple heuristic based on creation time)
      const now = new Date();
      const userCreatedAt = userInfo.created_at ? new Date(userInfo.created_at) : now;
      const isNewUser = (now.getTime() - userCreatedAt.getTime()) < 5000; // Created within last 5 seconds

      logger.info('[AuthService] User resolved for registration', { 
        userId: userInfo.id, 
        isNewUser 
      });
      console.log('✅ User created/found in database:', { 
        id: userInfo.id, 
        telegram_id: userInfo.telegram_id, 
        ref_code: userInfo.ref_code 
      });

      
      // Generate JWT token with null-safe values
      const token = generateJWTToken(telegramUser, userInfo.ref_code || undefined);

      return {
        success: true,
        user: {
          id: userInfo.id.toString(),
          telegram_id: telegramUser.id,
          username: telegramUser.username || (userInfo.username ?? ''),
          ref_code: userInfo.ref_code || '',
          created_at: userInfo.created_at ? userInfo.created_at.toISOString() : new Date().toISOString()
        },
        token,
        isNewUser
      };
    } catch (error) {
      logger.error('[AuthService] Ошибка регистрации через Telegram', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: 'Ошибка регистрации пользователя'
      };
    }
  }

  /**
   * Registers user directly from Telegram user data (without initData validation)
   * Used when initData is empty but user data is available from initDataUnsafe
   */
  async registerDirectFromTelegramUser(telegramUser: {
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
  }, refBy?: string): Promise<AuthResponse> {
    try {
      logger.info('[AuthService] Прямая регистрация через данные Telegram пользователя', { 
        telegram_id: telegramUser.telegram_id,
        username: telegramUser.username,
        has_ref: !!refBy
      });

      // Find or create user using UserService
      const userInfo = await this.userService.findOrCreateFromTelegram({
        telegram_id: telegramUser.telegram_id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        ref_by: refBy
      });

      logger.info('[AuthService] Пользователь создан/найден при прямой регистрации', { userId: userInfo.id });

      // Generate JWT token with user data
      const token = generateJWTToken({
        id: telegramUser.telegram_id,
        username: telegramUser.username || '',
        first_name: telegramUser.first_name || ''
      }, userInfo.ref_code || '');

      const isNewUser = !userInfo.created_at || (new Date().getTime() - new Date(userInfo.created_at).getTime()) < 60000;

      return {
        success: true,
        user: {
          id: userInfo.id.toString(),
          telegram_id: telegramUser.telegram_id,
          username: telegramUser.username || (userInfo.username ?? ''),
          ref_code: userInfo.ref_code || '',
          created_at: userInfo.created_at ? userInfo.created_at.toISOString() : new Date().toISOString()
        },
        token,
        isNewUser
      };
    } catch (error) {
      logger.error('[AuthService] Ошибка прямой регистрации через Telegram', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return {
        success: false,
        error: 'Ошибка прямой регистрации пользователя'
      };
    }
  }

  /**
   * Authenticates user via Telegram initData with HMAC validation
   */
  async authenticateWithTelegram(initData: string, refBy?: string): Promise<AuthResponse> {
    try {
      logger.info('[AuthService] Starting Telegram authentication');
      
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        throw new Error('TELEGRAM_BOT_TOKEN not configured');
      }

      // Validate initData using HMAC
      const validation = validateTelegramInitData(initData, botToken);
      if (!validation.valid || !validation.user) {
        logger.error('[AuthService] Telegram validation failed', { error: validation.error });
        return {
          success: false,
          error: validation.error || 'Invalid Telegram data'
        };
      }

      const telegramUser = validation.user;
      logger.info('[AuthService] Telegram validation successful for user ID', { userId: telegramUser.id });
      console.log('✅ Telegram user validated:', { id: telegramUser.id, username: telegramUser.username });

      // Find or create user using UserService
      const userInfo = await this.userService.findOrCreateFromTelegram({
        telegram_id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        ref_by: refBy
      });

      logger.info('[AuthService] User resolved', { userId: userInfo.id });
      console.log('✅ User created/found in database:', { 
        id: userInfo.id, 
        telegram_id: userInfo.telegram_id, 
        ref_code: userInfo.ref_code 
      });

      // Generate JWT token
      const token = generateJWTToken(telegramUser, userInfo.ref_code || '');

      return {
        success: true,
        user: {
          id: userInfo.id.toString(),
          telegram_id: telegramUser.id,
          username: telegramUser.username || (userInfo.username ?? ''),
          ref_code: userInfo.ref_code || '',
          created_at: userInfo.created_at ? userInfo.created_at.toISOString() : new Date().toISOString()
        },
        token
      };
    } catch (error) {
      logger.error('[AuthService] Ошибка аутентификации через Telegram', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: 'Недействительные данные Telegram'
      };
    }
  }

  /**
   * Validates JWT token and returns payload if valid
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const payload = verifyJWTToken(token);
      return payload !== null;
    } catch (error) {
      logger.error('[AuthService] JWT validation error', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Gets session information from JWT token
   */
  async getSessionInfo(token: string): Promise<SessionInfo> {
    try {
      logger.info('[AuthService] Getting session info from JWT');
      
      const payload = verifyJWTToken(token);
      if (!payload) {
        return {
          valid: false,
          error: 'Invalid or expired token'
        };
      }

      return {
        valid: true,
        userId: payload.telegram_id.toString(),
        telegramId: payload.telegram_id,
        username: payload.username,
        refCode: payload.ref_code,
        expiresAt: new Date(payload.exp * 1000).toISOString()
      };
    } catch (error) {
      logger.error('[AuthService] Error getting session info', { error: error instanceof Error ? error.message : String(error) });
      return {
        valid: false,
        error: 'Failed to decode token'
      };
    }
  }

  /**
   * Verifies token and returns user database record
   */
  async getUserFromToken(token: string): Promise<User | null> {
    try {
      console.log('✅ AuthService: Verifying JWT token...');
      const payload = verifyJWTToken(token);
      if (!payload) {
        console.log('❌ JWT token verification failed');
        return null;
      }

      console.log('✅ JWT payload verified, searching user by telegram_id:', payload.telegram_id);

      const [user] = await db.select()
        .from(users)
        .where(eq(users.telegram_id, payload.telegram_id))
        .limit(1);

      if (user) {
        console.log('✅ User found in database:', { id: user.id, telegram_id: user.telegram_id });
      } else {
        console.log('❌ User not found in database for telegram_id:', payload.telegram_id);
      }

      return user || null;
    } catch (error) {
      logger.error('[AuthService] Error getting user from token', { error: error instanceof Error ? error.message : String(error) });
      console.log('❌ Error getting user from token:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }


}