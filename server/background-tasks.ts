import { db } from './db';
import { users } from '@shared/schema';
import { UniFarmingService } from './services/uniFarmingService';

/**
 * Запускает фоновые задачи, которые выполняются периодически
 */
export function startBackgroundTasks(): void {
  console.log('[Background Tasks] Starting background tasks');
  
  // Запуск задачи обновления фарминга (каждые 10 секунд)
  setInterval(updateAllUsersFarming, 10000);
}

/**
 * Обновляет фарминг для всех активных пользователей
 */
async function updateAllUsersFarming(): Promise<void> {
  try {
    // Получаем всех пользователей с активным фармингом
    const activeUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        /* WHERE uni_deposit_amount > 0 AND uni_farming_start_timestamp IS NOT NULL */
        db.and(
          db.ne(users.uni_deposit_amount, '0'),
          db.isNotNull(users.uni_farming_start_timestamp)
        )
      );
    
    if (activeUsers.length === 0) {
      return;
    }
    
    console.log(`[Background Tasks] Updating farming for ${activeUsers.length} users`);
    
    // Обновляем фарминг для каждого пользователя
    for (const user of activeUsers) {
      await UniFarmingService.calculateAndUpdateUserFarming(user.id);
    }
    
    console.log('[Background Tasks] Farming updated successfully');
  } catch (error) {
    console.error('[Background Tasks] Error updating farming:', error);
  }
}