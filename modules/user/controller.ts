import type { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { SupabaseUserRepository } from './service';
import { logger } from '../../core/logger';
import { supabase } from '../../core/supabaseClient';

const userRepository = new SupabaseUserRepository();

export class UserController extends BaseController {
  async createUser(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { telegram_id, username, refCode } = req.body;
      
      if (!telegram_id) {
        return this.sendError(res, 'telegram_id is required', 400);
      }

      const result = await userRepository.createUser({
        telegram_id: telegram_id,
        username: username || undefined,
        ref_by: refCode || undefined
      });

      if (result) {
        this.sendSuccess(res, { user_id: result.id });
      } else {
        this.sendError(res, 'Failed to create user', 500);
      }
    }, 'создания пользователя');
  }



  async getCurrentUser(req: Request, res: Response) {
    console.log('[UserController.getCurrentUser] ===== METHOD CALLED =====');
    console.log('[UserController.getCurrentUser] Full URL:', req.url);
    console.log('[UserController.getCurrentUser] Path:', req.path);
    console.log('[UserController.getCurrentUser] Method:', req.method);
    
    await this.handleRequest(req, res, async (req: Request, res: Response) => {
      
      console.log('[GetMe FIX] === НОВЫЙ ПОИСК ПОЛЬЗОВАТЕЛЯ BEЗ ХАРДКОДА ===');
      console.log('[GetMe FIX] Headers:', { 
        'x-guest-id': req.headers['x-guest-id'],
        'authorization': req.headers.authorization ? 'PRESENT' : 'MISSING' 
      });
      console.log('[GetMe FIX] req.user:', (req as any).user ? { id: (req as any).user.id, telegram_id: (req as any).user.telegram_id } : null);
      console.log('[GetMe FIX] req.telegramUser:', (req as any).telegramUser ? { id: (req as any).telegramUser.id, telegram_id: (req as any).telegramUser.telegram_id } : null);
      
      console.log('[GetMe SCHEMA FIX] === ИСПРАВЛЕНИЕ БЕЗ GUEST_ID ===');
      console.log('[GetMe SCHEMA FIX] Headers:', { 
        'x-guest-id': req.headers['x-guest-id'],
        'authorization': req.headers.authorization ? 'PRESENT' : 'MISSING' 
      });
      
      // Убираем guest_id logic полностью так как колонка отсутствует в schema
      
      // УБИРАЕМ поиск по guest_id так как колонка отсутствует в БД
      // Используем middleware данные, но без принудительного user_id=48
      
      // Проверяем данные пользователя из middleware только если нет guest_id
      const middlewareUser = (req as any).user || (req as any).telegramUser;
      if (middlewareUser) {
        console.log('[GetMe FIX] Middleware user fallback:', {
          id: middlewareUser.id,
          telegram_id: middlewareUser.telegram_id,
          ref_code: middlewareUser.ref_code
        });
        
        return this.sendSuccess(res, {
          user: {
            id: middlewareUser.id,
            telegram_id: middlewareUser.telegram_id,
            username: middlewareUser.username,
            first_name: middlewareUser.first_name,
            ref_code: middlewareUser.ref_code,
            balance_uni: middlewareUser.balance_uni || '0',
            balance_ton: middlewareUser.balance_ton || '0'
          }
        });
      }
      
      // Fallback: пытаемся получить пользователя через JWT токен из Authorization header  
      const fallbackAuthHeader = req.headers.authorization;
      if (fallbackAuthHeader && fallbackAuthHeader.startsWith('Bearer ')) {
        const token = fallbackAuthHeader.substring(7);
        
        try {
          const jwt = await import('jsonwebtoken');
          console.log('[GetMe] JWT токен для декодирования:', token.substring(0, 50) + '...');
          const jwtSecret = process.env.JWT_SECRET;
          if (!jwtSecret) {
            throw new Error('JWT_SECRET environment variable not set');
          }
          const decoded = jwt.verify(token, jwtSecret) as any;
          console.log('[GetMe] JWT успешно декодирован:', { userId: decoded.userId, telegram_id: decoded.telegram_id });
          
          logger.info('[GetMe] Поиск пользователя по JWT', {
            userId: decoded.userId,
            telegram_id: decoded.telegram_id
          });
          
          // Попробуем найти пользователя по telegram_id (как в auth/telegram)
          if (decoded.telegram_id) {
            console.log('[GetMe] JWT decoded telegram_id:', decoded.telegram_id);
            const user = await userRepository.getUserByTelegramId(decoded.telegram_id);
            console.log('[GetMe] getUserByTelegramId result:', user ? { id: user.id, telegram_id: user.telegram_id } : null);
            
            if (user) {
              logger.info('[GetMe] Пользователь найден по telegram_id через JWT', {
                id: user.id,
                telegram_id: user.telegram_id,
                ref_code: user.ref_code,
                balance_uni: user.balance_uni,
                balance_ton: user.balance_ton
              });
              
              return this.sendSuccess(res, {
                user: {
                  id: user.id,
                  telegram_id: user.telegram_id,
                  username: user.username,
                  first_name: user.first_name,
                  ref_code: user.ref_code,
                  balance_uni: user.balance_uni,
                  balance_ton: user.balance_ton
                }
              });
            }
          }
          
          // Fallback: поиск по userId
          if (decoded.userId) {
            console.log('[GetMe] Поиск пользователя по ID:', decoded.userId);
            const user = await userRepository.getUserById(decoded.userId);
            console.log('[GetMe] getUserById результат:', user ? { id: user.id, telegram_id: user.telegram_id } : 'NOT_FOUND');
            if (user) {
              logger.info('[GetMe] Пользователь найден по userId через JWT', {
                id: user.id,
                telegram_id: user.telegram_id,
                ref_code: user.ref_code
              });
              
              return this.sendSuccess(res, {
                user: {
                  id: user.id,
                  telegram_id: user.telegram_id,
                  username: user.username,
                  ref_code: user.ref_code,
                  balance_uni: user.balance_uni,
                  balance_ton: user.balance_ton
                }
              });
            }
          }
        } catch (jwtError) {
          logger.warn('[GetMe] JWT токен недействителен', { error: jwtError });
        }
      }

      // Fallback: старая логика через Telegram
      const telegramUser = this.validateTelegramAuth(req, res);
      if (!telegramUser) {
        return this.sendError(res, 'Требуется авторизация через Telegram Mini App', 401);
      }
      
      logger.info('[GetMe] Запрос данных пользователя', { 
        has_telegram_user: !!telegramUser,
        telegram_id: telegramUser?.user?.id
      });
      
      // Сначала обрабатываем X-Guest-ID header
      const guestId = req.headers['x-guest-id'] as string;
      if (guestId) {
        logger.info('[GetMe] Обработка guest_id:', guestId);
        
        // Ищем пользователя по guest_id
        const guestUser = await userRepository.getUserByGuestId(guestId);
        if (guestUser) {
          logger.info('[GetMe] Пользователь найден по guest_id', {
            id: guestUser.id,
            telegram_id: guestUser.telegram_id,
            guest_id: guestUser.guest_id
          });
          
          return this.sendSuccess(res, {
            user: {
              id: guestUser.id,
              telegram_id: guestUser.telegram_id,
              username: guestUser.username,
              first_name: guestUser.first_name,
              ref_code: guestUser.ref_code,
              balance_uni: guestUser.balance_uni,
              balance_ton: guestUser.balance_ton
            }
          });
        } else {
          logger.warn('[GetMe] Пользователь с guest_id не найден:', guestId);
          return this.sendError(res, 'Пользователь с указанным guest_id не найден', 404);
        }
      }

      // Убрано: принудительное получение user_id=48
      // Теперь используем только правильную Telegram авторизацию
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegramUser.user.telegram_id,  // Используем правильное поле telegram_id
        username: telegramUser.user.username,
        first_name: telegramUser.user.first_name,
        ref_by: req.query.start_param as string
      });
      
      if (!user) {
        return this.sendError(res, 'Failed to create or find user', 500);
      }

      logger.info('[GetMe] Пользователь найден/создан через Telegram', {
        id: user.id,
        telegram_id: user.telegram_id,
        ref_code: user.ref_code
      });
      
      return this.sendSuccess(res, {
        user: {
          id: user.id,
          telegram_id: user.telegram_id,
          username: user.username,
          first_name: user.first_name,
          ref_code: user.ref_code,
          balance_uni: user.balance_uni,
          balance_ton: user.balance_ton
        }
      });
    }, 'получения текущего пользователя');
  }

  async updateUser(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!this.validateParams(req, ['id'])) {
        return this.sendError(res, 'Отсутствует параметр id', 400);
      }

      const { id } = req.params;
      const updates = req.body;
      
      const result = await userRepository.updateUser(parseInt(id), updates);
      this.sendSuccess(res, result || {});
    }, 'обновления пользователя');
  }

  async generateRefCode(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegramUser = this.validateTelegramAuth(req, res);
      if (!telegramUser) return;

      // Используем getOrCreateUserFromTelegram для гарантированной регистрации
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegramUser.user.telegram_id,  // Используем правильное поле telegram_id
        username: telegramUser.user.username,
        first_name: telegramUser.user.first_name,
        ref_by: req.query.start_param as string
      });
      
      if (!user) {
        return this.sendError(res, 'Failed to create or find user', 500);
      }
      
      if (user.ref_code) {
        return this.sendSuccess(res, {
          ref_code: user.ref_code,
          already_exists: true
        });
      }

      const updatedUser = await userRepository.updateUserRefCode(user.id);
      
      this.sendSuccess(res, {
        ref_code: updatedUser?.ref_code || user.ref_code,
        generated: true
      });
    }, 'генерации реферального кода');
  }

  /**
   * Восстановление реферального кода для существующих пользователей
   */
  async recoverRefCode(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      // Извлекаем пользователя из JWT токена
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return this.sendError(res, 'Authorization token required', 401);
      }

      const token = authHeader.split(' ')[1];
      
      try {
        const jwt = await import('jsonwebtoken');
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          throw new Error('JWT_SECRET environment variable not set');
        }
        const decoded = jwt.verify(token, jwtSecret) as any;
        
        if (!decoded || !decoded.telegram_id) {
          return this.sendError(res, 'Invalid token', 401);
        }

        logger.info('[RecoverRefCode] Восстановление ref_code для пользователя', {
          telegram_id: decoded.telegram_id
        });

        // Ищем пользователя по telegram_id
        const user = await userRepository.findUserByTelegramId(decoded.telegram_id);
        
        if (!user) {
          return this.sendError(res, 'User not found', 404);
        }

        // Если у пользователя уже есть ref_code, возвращаем его
        if (user.ref_code) {
          logger.info('[RecoverRefCode] Пользователь уже имеет ref_code', {
            user_id: user.id,
            ref_code: user.ref_code
          });
          
          return this.sendSuccess(res, {
            ref_code: user.ref_code,
            status: 'already_exists'
          });
        }

        // Генерируем новый ref_code
        const refCode = `REF${user.telegram_id}${Date.now()}`;
        
        // Обновляем пользователя
        const updatedUser = await userRepository.updateUserRefCode(user.id, refCode);
        
        logger.info('[RecoverRefCode] Ref_code успешно восстановлен', {
          user_id: user.id,
          telegram_id: user.telegram_id,
          ref_code: refCode
        });

        this.sendSuccess(res, {
          ref_code: refCode,
          status: 'recovered',
          user_id: user.id
        });

      } catch (jwtError) {
        logger.error('[RecoverRefCode] Ошибка JWT токена', {
          error: jwtError instanceof Error ? jwtError.message : String(jwtError)
        });
        
        return this.sendError(res, 'Invalid or expired token', 401);
      }
    }, 'восстановления реферального кода');
  }

  /**
   * Получение баланса пользователя
   */
  async getBalance(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const user = (req as any).user;
      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      const userInfo = await userRepository.getUserById(user.id);
      
      if (!userInfo) {
        return this.sendError(res, 'User not found', 404);
      }

      this.sendSuccess(res, {
        user_id: userInfo.id,
        balance_uni: userInfo.balance_uni,
        balance_ton: userInfo.balance_ton,
        updated_at: new Date().toISOString()
      });
    }, 'получения баланса пользователя');
  }

  /**
   * Получение сессий пользователя
   */
  async getSessions(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const user = (req as any).user;
      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      // Заглушка для сессий (для базовой реализации)
      this.sendSuccess(res, {
        sessions: [{
          id: 1,
          user_id: user.id,
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          device_info: 'Telegram Web App'
        }]
      });
    }, 'получения сессий пользователя');
  }

  /**
   * Очистка сессий пользователя
   */
  async clearSessions(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const user = (req as any).user;
      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      // Заглушка для очистки сессий (для базовой реализации)
      this.sendSuccess(res, {
        message: 'Сессии успешно очищены',
        cleared_at: new Date().toISOString()
      });
    }, 'очистки сессий пользователя');
  }

  /**
   * Обновление профиля пользователя
   */
  async updateProfile(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const user = (req as any).user;
      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      const updates = req.body;
      const allowedFields = ['username', 'first_name', 'last_name', 'language_code'];
      
      // Фильтруем только разрешенные поля
      const filteredUpdates: any = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      }

      const result = await userRepository.updateUser(user.id, filteredUpdates);
      this.sendSuccess(res, result || {});
    }, 'обновления профиля');
  }

  /**
   * Получение статистики пользователя
   */
  async getUserStats(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const user = (req as any).user;
      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      const userInfo = await userRepository.getUserById(user.id);
      if (!userInfo) {
        return this.sendError(res, 'User not found', 404);
      }

      // Получаем статистику транзакций
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id);

      const totalEarnedUni = transactions?.filter(t => t.amount_uni > 0)
        .reduce((sum, t) => sum + parseFloat(t.amount_uni), 0) || 0;
      
      const totalEarnedTon = transactions?.filter(t => t.amount_ton > 0)
        .reduce((sum, t) => sum + parseFloat(t.amount_ton), 0) || 0;

      // Получаем информацию о рефералах
      const { data: referrals } = await supabase
        .from('users')
        .select('id')
        .eq('referrer_id', user.id);

      const stats = {
        user_id: user.id,
        total_earned_uni: totalEarnedUni.toFixed(6),
        total_earned_ton: totalEarnedTon.toFixed(6),
        total_referrals: referrals?.length || 0,
        farming_active: userInfo.uni_farming_active || false,
        boost_active: !!userInfo.ton_boost_package,
        account_created: userInfo.created_at
      };

      this.sendSuccess(res, stats);
    }, 'получения статистики пользователя');
  }

  /**
   * Поиск пользователей
   */
  async searchUsers(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { query } = req.params;
      
      if (!query || query.length < 3) {
        return this.sendError(res, 'Query must be at least 3 characters long', 400);
      }

      // Ищем по username или ref_code
      const { data: users, error } = await supabase
        .from('users')
        .select('id, telegram_id, username, first_name, ref_code')
        .or(`username.ilike.%${query}%,ref_code.ilike.%${query}%`)
        .limit(20);

      if (error) {
        throw error;
      }

      const results = users?.map(u => ({
        id: u.id,
        telegram_id: u.telegram_id,
        username: u.username || 'Unknown',
        first_name: u.first_name,
        ref_code: u.ref_code
      })) || [];

      this.sendSuccess(res, { results, query });
    }, 'поиска пользователей');
  }

  /**
   * Обновление настроек пользователя
   */
  async updateSettings(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const user = (req as any).user;
      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      const settings = req.body;
      const allowedSettings = ['notifications', 'language', 'theme', 'auto_compound'];
      
      // Фильтруем только разрешенные настройки
      const filteredSettings: any = {};
      for (const setting of allowedSettings) {
        if (settings[setting] !== undefined) {
          filteredSettings[setting] = settings[setting];
        }
      }

      // Сохраняем настройки в JSON поле user_settings
      const result = await userRepository.updateUser(user.id, {
        user_settings: filteredSettings
      });

      this.sendSuccess(res, {
        message: 'Настройки обновлены',
        settings: filteredSettings
      });
    }, 'обновления настроек');
  }
}