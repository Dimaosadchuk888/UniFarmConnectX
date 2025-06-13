import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
}

export interface TelegramInitData {
  user: TelegramUser;
  auth_date: number;
  hash: string;
  query_id?: string;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
}

export interface ValidationResult {
  valid: boolean;
  user?: TelegramUser;
  error?: string;
}

export interface JWTPayload {
  telegram_id: number;
  username?: string;
  ref_code?: string;
  iat: number;
  exp: number;
}

/**
 * Validates Telegram WebApp initData using HMAC-SHA256
 * According to official Telegram documentation
 */
export function validateTelegramInitData(initData: string, botToken: string): ValidationResult {
  try {
    if (!initData || !botToken) {
      return { valid: false, error: 'Missing initData or bot token' };
    }

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      return { valid: false, error: 'Hash parameter missing' };
    }

    // Remove hash from parameters
    urlParams.delete('hash');
    
    // Check auth_date (must be within last hour for security)
    const authDate = urlParams.get('auth_date');
    if (!authDate) {
      return { valid: false, error: 'auth_date parameter missing' };
    }

    const authTimestamp = parseInt(authDate);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const oneHour = 3600; // 1 hour in seconds

    if (currentTimestamp - authTimestamp > oneHour) {
      return { valid: false, error: 'initData expired (older than 1 hour)' };
    }

    // Sort parameters alphabetically and create verification string
    const sortedParams = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key using bot token
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Generate expected hash
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(sortedParams)
      .digest('hex');

    // Compare hashes
    if (expectedHash !== hash) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Parse user data
    const userParam = urlParams.get('user');
    if (!userParam) {
      return { valid: false, error: 'User data missing' };
    }

    let user: TelegramUser;
    try {
      user = JSON.parse(userParam);
    } catch {
      return { valid: false, error: 'Invalid user data format' };
    }

    // Validate required user fields
    if (!user.id || !user.first_name) {
      return { valid: false, error: 'Required user fields missing' };
    }

    return { valid: true, user };
  } catch (error) {
    console.error('[TelegramValidator] Validation error:', error);
    return { valid: false, error: 'Validation failed' };
  }
}

/**
 * Generates JWT token for authenticated Telegram user
 */
export function generateJWTToken(user: TelegramUser, refCode?: string): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable not set');
  }

  const payload: JWTPayload = {
    telegram_id: user.id,
    username: user.username,
    ref_code: refCode,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  };

  console.log('✅ Generating JWT token with payload:', { telegram_id: payload.telegram_id, ref_code: payload.ref_code });
  const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });
  console.log('✅ JWT token generated successfully');
  return token;
}

/**
 * Verifies JWT token and returns payload
 */
export function verifyJWTToken(token: string): JWTPayload | null {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable not set');
    }

    const payload = jwt.verify(token, jwtSecret) as JWTPayload;
    return payload;
  } catch (error) {
    console.error('[JWT] Verification error:', error);
    return null;
  }
}

/**
 * Extracts bearer token from Authorization header
 */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}