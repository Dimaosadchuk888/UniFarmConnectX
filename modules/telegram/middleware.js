// JavaScript версия Telegram middleware для модульной архитектуры

import crypto from 'crypto';

/**
 * Проверяет Telegram Init Data
 */
function validateTelegramInitData(initData, botToken) {
  if (!initData || !botToken) {
    return { valid: false, error: 'Missing init data or bot token' };
  }

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    
    if (calculatedHash !== hash) {
      return { valid: false, error: 'Hash mismatch' };
    }

    // Проверяем время
    const authDate = parseInt(urlParams.get('auth_date'));
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - authDate > 86400) { // 24 часа
      return { valid: false, error: 'Data too old' };
    }

    // Парсим user data
    const userParam = urlParams.get('user');
    if (!userParam) {
      return { valid: false, error: 'No user data' };
    }

    const userData = JSON.parse(decodeURIComponent(userParam));
    
    return {
      valid: true,
      user: userData,
      authDate
    };
  } catch (error) {
    return { valid: false, error: `Validation error: ${error.message}` };
  }
}

/**
 * Извлекает данные пользователя из заголовков
 */
function extractUserFromHeaders(req) {
  // Попытка извлечь из разных заголовков
  const initData = req.headers['x-telegram-init-data'] || 
                   req.headers['telegram-init-data'] ||
                   req.headers['x-init-data'];

  const userIdHeader = req.headers['x-telegram-user-id'];
  
  if (initData) {
    return { source: 'init-data', data: initData };
  }
  
  if (userIdHeader) {
    return { source: 'user-id', data: userIdHeader };
  }

  return null;
}

/**
 * Создает тестового пользователя для разработки
 */
function createTestUser(telegramId = '12345') {
  return {
    id: parseInt(telegramId),
    telegram_id: telegramId,
    username: `test_user_${telegramId}`,
    first_name: 'Test User',
    last_name: 'Dev',
    language_code: 'en',
    ref_code: `TEST${telegramId.slice(-3)}`,
    uni_balance: 1000,
    ton_balance: 0.1,
    created_at: new Date().toISOString()
  };
}

/**
 * Основной Telegram middleware
 */
function telegramMiddleware(req, res, next) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    console.log('[TelegramMiddleware] Processing request:', {
      url: req.url,
      method: req.method,
      has_bot_token: !!botToken,
      environment: process.env.NODE_ENV || 'development'
    });

    // Извлекаем данные пользователя
    const extracted = extractUserFromHeaders(req);
    
    if (!extracted && !isDevelopment) {
      return res.status(401).json({
        success: false,
        error: 'Требуется авторизация через Telegram Mini App',
        need_telegram_auth: true
      });
    }

    let telegramUser;
    let validated = false;

    if (extracted && botToken) {
      if (extracted.source === 'init-data') {
        const validation = validateTelegramInitData(extracted.data, botToken);
        if (validation.valid) {
          telegramUser = {
            ...validation.user,
            telegram_id: validation.user.id.toString(),
            ref_code: `REF${validation.user.id}`,
            uni_balance: 0,
            ton_balance: 0,
            created_at: new Date().toISOString()
          };
          validated = true;
        } else {
          console.warn('[TelegramMiddleware] Validation failed:', validation.error);
        }
      } else if (extracted.source === 'user-id') {
        telegramUser = createTestUser(extracted.data);
        validated = true;
      }
    }

    // Fallback для разработки
    if (!telegramUser && isDevelopment) {
      console.log('[TelegramMiddleware] Using development fallback user');
      telegramUser = createTestUser();
      validated = true;
    }

    if (!telegramUser) {
      return res.status(401).json({
        success: false,
        error: 'Не удалось аутентифицировать пользователя Telegram',
        need_telegram_auth: true
      });
    }

    // Добавляем данные в запрос
    req.telegram = {
      user: telegramUser,
      validated,
      source: extracted?.source || 'fallback'
    };

    console.log('[TelegramMiddleware] User authenticated:', {
      telegram_id: telegramUser.telegram_id,
      username: telegramUser.username,
      validated,
      source: req.telegram.source
    });

    next();
  } catch (error) {
    console.error('[TelegramMiddleware] Error processing request:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обработки Telegram авторизации',
      details: error.message
    });
  }
}

export { telegramMiddleware, validateTelegramInitData, createTestUser };