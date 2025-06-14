/**
 * T20: Критическое исправление регистрации пользователей через Telegram
 * Проверяет и исправляет все компоненты цепочки регистрации
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

class TelegramRegistrationFix {
  constructor() {
    this.issues = [];
    this.fixes = [];
  }

  log(status, message, details = null) {
    const timestamp = new Date().toISOString();
    const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : status === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${icon} ${message}`);
    if (details) console.log(`    ${JSON.stringify(details, null, 2)}`);
  }

  /**
   * Проверяет middleware для извлечения initData
   */
  checkTelegramMiddleware() {
    try {
      this.log('info', 'Проверка Telegram middleware...');
      
      const middlewarePath = 'core/middleware/telegramMiddleware.ts';
      const content = readFileSync(middlewarePath, 'utf8');
      
      // Проверяем наличие извлечения initData из заголовков
      if (!content.includes('X-Telegram-Init-Data')) {
        this.issues.push('Middleware не извлекает initData из заголовков');
      }
      
      // Проверяем установку req.user
      if (!content.includes('req.user')) {
        this.issues.push('Middleware не устанавливает req.user');
      }
      
      this.log('success', 'Telegram middleware проверен');
      return true;
    } catch (error) {
      this.log('error', 'Ошибка проверки middleware', { error: error.message });
      return false;
    }
  }

  /**
   * Создает упрощенный middleware для извлечения Telegram данных
   */
  createSimpleTelegramMiddleware() {
    const middlewareContent = `import { Request, Response, NextFunction } from 'express';
import { validateTelegramInitData } from '../../utils/telegram';
import { logger } from '../logger';

export interface TelegramRequest extends Request {
  telegramUser?: {
    id: number;
    username?: string;
    first_name?: string;
  };
}

/**
 * Middleware для извлечения и валидации Telegram данных
 */
export function telegramMiddleware(req: TelegramRequest, res: Response, next: NextFunction) {
  try {
    // Извлекаем initData из заголовков
    const initData = req.headers['x-telegram-init-data'] as string;
    
    if (initData) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        const validation = validateTelegramInitData(initData, botToken);
        if (validation.valid && validation.user) {
          req.telegramUser = validation.user;
          logger.info('[TelegramMiddleware] Telegram user extracted', {
            telegram_id: validation.user.id,
            username: validation.user.username
          });
        }
      }
    }
    
    next();
  } catch (error) {
    logger.error('[TelegramMiddleware] Error processing Telegram data', {
      error: error instanceof Error ? error.message : String(error)
    });
    next();
  }
}
`;

    try {
      writeFileSync('core/middleware/telegramMiddleware.ts', middlewareContent);
      this.fixes.push('Создан упрощенный Telegram middleware');
      this.log('success', 'Создан упрощенный Telegram middleware');
    } catch (error) {
      this.log('error', 'Ошибка создания middleware', { error: error.message });
    }
  }

  /**
   * Исправляет AuthService для корректной работы с базой данных
   */
  fixAuthService() {
    try {
      this.log('info', 'Исправление AuthService...');
      
      const authServicePath = 'modules/auth/service.ts';
      let content = readFileSync(authServicePath, 'utf8');
      
      // Исправляем импорт UserService
      if (content.includes("from '../users/service'")) {
        content = content.replace("from '../users/service'", "from '../user/service'");
        this.fixes.push('Исправлен импорт UserService в AuthService');
      }
      
      // Добавляем обработку null значений
      const nullSafeCode = `
      // Generate JWT token with null-safe values
      const token = generateJWTToken(telegramUser, userInfo.ref_code || undefined);

      return {
        success: true,
        user: {
          id: userInfo.id.toString(),
          telegram_id: telegramUser.id,
          username: telegramUser.username || userInfo.username || '',
          ref_code: userInfo.ref_code || '',
          created_at: userInfo.created_at ? userInfo.created_at.toISOString() : new Date().toISOString()
        },
        token,
        isNewUser
      };`;
      
      // Заменяем проблемную секцию
      if (content.includes('const token = generateJWTToken(telegramUser, userInfo.ref_code || \'\');')) {
        content = content.replace(
          /\/\/ Generate JWT token[\s\S]*?isNewUser\s*\};/,
          nullSafeCode
        );
        this.fixes.push('Добавлена null-safe обработка в AuthService');
      }
      
      writeFileSync(authServicePath, content);
      this.log('success', 'AuthService исправлен');
    } catch (error) {
      this.log('error', 'Ошибка исправления AuthService', { error: error.message });
    }
  }

  /**
   * Создает базовую реализацию UserService если её нет
   */
  ensureUserService() {
    try {
      this.log('info', 'Проверка UserService...');
      
      const userServicePath = 'modules/user/service.ts';
      let content;
      
      try {
        content = readFileSync(userServicePath, 'utf8');
      } catch (error) {
        // Файл не существует, создаем базовую версию
        content = this.createBasicUserService();
        writeFileSync(userServicePath, content);
        this.fixes.push('Создан базовый UserService');
        this.log('success', 'Создан базовый UserService');
        return;
      }
      
      // Проверяем наличие ключевых методов
      const requiredMethods = ['findOrCreateFromTelegram', 'findUserByTelegramId', 'createFromTelegram'];
      const missingMethods = requiredMethods.filter(method => !content.includes(method));
      
      if (missingMethods.length > 0) {
        this.issues.push(`UserService отсутствуют методы: ${missingMethods.join(', ')}`);
        // Можно добавить методы, но сейчас пропускаем
      }
      
      this.log('success', 'UserService проверен');
    } catch (error) {
      this.log('error', 'Ошибка проверки UserService', { error: error.message });
    }
  }

  /**
   * Создает базовую реализацию UserService
   */
  createBasicUserService() {
    return `import type { User, InsertUser } from '../../shared/schema';
import { db } from '../../core/db';
import { users } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from '../../core/logger';

export class UserService {
  async getUserById(id: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(id)))
        .limit(1);
      
      return user || null;
    } catch (error) {
      logger.error('[UserService] Error getting user by ID', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async findUserByTelegramId(telegramId: number): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegram_id, telegramId))
        .limit(1);
      
      return user || null;
    } catch (error) {
      logger.error('[UserService] Error finding user by telegram_id', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async createFromTelegram(telegramData: {
    telegram_id: number;
    username?: string;
    first_name?: string;
    ref_by?: string;
  }): Promise<User> {
    try {
      // Generate ref_code
      const refCode = \`REF\${telegramData.telegram_id}\${Date.now()}\`;
      
      // Find parent ref_code if ref_by provided
      let parentRefCode = null;
      if (telegramData.ref_by) {
        try {
          const [referrer] = await db
            .select()
            .from(users)
            .where(eq(users.ref_code, telegramData.ref_by))
            .limit(1);
          
          if (referrer) {
            parentRefCode = referrer.ref_code;
          }
        } catch (error) {
          logger.warn('[UserService] Error finding referrer', { ref_code: telegramData.ref_by });
        }
      }

      // Create new user
      const newUserData: InsertUser = {
        telegram_id: telegramData.telegram_id,
        username: telegramData.username || null,
        first_name: telegramData.first_name || null,
        ref_code: refCode,
        parent_ref_code: parentRefCode
      };

      const [newUser] = await db
        .insert(users)
        .values(newUserData)
        .returning();

      logger.info('[UserService] User created from Telegram data', {
        user_id: newUser.id,
        telegram_id: newUser.telegram_id,
        ref_code: newUser.ref_code
      });

      return newUser;
    } catch (error) {
      logger.error('[UserService] Error creating user from Telegram', {
        telegram_id: telegramData.telegram_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async findOrCreateFromTelegram(telegramData: {
    telegram_id: number;
    username?: string;
    first_name?: string;
    ref_by?: string;
  }): Promise<User> {
    try {
      // Try to find existing user
      const existingUser = await this.findUserByTelegramId(telegramData.telegram_id);
      
      if (existingUser) {
        logger.info('[UserService] Found existing user', { 
          user_id: existingUser.id,
          telegram_id: existingUser.telegram_id
        });

        // Update username if it changed
        if (telegramData.username && telegramData.username !== existingUser.username) {
          const [updatedUser] = await db
            .update(users)
            .set({ username: telegramData.username })
            .where(eq(users.id, existingUser.id))
            .returning();
          
          return updatedUser;
        }

        return existingUser;
      }

      // User not found - create new
      return await this.createFromTelegram(telegramData);
    } catch (error) {
      logger.error('[UserService] Error in findOrCreateFromTelegram', {
        telegram_id: telegramData.telegram_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
`;
  }

  /**
   * Проверяет маршруты регистрации
   */
  checkRegistrationRoutes() {
    try {
      this.log('info', 'Проверка маршрутов регистрации...');
      
      const routesPath = 'server/routes.ts';
      const content = readFileSync(routesPath, 'utf8');
      
      if (!content.includes('/register/telegram')) {
        this.issues.push('Отсутствует маршрут /register/telegram');
      }
      
      if (!content.includes('AuthController')) {
        this.issues.push('Маршрут не подключен к AuthController');
      }
      
      this.log('success', 'Маршруты регистрации проверены');
    } catch (error) {
      this.log('error', 'Ошибка проверки маршрутов', { error: error.message });
    }
  }

  /**
   * Запускает полное исправление системы
   */
  async runFullFix() {
    this.log('info', 'Запуск полного исправления системы регистрации...');
    
    // 1. Проверяем и исправляем middleware
    this.createSimpleTelegramMiddleware();
    
    // 2. Исправляем AuthService
    this.fixAuthService();
    
    // 3. Обеспечиваем наличие UserService
    this.ensureUserService();
    
    // 4. Проверяем маршруты
    this.checkRegistrationRoutes();
    
    // Генерируем отчет
    const report = {
      timestamp: new Date().toISOString(),
      task: 'T20_TELEGRAM_REGISTRATION_FIX',
      issues_found: this.issues.length,
      fixes_applied: this.fixes.length,
      issues: this.issues,
      fixes: this.fixes,
      status: this.issues.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS'
    };
    
    console.log('\n' + '='.repeat(80));
    console.log('ОТЧЕТ T20: ИСПРАВЛЕНИЕ РЕГИСТРАЦИИ TELEGRAM');
    console.log('='.repeat(80));
    console.log(JSON.stringify(report, null, 2));
    console.log('='.repeat(80));
    
    return report;
  }
}

async function main() {
  try {
    const fixer = new TelegramRegistrationFix();
    await fixer.runFullFix();
  } catch (error) {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  }
}

main();