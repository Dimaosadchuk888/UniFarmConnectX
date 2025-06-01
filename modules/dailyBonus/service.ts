import { db } from '../../server/db';
import { users, transactions } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export class DailyBonusService {
  async checkDailyBonusAvailability(userId: string): Promise<boolean> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user) {
        return false;
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const lastCheckin = user.checkin_last_date 
        ? new Date(user.checkin_last_date).toISOString().split('T')[0] 
        : null;

      // Доступен бонус, если последний чекин был не сегодня
      return lastCheckin !== today;
    } catch (error) {
      console.error('[DailyBonusService] Ошибка проверки доступности бонуса:', error);
      return false;
    }
  }

  async claimDailyBonus(userId: string): Promise<{ amount: string; claimed: boolean }> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user) {
        return { amount: "0", claimed: false };
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const lastCheckin = user.checkin_last_date 
        ? new Date(user.checkin_last_date).toISOString().split('T')[0] 
        : null;

      // Проверяем, можно ли получить бонус
      if (lastCheckin === today) {
        return { amount: "0", claimed: false };
      }

      // Рассчитываем новую серию
      let newStreak = 1;
      if (lastCheckin) {
        const lastCheckinDate = new Date(lastCheckin);
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastCheckin === yesterdayStr) {
          // Продолжаем серию
          newStreak = (user.checkin_streak || 0) + 1;
        }
        // Если последний чекин был не вчера, серия сбрасывается
      }

      // Рассчитываем бонус (базовый 10 UNI + бонус за серию)
      const baseBonus = 10;
      const streakBonus = Math.min((newStreak - 1) * 2, 20); // Максимум +20 UNI за серию
      const totalBonus = baseBonus + streakBonus;

      // Обновляем данные пользователя
      const newBalance = (parseFloat(user.balance_uni || "0") + totalBonus).toString();
      
      await db
        .update(users)
        .set({
          balance_uni: newBalance,
          checkin_last_date: now,
          checkin_streak: newStreak
        })
        .where(eq(users.id, parseInt(userId)));

      // Записываем транзакцию
      await db
        .insert(transactions)
        .values({
          user_id: parseInt(userId),
          transaction_type: 'daily_bonus',
          amount: totalBonus.toString(),
          currency: 'UNI',
          status: 'completed'
        });

      return { amount: totalBonus.toString(), claimed: true };
    } catch (error) {
      console.error('[DailyBonusService] Ошибка получения ежедневного бонуса:', error);
      return { amount: "0", claimed: false };
    }
  }

  async getDailyBonusStreak(userId: string): Promise<number> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user) {
        return 0;
      }

      // Проверяем актуальность серии
      const now = new Date();
      const lastCheckin = user.checkin_last_date;
      
      if (!lastCheckin) {
        return 0;
      }

      const daysDiff = Math.floor((now.getTime() - new Date(lastCheckin).getTime()) / (1000 * 60 * 60 * 24));
      
      // Если прошло больше 1 дня, серия сбрасывается
      if (daysDiff > 1) {
        return 0;
      }

      return user.checkin_streak || 0;
    } catch (error) {
      console.error('[DailyBonusService] Ошибка получения серии бонусов:', error);
      return 0;
    }
  }

  async getDailyBonusHistory(userId: string): Promise<any[]> {
    try {
      const history = await db
        .select()
        .from(transactions)
        .where(eq(transactions.user_id, parseInt(userId)))
        .where(eq(transactions.transaction_type, 'daily_bonus'))
        .orderBy(transactions.created_at);

      return history.map(tx => ({
        id: tx.id,
        amount: parseFloat(tx.amount),
        date: tx.created_at,
        currency: tx.currency,
        status: tx.status
      }));
    } catch (error) {
      console.error('[DailyBonusService] Ошибка получения истории бонусов:', error);
      return [];
    }
  }
}