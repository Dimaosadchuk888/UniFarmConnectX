// JavaScript версия главного индекса модулей UniFarm

// User Module
class UserController {
  async getCurrentUser(req, res) {
    try {
      const telegramUser = req.telegram?.user;
      const isValidated = req.telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App',
          need_telegram_auth: true
        });
      }
      
      return res.json({
        success: true,
        data: {
          id: telegramUser.id,
          telegram_id: telegramUser.telegram_id,
          username: telegramUser.username || telegramUser.first_name,
          first_name: telegramUser.first_name,
          ref_code: telegramUser.ref_code,
          ref_by: null,
          uni_balance: telegramUser.uni_balance || 0,
          ton_balance: telegramUser.ton_balance || 0,
          balance_uni: telegramUser.uni_balance || 0,
          balance_ton: telegramUser.ton_balance || 0,
          created_at: new Date().toISOString(),
          is_telegram_user: true,
          auth_method: 'telegram'
        }
      });
    } catch (error) {
      console.error('[User] Ошибка:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера при обработке Telegram авторизации',
        details: error.message
      });
    }
  }

  async generateRefCode(req, res) {
    try {
      const telegramUser = req.telegram?.user;
      
      if (!telegramUser || !req.telegram?.validated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram'
        });
      }

      if (telegramUser.ref_code) {
        return res.json({
          success: true,
          data: {
            ref_code: telegramUser.ref_code,
            already_exists: true
          }
        });
      }

      const refCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      res.json({
        success: true,
        data: {
          ref_code: refCode,
          generated: true
        }
      });
    } catch (error) {
      console.error('[RefCode] Ошибка генерации:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка генерации реферального кода',
        details: error.message
      });
    }
  }
}

// Wallet Module
class WalletController {
  async getWalletData(req, res) {
    try {
      const telegramUser = req.telegram?.user;
      const isValidated = req.telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App'
        });
      }

      const walletData = {
        uni_balance: telegramUser.uni_balance || 0,
        ton_balance: telegramUser.ton_balance || 0,
        total_earned: 0,
        total_spent: 0,
        transactions: []
      };

      console.log('[Wallet] Данные кошелька для пользователя:', {
        telegram_id: telegramUser.telegram_id,
        uni_balance: walletData.uni_balance,
        ton_balance: walletData.ton_balance
      });

      res.json({
        success: true,
        data: walletData
      });
    } catch (error) {
      console.error('[Wallet] Ошибка получения данных кошелька:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения данных кошелька',
        details: error.message
      });
    }
  }
}

// Farming Module
class FarmingController {
  async getFarmingData(req, res) {
    try {
      const telegramUser = req.telegram?.user;
      const isValidated = req.telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App'
        });
      }

      // Базовая симуляция фарминга
      const baseRate = 0.001;
      const accumulated = Math.random() * 0.5; // Случайное накопление до 0.5 UNI
      
      const farmingData = {
        rate: baseRate.toFixed(6),
        accumulated: accumulated.toFixed(6),
        last_claim: null,
        can_claim: accumulated >= 0.001,
        next_claim_available: null
      };

      console.log('[Farming] Данные фарминга для пользователя:', {
        telegram_id: telegramUser.telegram_id,
        farming_data: farmingData
      });

      res.json({
        success: true,
        data: farmingData
      });
    } catch (error) {
      console.error('[Farming] Ошибка получения данных фарминга:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения данных фарминга',
        details: error.message
      });
    }
  }
}

// Missions Module
class MissionsController {
  async getActiveMissions(req, res) {
    try {
      const telegramUser = req.telegram?.user;
      const isValidated = req.telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App'
        });
      }

      const missions = [
        {
          id: 1,
          title: "Ежедневная проверка",
          description: "Проверьте приложение каждый день",
          reward: 100,
          type: "daily",
          completed: false,
          completed_at: null
        },
        {
          id: 2,
          title: "Пригласить друга",
          description: "Пригласите друга через реферальную ссылку",
          reward: 500,
          type: "referral",
          completed: false,
          completed_at: null
        },
        {
          id: 3,
          title: "Фарминг токенов",
          description: "Соберите 1000 UNI токенов",
          reward: 200,
          type: "farming",
          completed: false,
          completed_at: null
        }
      ];

      console.log('[Missions] Получены миссии для пользователя:', {
        telegram_id: telegramUser.telegram_id,
        missions_count: missions.length
      });

      res.json({
        success: true,
        data: missions
      });
    } catch (error) {
      console.error('[Missions] Ошибка получения миссий:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения активных миссий',
        details: error.message
      });
    }
  }
}

// Telegram Module
class TelegramController {
  async debugMiddleware(req, res) {
    const telegramData = req.telegram;
    const headers = {
      'x-telegram-init-data': req.headers['x-telegram-init-data'],
      'x-telegram-user-id': req.headers['x-telegram-user-id'],
      'telegram-init-data': req.headers['telegram-init-data']
    };
    
    console.log('[TelegramDebug] Состояние middleware:', {
      has_telegram: !!telegramData,
      validated: telegramData?.validated,
      has_user: !!telegramData?.user,
      user_id: telegramData?.user?.id,
      telegram_id: telegramData?.user?.telegram_id
    });
    
    res.json({
      success: true,
      data: {
        middleware_active: !!telegramData,
        validated: telegramData?.validated || false,
        user_present: !!telegramData?.user,
        user_data: telegramData?.user ? {
          id: telegramData.user.id,
          telegram_id: telegramData.user.telegram_id,
          username: telegramData.user.username,
          ref_code: telegramData.user.ref_code
        } : null,
        headers_received: headers,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Telegram Middleware
function telegramMiddleware(req, res, next) {
  // Упрощенная версия для тестирования модульной архитектуры
  req.telegram = {
    user: {
      id: 12345,
      telegram_id: '12345',
      username: 'test_user',
      first_name: 'Test User',
      ref_code: 'TEST123',
      uni_balance: 1000,
      ton_balance: 0.1
    },
    validated: true
  };
  next();
}

// Экспорты
export {
  UserController,
  WalletController,
  FarmingController,
  MissionsController,
  TelegramController,
  telegramMiddleware
};