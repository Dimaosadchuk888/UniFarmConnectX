import { db } from './db';
import { users, uniFarmingDeposits, tonBoostDeposits } from '@shared/schema';
import { UniFarmingService } from './services/uniFarmingService';
import { NewUniFarmingService } from './services/newUniFarmingService';
import { TonBoostService } from './services/tonBoostService';
import { ReferralBonusService } from './services/referralBonusService';
import { Currency } from './services/transactionService';
import { and, ne, isNotNull, eq } from 'drizzle-orm';

/**
 * Запускает фоновые задачи, которые выполняются периодически
 */
export function startBackgroundTasks(): void {
  console.log('[Background Tasks] Starting background tasks');
  
  // Запуск задачи обновления фарминга (каждый час)
  const ONE_HOUR_MS = 60 * 60 * 1000;
  setInterval(updateAllUsersFarming, ONE_HOUR_MS);
  
  // Запускаем первое начисление через 5 секунд после старта сервера
  // для проверки работоспособности
  setTimeout(updateAllUsersFarming, 5000);
}

// Переменная для отслеживания времени последнего вывода сообщения в лог
let lastLogTime = 0;

// Время запуска сервера (для защиты от перерасчета фарминга при перезапуске)
const SERVER_START_TIME = new Date();

// Флаг, указывающий, что система прошла инициализацию
let systemInitialized = false;

// Минимальное значение для начисления реферального бонуса от дохода фарминга
const MIN_REFERRAL_THRESHOLD = 0.000001;

// Максимальное допустимое смещение времени при перезапуске (в секундах)
const MAX_RESTART_OFFSET = 10;

/**
 * Обновляет фарминг для всех активных пользователей
 * Этот метод вызывается каждый час и начисляет доход
 * прямо на основной баланс пользователя
 */
async function updateAllUsersFarming(): Promise<void> {
  try {
    // Защита от слишком больших начислений при первом запуске сервера
    const startTime = new Date();
    const secondsSinceServerStart = Math.floor((startTime.getTime() - SERVER_START_TIME.getTime()) / 1000);
    
    // При первом запуске помечаем систему как инициализированную без фактических начислений
    if (!systemInitialized) {
      console.log(`[Background Tasks] Initializing farming system. Skipping first update to prevent excessive rewards.`);
      systemInitialized = true;
      return;
    }
    
    // Если после запуска сервера прошло слишком мало времени, пропускаем обновление
    if (secondsSinceServerStart < 2) {
      console.log(`[Background Tasks] Server just started (${secondsSinceServerStart}s ago). Waiting for system stabilization.`);
      return;
    }
    
    // Получаем всех пользователей с активными депозитами UNI в новой таблице
    const usersWithUniDeposits = await db
      .select({
        user_id: uniFarmingDeposits.user_id
      })
      .from(uniFarmingDeposits)
      .where(eq(uniFarmingDeposits.is_active, true))
      .groupBy(uniFarmingDeposits.user_id);

    // Получаем всех пользователей с активными TON Boost-депозитами
    const usersWithTonBoosts = await db
      .select({
        user_id: tonBoostDeposits.user_id
      })
      .from(tonBoostDeposits)
      .where(eq(tonBoostDeposits.is_active, true))
      .groupBy(tonBoostDeposits.user_id);

    // Объединяем пользователей из обоих источников
    let activeUsers = [...usersWithUniDeposits.map(record => ({ id: record.user_id }))];
    
    // Добавляем пользователей с TON Boost-депозитами (если их еще нет в списке)
    for (const record of usersWithTonBoosts) {
      if (!activeUsers.some(user => user.id === record.user_id)) {
        activeUsers.push({ id: record.user_id });
      }
    }

    // Если у нас не нашлось новых депозитов UNI или TON, проверяем старую систему
    if (activeUsers.length === 0) {
      // Получаем всех пользователей с активным фармингом по старой схеме
      const legacyUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(
          /* WHERE uni_deposit_amount > 0 AND uni_farming_start_timestamp IS NOT NULL */
          and(
            ne(users.uni_deposit_amount, '0'),
            isNotNull(users.uni_farming_start_timestamp)
          )
        );
      
      activeUsers = legacyUsers;
    }
    
    if (activeUsers.length === 0) {
      return;
    }
    
    // Выводим лог раз в 10 секунд для снижения нагрузки
    const currentTime = Date.now();
    if (currentTime - lastLogTime > 10000) {
      lastLogTime = currentTime;
      console.log(`[Background Tasks] Updating farming for ${activeUsers.length} users`);
    }
    
    // Обновляем фарминг для каждого пользователя
    for (const user of activeUsers) {
      // Проверяем UNI-фарминг
      // Сначала проверяем, есть ли у пользователя новые депозиты
      const uniDeposits = await db
        .select()
        .from(uniFarmingDeposits)
        .where(and(
          eq(uniFarmingDeposits.user_id, user.id),
          eq(uniFarmingDeposits.is_active, true)
        ));
      
      if (uniDeposits.length > 0) {
        // Если есть новые депозиты, используем новый сервис
        await NewUniFarmingService.calculateAndUpdateUserFarming(user.id);
      } else {
        // Если нет новых депозитов, используем старый сервис для обратной совместимости
        await UniFarmingService.calculateAndUpdateUserFarming(user.id);
      }

      // Проверяем TON-фарминг
      const tonBoosts = await db
        .select()
        .from(tonBoostDeposits)
        .where(and(
          eq(tonBoostDeposits.user_id, user.id),
          eq(tonBoostDeposits.is_active, true)
        ));
      
      if (tonBoosts.length > 0) {
        // Обновляем TON-фарминг
        await TonBoostService.calculateAndUpdateUserTonFarming(user.id);
      }
    }
    
    // Выводим лог об успехе также только раз в 10 секунд
    if (currentTime - lastLogTime < 100) { // Если это то же "окно", в котором мы вывели первый лог
      console.log('[Background Tasks] Farming updated successfully');
    }
  } catch (error) {
    console.error('[Background Tasks] Error updating farming:', error);
  }
}