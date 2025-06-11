import { validateTelegramInitData, generateJWTToken, verifyJWTToken, type TelegramUser, type JWTPayload } from '../../utils/telegram';
import { db } from '../../server/db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';

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
  /**
   * Authenticates user via Telegram initData with HMAC validation
   */
  async authenticateWithTelegram(initData: string): Promise<AuthResponse> {
    try {
      console.log('[AuthService] Starting Telegram authentication');
      
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        throw new Error('TELEGRAM_BOT_TOKEN not configured');
      }

      // Validate initData using HMAC
      const validation = validateTelegramInitData(initData, botToken);
      if (!validation.valid || !validation.user) {
        console.error('[AuthService] Telegram validation failed:', validation.error);
        return {
          success: false,
          error: validation.error || 'Invalid Telegram data'
        };
      }

      const telegramUser = validation.user;
      console.log('[AuthService] Telegram validation successful for user ID:', telegramUser.id);

      // Find or create user in database
      let [dbUser] = await db.select()
        .from(users)
        .where(eq(users.telegram_id, telegramUser.id))
        .limit(1);

      if (!dbUser) {
        // Create new user
        const generateRefCode = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);
        const refCode = generateRefCode();
        const [newUser] = await db.insert(users).values({
          telegram_id: telegramUser.id,
          username: telegramUser.username || telegramUser.first_name,
          ref_code: refCode,
          balance_uni: '0',
          balance_ton: '0'
        }).returning();
        
        dbUser = newUser;
        console.log('[AuthService] Created new user with ID:', dbUser.id);
      } else {
        console.log('[AuthService] Found existing user with ID:', dbUser.id);
      }

      // Generate JWT token
      const token = generateJWTToken(telegramUser, dbUser.ref_code ?? undefined);

      return {
        success: true,
        user: {
          id: dbUser.id.toString(),
          telegram_id: telegramUser.id,
          username: telegramUser.username,
          ref_code: dbUser.ref_code ?? '',
          created_at: dbUser.created_at?.toISOString() || new Date().toISOString()
        },
        token
      };
    } catch (error) {
      console.error('[AuthService] Ошибка аутентификации через Telegram:', error);
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
      console.error('[AuthService] JWT validation error:', error);
      return false;
    }
  }

  /**
   * Gets session information from JWT token
   */
  async getSessionInfo(token: string): Promise<SessionInfo> {
    try {
      console.log('[AuthService] Getting session info from JWT');
      
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
      console.error('[AuthService] Error getting session info:', error);
      return {
        valid: false,
        error: 'Failed to decode token'
      };
    }
  }

  /**
   * Verifies token and returns user database record
   */
  async getUserFromToken(token: string): Promise<any> {
    try {
      const payload = verifyJWTToken(token);
      if (!payload) {
        return null;
      }

      const [user] = await db.select()
        .from(users)
        .where(eq(users.telegram_id, payload.telegram_id))
        .limit(1);

      return user || null;
    } catch (error) {
      console.error('[AuthService] Error getting user from token:', error);
      return null;
    }
  }
}