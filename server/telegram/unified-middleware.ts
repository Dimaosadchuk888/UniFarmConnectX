/**
 * Unified Telegram Integration Middleware
 * Consolidates all Telegram WebApp processing into one stable handler
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      telegram?: {
        user?: any;
        initData?: string;
        validated?: boolean;
        userId?: number;
        startParam?: string;
      };
    }
  }
}

/**
 * Generate unique referral code
 */
function generateRefCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Validate Telegram initData signature
 */
function validateTelegramInitData(initData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) return false;

    urlParams.delete('hash');

    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return calculatedHash === hash;
  } catch (error) {
    console.error('[Telegram Validation] Error:', error);
    return false;
  }
}

/**
 * Create or update Telegram user in database
 */
async function createOrUpdateTelegramUser(userData: any, startParam?: string): Promise<any> {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const telegramId = userData.id.toString();
    const username = userData.username || `user_${userData.id}`;
    const firstName = userData.first_name || '';
    const lastName = userData.last_name || '';

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id, ref_code, uni_balance, ton_balance FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    if (existingUser.rows.length > 0) {
      // Update existing user
      await pool.query(
        `UPDATE users SET 
         username = $1, first_name = $2, last_name = $3, 
         updated_at = NOW() 
         WHERE telegram_id = $4`,
        [username, firstName, lastName, telegramId]
      );
      
      const user = existingUser.rows[0];
      await pool.end();
      
      console.log('[Telegram User] Updated existing user:', telegramId);
      return {
        id: user.id,
        telegram_id: telegramId,
        username,
        ref_code: user.ref_code,
        uni_balance: parseFloat(user.uni_balance) || 0,
        ton_balance: parseFloat(user.ton_balance) || 0
      };
    } else {
      // Create new user
      const refCode = generateRefCode();
      const refBy = startParam || null;

      const result = await pool.query(`
        INSERT INTO users (
          telegram_id, username, first_name, last_name, ref_code, ref_by,
          uni_balance, ton_balance, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id, ref_code, uni_balance, ton_balance
      `, [
        telegramId, username, firstName, lastName, refCode, refBy,
        1000.0, // Initial UNI balance
        0.1     // Initial TON balance
      ]);

      const newUser = result.rows[0];
      await pool.end();

      console.log('[Telegram User] Created new user:', {
        id: newUser.id,
        telegram_id: telegramId,
        username,
        ref_code: refCode,
        ref_by: refBy
      });

      return {
        id: newUser.id,
        telegram_id: telegramId,
        username,
        ref_code: refCode,
        uni_balance: parseFloat(newUser.uni_balance) || 0,
        ton_balance: parseFloat(newUser.ton_balance) || 0
      };
    }
  } catch (error) {
    console.error('[Telegram User] Database error:', error);
    throw error;
  }
}

/**
 * Main Telegram middleware - processes initData and creates/updates users
 */
export const unifiedTelegramMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Get initData from various sources
  let initData = req.headers['x-telegram-init-data'] || 
                 req.headers['telegram-init-data'] || 
                 req.body?.initData ||
                 req.query?.initData;

  // Check URL parameters for GET requests
  if (!initData && req.url.includes('tgWebAppData=')) {
    try {
      const urlParams = new URLSearchParams(req.url.split('?')[1]);
      initData = urlParams.get('tgWebAppData');
    } catch (e) {
      console.log('[Unified Telegram] Could not extract initData from URL');
    }
  }

  if (!initData) {
    console.log('[Unified Telegram] No initData found in request');
    req.telegram = { validated: false };
    return next();
  }

  try {
    console.log('[Unified Telegram] Processing initData...');

    // Decode if needed
    let decodedInitData = typeof initData === 'string' ? initData : initData.toString();
    if (decodedInitData.includes('%')) {
      decodedInitData = decodeURIComponent(decodedInitData);
    }

    // Validate initData
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    let isValid = true;

    if (botToken && process.env.VALIDATE_TELEGRAM_DATA !== 'false') {
      isValid = validateTelegramInitData(decodedInitData, botToken);
      console.log('[Unified Telegram] Validation result:', isValid);
    }

    // Parse initData
    const urlParams = new URLSearchParams(decodedInitData);
    const userParam = urlParams.get('user');
    const authDate = urlParams.get('auth_date');
    const startParam = urlParams.get('start_param');

    if (userParam) {
      let userData;
      try {
        userData = JSON.parse(decodeURIComponent(userParam));
      } catch (parseError) {
        userData = JSON.parse(userParam);
      }

      if (authDate) {
        userData.auth_date = parseInt(authDate);
      }
      if (startParam) {
        userData.start_param = startParam;
      }

      // Create or update user in database
      const dbUser = await createOrUpdateTelegramUser(userData, startParam);

      req.telegram = {
        user: dbUser,
        initData: decodedInitData,
        validated: isValid,
        userId: dbUser.id,
        startParam: startParam
      };

      console.log('[Unified Telegram] User processed:', {
        id: dbUser.id,
        telegram_id: dbUser.telegram_id,
        username: dbUser.username,
        ref_code: dbUser.ref_code,
        validated: isValid
      });

    } else {
      console.log('[Unified Telegram] No user parameter found in initData');
      req.telegram = { validated: false };
    }
  } catch (error) {
    console.error('[Unified Telegram] Error processing initData:', error);
    req.telegram = { validated: false };
  }

  next();
};