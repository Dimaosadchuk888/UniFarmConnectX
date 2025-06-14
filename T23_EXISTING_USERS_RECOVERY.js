/**
 * T23: Восстановление реферальных кодов для существующих пользователей
 * Автоматическое исправление аккаунтов без ref_code
 */

import { db } from './core/db.js';
import { users } from './shared/schema.js';
import { eq, isNull, sql } from 'drizzle-orm';
import { logger } from './core/logger/index.js';

class ExistingUsersRecovery {
  constructor() {
    this.fixedUsers = [];
    this.errors = [];
  }

  log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    const icon = level === 'success' ? '✅' : level === 'error' ? '❌' : level === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${icon} ${message}`);
    if (details) console.log(`    ${JSON.stringify(details, null, 2)}`);
  }

  /**
   * Поиск пользователей без реферальных кодов
   */
  async findUsersWithoutRefCodes() {
    this.log('info', 'Поиск пользователей без реферальных кодов...');
    
    try {
      const usersWithoutRefCodes = await db
        .select({
          id: users.id,
          telegram_id: users.telegram_id,
          username: users.username,
          created_at: users.created_at
        })
        .from(users)
        .where(isNull(users.ref_code));

      this.log('info', `Найдено пользователей без ref_code: ${usersWithoutRefCodes.length}`);
      
      return usersWithoutRefCodes;
    } catch (error) {
      this.log('error', 'Ошибка поиска пользователей', { error: error.message });
      throw error;
    }
  }

  /**
   * Генерация уникального реферального кода
   */
  generateRefCode(telegramId, userId) {
    const timestamp = Date.now();
    return `REF${telegramId || userId}${timestamp}`;
  }

  /**
   * Проверка уникальности реферального кода
   */
  async isRefCodeUnique(refCode) {
    try {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.ref_code, refCode))
        .limit(1);
      
      return !existing;
    } catch (error) {
      this.log('warning', 'Ошибка проверки уникальности ref_code', { refCode, error: error.message });
      return false;
    }
  }

  /**
   * Обновление реферального кода для пользователя
   */
  async updateUserRefCode(user) {
    try {
      let refCode = this.generateRefCode(user.telegram_id, user.id);
      let attempts = 0;
      const maxAttempts = 5;

      // Проверяем уникальность и генерируем новый код при необходимости
      while (!await this.isRefCodeUnique(refCode) && attempts < maxAttempts) {
        attempts++;
        refCode = this.generateRefCode(user.telegram_id, user.id + attempts);
      }

      if (attempts >= maxAttempts) {
        throw new Error(`Не удалось сгенерировать уникальный ref_code после ${maxAttempts} попыток`);
      }

      // Обновляем пользователя
      const [updatedUser] = await db
        .update(users)
        .set({ 
          ref_code: refCode,
          // Обновляем время последнего изменения для отслеживания
          created_at: user.created_at || sql`now()`
        })
        .where(eq(users.id, user.id))
        .returning({
          id: users.id,
          telegram_id: users.telegram_id,
          username: users.username,
          ref_code: users.ref_code
        });

      this.fixedUsers.push({
        user_id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        new_ref_code: refCode,
        timestamp: new Date().toISOString()
      });

      this.log('success', `Ref_code добавлен для пользователя ${user.id}`, {
        telegram_id: user.telegram_id,
        username: user.username,
        ref_code: refCode
      });

      return updatedUser;
    } catch (error) {
      this.errors.push({
        user_id: user.id,
        telegram_id: user.telegram_id,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      this.log('error', `Ошибка обновления пользователя ${user.id}`, {
        telegram_id: user.telegram_id,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Массовое восстановление реферальных кодов
   */
  async batchUpdateRefCodes(usersToUpdate) {
    this.log('info', `Начинаем восстановление ref_code для ${usersToUpdate.length} пользователей...`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const user of usersToUpdate) {
      try {
        await this.updateUserRefCode(user);
        successCount++;
        
        // Небольшая пауза между обновлениями для снижения нагрузки на БД
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        errorCount++;
        // Продолжаем обработку остальных пользователей
      }
    }

    this.log('info', `Восстановление завершено`, {
      total: usersToUpdate.length,
      success: successCount,
      errors: errorCount
    });

    return { successCount, errorCount };
  }

  /**
   * Проверка результатов восстановления
   */
  async verifyRecovery() {
    this.log('info', 'Проверка результатов восстановления...');
    
    try {
      // Проверяем, остались ли пользователи без ref_code
      const [remainingCount] = await db
        .select({ count: sql`count(*)` })
        .from(users)
        .where(isNull(users.ref_code));

      // Проверяем общее количество пользователей с ref_code
      const [totalWithRefCode] = await db
        .select({ count: sql`count(*)` })
        .from(users)
        .where(sql`ref_code IS NOT NULL`);

      this.log('success', 'Результаты проверки', {
        users_without_ref_code: remainingCount.count,
        users_with_ref_code: totalWithRefCode.count,
        fixed_in_this_session: this.fixedUsers.length
      });

      return {
        remainingWithoutRefCode: parseInt(remainingCount.count),
        totalWithRefCode: parseInt(totalWithRefCode.count),
        fixedInSession: this.fixedUsers.length
      };
    } catch (error) {
      this.log('error', 'Ошибка проверки результатов', { error: error.message });
      throw error;
    }
  }

  /**
   * Главный метод восстановления
   */
  async runRecovery() {
    this.log('info', 'Запуск восстановления реферальных кодов для существующих пользователей...');
    
    try {
      // 1. Находим пользователей без ref_code
      const usersToFix = await this.findUsersWithoutRefCodes();
      
      if (usersToFix.length === 0) {
        this.log('success', 'Все пользователи уже имеют реферальные коды');
        return {
          status: 'no_action_needed',
          message: 'Все пользователи уже имеют реферальные коды'
        };
      }

      // 2. Восстанавливаем ref_code для найденных пользователей
      const { successCount, errorCount } = await this.batchUpdateRefCodes(usersToFix);

      // 3. Проверяем результаты
      const verification = await this.verifyRecovery();

      // 4. Создаем итоговый отчет
      const report = {
        timestamp: new Date().toISOString(),
        task: 'T23_EXISTING_USERS_RECOVERY',
        status: errorCount === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
        
        summary: {
          users_found_without_ref_code: usersToFix.length,
          users_successfully_fixed: successCount,
          users_with_errors: errorCount,
          remaining_without_ref_code: verification.remainingWithoutRefCode
        },
        
        details: {
          fixed_users: this.fixedUsers,
          errors: this.errors
        },
        
        recommendations: [
          'Пользователи теперь могут получить свои реферальные ссылки без переустановки',
          'Реферальные коды автоматически отображаются на странице "Партнёрка"',
          'Новые пользователи автоматически получают ref_code при регистрации'
        ]
      };

      console.log('\n' + '='.repeat(80));
      console.log('ОТЧЕТ T23: ВОССТАНОВЛЕНИЕ РЕФЕРАЛЬНЫХ КОДОВ');
      console.log('='.repeat(80));
      console.log(JSON.stringify(report, null, 2));
      console.log('='.repeat(80));

      return report;

    } catch (error) {
      this.log('error', 'Критическая ошибка восстановления', { error: error.message });
      throw error;
    }
  }
}

async function main() {
  try {
    const recovery = new ExistingUsersRecovery();
    await recovery.runRecovery();
  } catch (error) {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запускаем только если файл вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ExistingUsersRecovery };