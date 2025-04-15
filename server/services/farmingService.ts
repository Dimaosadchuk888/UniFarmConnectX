import { db } from '../db';
import { farmingDeposits, FarmingDeposit, InsertFarmingDeposit } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Сервис для работы с фарминг-депозитами
 */
export class FarmingService {
  /**
   * Получает все активные фарминг-депозиты пользователя
   * @param userId ID пользователя
   * @returns Массив активных фарминг-депозитов
   */
  static async getUserFarmingDeposits(userId: number): Promise<FarmingDeposit[]> {
    const deposits = await db
      .select()
      .from(farmingDeposits)
      .where(eq(farmingDeposits.user_id, userId))
      .orderBy(farmingDeposits.created_at);
    
    return deposits;
  }

  /**
   * Создает новый фарминг-депозит
   * @param depositData Данные депозита
   * @returns Созданный депозит
   */
  static async createFarmingDeposit(depositData: InsertFarmingDeposit): Promise<FarmingDeposit> {
    const [deposit] = await db
      .insert(farmingDeposits)
      .values(depositData)
      .returning();
    
    return deposit;
  }

  /**
   * Обновляет последнее время получения наград
   * @param depositId ID депозита
   * @returns Обновленный депозит
   */
  static async updateLastClaim(depositId: number): Promise<FarmingDeposit | undefined> {
    const [updatedDeposit] = await db
      .update(farmingDeposits)
      .set({ last_claim: new Date() })
      .where(eq(farmingDeposits.id, depositId))
      .returning();
    
    return updatedDeposit;
  }

  /**
   * Применяет буст к депозиту
   * @param depositId ID депозита
   * @returns Обновленный депозит
   */
  static async applyBoost(depositId: number): Promise<FarmingDeposit | undefined> {
    const [boostedDeposit] = await db
      .update(farmingDeposits)
      .set({ is_boosted: true })
      .where(eq(farmingDeposits.id, depositId))
      .returning();
    
    return boostedDeposit;
  }
}