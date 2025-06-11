/**
 * Серверный сервис для обработки реферальных ссылок и кодов
 * 
 * Этот сервис отвечает за:
 * 1. Генерацию реферальных кодов
 * 2. Проверку валидности реферального кода
 * 3. Применение реферального кода при создании новых пользователей
 * 4. Получение статистики рефералов
 */

export class ReferralService {

  /**
   * Генерирует уникальный реферальный код для пользователя
   */
  async generateReferralCode(userId: string): Promise<string> {
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const refCode = `${userId.slice(-4)}${random}${timestamp.toString().slice(-4)}`;
      
      console.log(`[ReferralService] Генерация реферального кода для пользователя ${userId}: ${refCode}`);
      return refCode;
    } catch (error) {
      console.error('[ReferralService] Ошибка генерации реферального кода:', error);
      throw error;
    }
  }

  /**
   * Обрабатывает реферальную связь между пользователями
   */
  async processReferral(refCode: string, newUserId: string): Promise<boolean> {
    try {
      const { db } = await import('../../server/db.js');
      const { users, referrals } = await import('../../shared/schema.js');
      const { eq } = await import('drizzle-orm');

      // Находим пользователя с таким реферальным кодом
      const [inviter] = await db
        .select()
        .from(users)
        .where(eq(users.ref_code, refCode))
        .limit(1);

      if (!inviter) return false;

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

      return true;
    } catch (error) {
      console.error('[ReferralService] Ошибка обработки реферала:', error);
      return false;
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
      console.error('[ReferralService] Ошибка получения статистики рефералов:', error);
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
      console.error('[ReferralService] Error getting referrals by user ID:', error);
      return [];
    }
  }

  /**
   * Валидирует реферальный код
   */
  async validateReferralCode(refCode: string): Promise<boolean> {
    try {
      if (!refCode || refCode.length < 6) {
        return false;
      }

      const { db } = await import('../../server/db');
      const { users } = await import('../../shared/schema');
      const { eq } = await import('drizzle-orm');

      // Проверяем существование пользователя с таким реферальным кодом
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.ref_code, refCode))
        .limit(1);

      return !!user;
    } catch (error) {
      console.error('[ReferralService] Ошибка валидации реферального кода:', error);
      return false;
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