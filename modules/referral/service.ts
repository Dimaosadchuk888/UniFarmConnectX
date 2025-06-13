/**
 * Серверный сервис для обработки реферальных ссылок и кодов
 * 
 * Этот сервис отвечает за:
 * 1. Генерацию реферальных кодов
 * 2. Проверку валидности реферального кода
 * 3. Применение реферального кода при создании новых пользователей
 * 4. Получение статистики рефералов
 */

import { logger } from '../../core/logger';

export class ReferralService {

  /**
   * Генерирует уникальный реферальный код для пользователя
   */
  async generateReferralCode(userId: string): Promise<string> {
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const refCode = `${userId.slice(-4)}${random}${timestamp.toString().slice(-4)}`;
      
      logger.info('[ReferralService] Генерация реферального кода для пользователя', { userId, refCode });
      return refCode;
    } catch (error) {
      logger.error('[ReferralService] Ошибка генерации реферального кода', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Обрабатывает реферальную связь между пользователями с защитой от циклов
   */
  async processReferral(refCode: string, newUserId: string): Promise<{ success: boolean; error?: string; cyclicError?: boolean }> {
    try {
      const { db } = await import('../../server/db.js');
      const { users, referrals } = await import('../../shared/schema.js');
      const { eq } = await import('drizzle-orm');
      const { logger } = await import('../../core/logger.js');

      // Находим пользователя с таким реферальным кодом
      const [inviter] = await db
        .select()
        .from(users)
        .where(eq(users.ref_code, refCode))
        .limit(1);

      if (!inviter) {
        logger.warn(`[REFERRAL] Реферальный код ${refCode} не найден`, {
          refCode,
          newUserId
        });
        return { success: false, error: 'Реферальный код не найден' };
      }

      // Получаем данные нового пользователя для проверки циклов
      const [newUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(newUserId)))
        .limit(1);

      if (!newUser) {
        logger.warn(`[REFERRAL] Новый пользователь ${newUserId} не найден`, {
          refCode,
          newUserId
        });
        return { success: false, error: 'Пользователь не найден' };
      }

      // ⭐ ПРОВЕРКА НА ЦИКЛИЧЕСКИЕ ССЫЛКИ
      const isCyclic = await this.isCyclicReferral(inviter.id, newUser.telegram_id?.toString() || newUserId);
      
      if (isCyclic) {
        logger.warn(`[REFERRAL] Цикл обнаружен при регистрации ${newUser.telegram_id} → refBy ${inviter.id}`, {
          newUserId: newUser.id,
          newUserTelegramId: newUser.telegram_id,
          inviterId: inviter.id,
          refCode,
          error: 'cyclic_referral_detected'
        });
        
        return { 
          success: false, 
          error: 'Обнаружена циклическая ссылка в реферальной цепочке', 
          cyclicError: true 
        };
      }

      // Если циклов нет, продолжаем обработку
      // Обновляем нового пользователя, указывая родительский реферальный код
      await db
        .update(users)
        .set({ parent_ref_code: refCode })
        .where(eq(users.id, parseInt(newUserId)));

      // Создаем запись о реферальной связи
      await db
        .insert(referrals)
        .values({
          user_id: parseInt(newUserId),
          inviter_id: inviter.id,
          level: 1,
          reward_uni: "10", // Базовая награда за приглашение
          created_at: new Date()
        });

      logger.info(`[REFERRAL] Успешно обработана реферальная связь: ${newUser.telegram_id} → ${inviter.id}`, {
        newUserId: newUser.id,
        newUserTelegramId: newUser.telegram_id,
        inviterId: inviter.id,
        refCode,
        rewardUni: "10"
      });

      return { success: true };
    } catch (error) {
      const { logger } = await import('../../core/logger.js');
      logger.error('[ReferralService] Ошибка обработки реферала:', {
        refCode,
        newUserId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      logger.error('[ReferralService] Ошибка обработки реферала', { error: error instanceof Error ? error.message : String(error) });
      return { success: false, error: 'Внутренняя ошибка сервера' };
    }
  }

  /**
   * Получает статистику рефералов для пользователя
   */
  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    totalEarnings: string;
    referralCode: string | null;
    recentReferrals: any[];
  }> {
    try {
      const { db } = await import('../../server/db.js');
      const { users, referrals } = await import('../../shared/schema.js');
      const { eq, count, sum } = await import('drizzle-orm');

      // Получаем пользователя и его реферальный код
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user || !user.ref_code) {
        return { 
          totalReferrals: 0, 
          totalEarnings: "0", 
          referralCode: null, 
          recentReferrals: [] 
        };
      }

      // Считаем всех приглашенных пользователей
      const invitedUsers = await db
        .select()
        .from(users)
        .where(eq(users.parent_ref_code, user.ref_code));

      // Считаем общий доход от рефералов
      const [earnings] = await db
        .select({ total: sum(referrals.reward_uni) })
        .from(referrals)
        .where(eq(referrals.inviter_id, parseInt(userId)));

      return {
        totalReferrals: invitedUsers.length,
        totalEarnings: earnings?.total || "0",
        referralCode: user.ref_code,
        recentReferrals: invitedUsers.filter(u => u.created_at && 
          (new Date().getTime() - new Date(u.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000
        ).slice(0, 10)
      };
    } catch (error) {
      logger.error('[ReferralService] Ошибка получения статистики рефералов', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get referrals by user ID
   */
  async getReferralsByUserId(userId: string): Promise<any[]> {
    try {
      const { db } = await import('../../server/db.js');
      const { users, referrals } = await import('../../shared/schema.js');
      const { eq } = await import('drizzle-orm');

      // Get user's referral code first
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user || !user.ref_code) {
        return [];
      }

      // Get all users invited by this user's referral code
      const invitedUsers = await db
        .select({
          id: users.id,
          username: users.username,
          created_at: users.created_at,
          balance_uni: users.balance_uni,
          balance_ton: users.balance_ton
        })
        .from(users)
        .where(eq(users.parent_ref_code, user.ref_code));

      return invitedUsers.map(invitedUser => ({
        id: invitedUser.id,
        name: invitedUser.username || 'Unknown',
        username: invitedUser.username,
        joined_date: invitedUser.created_at,
        balance_uni: invitedUser.balance_uni || "0",
        balance_ton: invitedUser.balance_ton || "0",
        level: 1 // Direct referral
      }));
    } catch (error) {
      logger.error('[ReferralService] Error getting referrals by user ID', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Проверяет наличие циклических ссылок в реферальной цепочке
   * Предотвращает ситуации типа A → B → C → A
   */
  async isCyclicReferral(refById: number, newUserTelegramId: string): Promise<boolean> {
    try {
      const { db } = await import('../../server/db.js');
      const { users } = await import('../../shared/schema.js');
      const { eq } = await import('drizzle-orm');
      const { logger } = await import('../../core/logger.js');

      // Получаем данные нового пользователя
      const [newUser] = await db
        .select()
        .from(users)
        .where(eq(users.telegram_id, parseInt(newUserTelegramId)))
        .limit(1);

      if (!newUser) {
        return false; // Пользователь не найден, цикла нет
      }

      // Проверяем прямой цикл: пользователь ссылается сам на себя
      if (refById === newUser.id) {
        logger.warn(`[REFERRAL] Прямой цикл обнаружен: пользователь ${newUserTelegramId} (ID: ${newUser.id}) пытается ссылаться сам на себя`, {
          newUserId: newUser.id,
          refById,
          telegramId: newUserTelegramId,
          cycleType: 'direct'
        });
        return true;
      }

      // Строим цепочку рефереров до 20 уровней вверх
      const visitedUsers = new Set<number>();
      let currentRefId = refById;
      let depth = 0;

      while (currentRefId && depth < 20) {
        // Если мы уже встречали этого пользователя в цепочке - цикл обнаружен
        if (visitedUsers.has(currentRefId)) {
          logger.warn(`[REFERRAL] Косвенный цикл обнаружен при регистрации ${newUserTelegramId} → refBy ${refById}`, {
            newUserId: newUser.id,
            newUserTelegramId,
            refById,
            currentRefId,
            visitedChain: Array.from(visitedUsers),
            depth,
            cycleType: 'indirect'
          });
          return true;
        }

        // Если новый пользователь уже есть в цепочке - это создаст цикл
        if (currentRefId === newUser.id) {
          logger.warn(`[REFERRAL] Цикл обнаружен: новый пользователь ${newUserTelegramId} (ID: ${newUser.id}) уже присутствует в реферальной цепочке`, {
            newUserId: newUser.id,
            newUserTelegramId,
            refById,
            currentRefId,
            visitedChain: Array.from(visitedUsers),
            depth,
            cycleType: 'insertion_cycle'
          });
          return true;
        }

        visitedUsers.add(currentRefId);

        // Получаем реферера текущего пользователя
        const [currentUser] = await db
          .select({
            id: users.id,
            parent_ref_code: users.parent_ref_code
          })
          .from(users)
          .where(eq(users.id, currentRefId))
          .limit(1);

        if (!currentUser || !currentUser.parent_ref_code) {
          // Достигли корня цепочки, цикла нет
          break;
        }

        // Находим пользователя с родительским реферальным кодом
        const [parentUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.ref_code, currentUser.parent_ref_code))
          .limit(1);

        if (!parentUser) {
          // Некорректная ссылка в цепочке, прерываем
          break;
        }

        currentRefId = parentUser.id;
        depth++;
      }

      // Если мы прошли всю цепочку без циклов
      logger.debug(`[REFERRAL] Цикл не обнаружен для пользователя ${newUserTelegramId} → refBy ${refById}`, {
        newUserId: newUser.id,
        newUserTelegramId,
        refById,
        chainDepth: depth,
        visitedCount: visitedUsers.size
      });

      return false;
    } catch (error) {
      const { logger } = await import('../../core/logger.js');
      logger.error('[ReferralService] Ошибка проверки циклических ссылок:', {
        refById,
        newUserTelegramId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      logger.error('[ReferralService] Ошибка проверки циклических ссылок', { error: error instanceof Error ? error.message : String(error) });
      return true; // В случае ошибки считаем, что есть цикл (безопасный подход)
    }
  }

  /**
   * Валидирует реферальный код с проверкой на циклы
   */
  async validateReferralCode(refCode: string, newUserTelegramId?: string): Promise<{ valid: boolean; cyclicError?: boolean }> {
    try {
      if (!refCode || refCode.length < 6) {
        return { valid: false };
      }

      const { db } = await import('../../server/db');
      const { users } = await import('../../shared/schema');
      const { eq } = await import('drizzle-orm');

      // Проверяем существование пользователя с таким реферальным кодом
      const [referrer] = await db
        .select()
        .from(users)
        .where(eq(users.ref_code, refCode))
        .limit(1);

      if (!referrer) {
        return { valid: false };
      }

      // Если указан новый пользователь, проверяем на циклические ссылки
      if (newUserTelegramId) {
        const isCyclic = await this.isCyclicReferral(referrer.id, newUserTelegramId);
        if (isCyclic) {
          return { valid: false, cyclicError: true };
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('[ReferralService] Ошибка валидации реферального кода:', error);
      return { valid: false };
    }
  }

  /**
   * Получить статистику реферальных уровней с реальными доходами
   */
  async getReferralLevelsWithIncome(userIdentifier: string): Promise<{
    totalReferrals: number;
    referralCounts: Record<string, number>;
    levelIncome: Record<string, { uni: string; ton: string }>;
    referrals: any[];
  }> {
    try {
      const { db } = await import('../../server/db.js');
      const { users, referrals } = await import('../../shared/schema.js');
      const { eq, count, sum } = await import('drizzle-orm');

      // Пытаемся найти пользователя по ID или guest_id
      let user = null;
      if (userIdentifier && !isNaN(parseInt(userIdentifier))) {
        [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, parseInt(userIdentifier)))
          .limit(1);
      }

      if (!user) {
        console.log(`[ReferralService] Пользователь ${userIdentifier} не найден, возвращаем пустые данные`);
        return {
          totalReferrals: 0,
          referralCounts: {},
          levelIncome: this.generateEmptyLevelIncome(),
          referrals: []
        };
      }

      console.log(`[ReferralService] Получение статистики уровней для пользователя ${user.id} (${user.username})`);

      // Получаем всех рефералов пользователя
      const userReferrals = await db
        .select()
        .from(referrals)
        .where(eq(referrals.inviter_id, user.id));

      // Подсчитываем рефералов по уровням
      const referralCounts: Record<string, number> = {};
      for (let i = 1; i <= 20; i++) {
        const levelReferrals = userReferrals.filter(ref => ref.level === i);
        referralCounts[i.toString()] = levelReferrals.length;
      }

      // Подсчитываем реальные доходы по уровням
      const levelIncome: Record<string, { uni: string; ton: string }> = {};
      for (let i = 1; i <= 20; i++) {
        const levelReferrals = userReferrals.filter(ref => ref.level === i);
        const totalUni = levelReferrals.reduce((sum, ref) => {
          return sum + parseFloat(ref.reward_uni || "0");
        }, 0);
        const totalTon = levelReferrals.reduce((sum, ref) => {
          return sum + parseFloat((ref as any).reward_ton || "0");
        }, 0);

        levelIncome[i.toString()] = {
          uni: totalUni.toFixed(3),
          ton: totalTon.toFixed(6)
        };
      }

      // Получаем детальную информацию о рефералах
      const referralDetails = await Promise.all(
        userReferrals.map(async (referral) => {
          const [referredUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, referral.user_id))
            .limit(1);

          return {
            id: referral.user_id,
            name: referredUser?.username || 'Unknown',
            username: referredUser?.username,
            level: referral.level,
            reward_uni: referral.reward_uni || "0",
            reward_ton: (referral as any).reward_ton || "0",
            created_at: referral.created_at
          };
        })
      );

      console.log(`[ReferralService] Найдено ${userReferrals.length} рефералов на ${Object.keys(referralCounts).length} уровнях`);

      return {
        totalReferrals: userReferrals.length,
        referralCounts,
        levelIncome,
        referrals: referralDetails
      };
    } catch (error) {
      console.error('[ReferralService] Ошибка получения статистики уровней:', error);
      return {
        totalReferrals: 0,
        referralCounts: {},
        levelIncome: this.generateEmptyLevelIncome(),
        referrals: []
      };
    }
  }

  /**
   * Генерирует пустую структуру доходов для 20 уровней
   */
  private generateEmptyLevelIncome(): Record<string, { uni: string; ton: string }> {
    const levelIncome: Record<string, { uni: string; ton: string }> = {};
    for (let i = 1; i <= 20; i++) {
      levelIncome[i.toString()] = {
        uni: "0.000",
        ton: "0.000000"
      };
    }
    return levelIncome;
  }

}