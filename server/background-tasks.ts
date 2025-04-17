import { db } from './db';
import { users } from '@shared/schema';
import { UniFarmingService } from './services/uniFarmingService';
import { and, ne, isNotNull } from 'drizzle-orm';

/**
 * Запускает фоновые задачи, которые выполняются периодически
 */
export function startBackgroundTasks(): void {
  console.log('[Background Tasks] Starting background tasks');
  
  // Запуск задачи обновления фарминга (каждую секунду)
  setInterval(updateAllUsersFarming, 1000);
}

// Переменная для отслеживания времени последнего вывода сообщения в лог
let lastLogTime = 0;

/**
 * Обновляет фарминг для всех активных пользователей
 * Этот метод вызывается каждую секунду и начисляет доход
 * прямо на основной баланс пользователя
 */
async function updateAllUsersFarming(): Promise<void> {
  try {
    // Получаем всех пользователей с активным фармингом
    const activeUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        /* WHERE uni_deposit_amount > 0 AND uni_farming_start_timestamp IS NOT NULL */
        and(
          ne(users.uni_deposit_amount, '0'),
          isNotNull(users.uni_farming_start_timestamp)
        )
      );
    
    if (activeUsers.length === 0) {
      return;
    }
    
    // Выводим лог раз в 10 секунд для снижения нагрузки
    const now = Date.now();
    if (now - lastLogTime > 10000) {
      lastLogTime = now;
      console.log(`[Background Tasks] Updating farming for ${activeUsers.length} users`);
    }
    
    // Обновляем фарминг для каждого пользователя
    for (const user of activeUsers) {
      await UniFarmingService.calculateAndUpdateUserFarming(user.id);
    }
    
    // Выводим лог об успехе также только раз в 10 секунд
    if (now - lastLogTime < 100) { // Если это то же "окно", в котором мы вывели первый лог
      console.log('[Background Tasks] Farming updated successfully');
    }
  } catch (error) {
    console.error('[Background Tasks] Error updating farming:', error);
  }
}