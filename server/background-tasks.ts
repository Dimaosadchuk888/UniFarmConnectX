import { db } from './db';
import { users, uniFarmingDeposits, tonBoostDeposits } from '@shared/schema';
import { UniFarmingService } from './services/uniFarmingService';
import { NewUniFarmingService } from './services/newUniFarmingService';
import { TonBoostService } from './services/tonBoostService';
import { ReferralBonusService } from './services/referralBonusService';
import { Currency } from './services/transactionService';
import { and, ne, isNotNull, eq } from 'drizzle-orm';
import { referralBonusProcessor } from './services/referralBonusProcessor';
import { referralSystemIntegrator } from './services/referralSystemIntegrator';

/**
 * Запускает фоновые задачи, которые выполняются периодически
 */
export function startBackgroundTasks(): void {
  console.log('[Background Tasks] Starting background tasks');
  
  // Запуск задачи обновления фарминга (каждый час)
  const ONE_HOUR_MS = 60 * 60 * 1000;
  setInterval(updateAllUsersFarming, ONE_HOUR_MS);
  
  // Запускаем первое начисление через 5 секунд после старта сервера,
  // но только для инициализации системы, без реальных начислений
  setTimeout(() => {
    console.log('[Background Tasks] Initial system check after server start');
    systemInitialized = true;
  }, 5000);
  
  // Инициализация обработчика реферальных начислений
  initializeReferralProcessor();
}

/**
 * Инициализирует процессор реферальных бонусов
 * - Создает необходимые индексы
 * - Восстанавливает незавершенные операции после перезапуска
 */
async function initializeReferralProcessor(): Promise<void> {
  try {
    console.log('[Background Tasks] Initializing referral bonus processor');
    
    // Создаем необходимые индексы для оптимизации работы
    await referralBonusProcessor.ensureIndexes();
    
    // Восстанавливаем незавершенные операции после перезапуска
    const recoveredCount = await referralBonusProcessor.recoverFailedProcessing();
    
    if (recoveredCount > 0) {
      console.log(`[Background Tasks] Recovered ${recoveredCount} referral reward operations`);
    } else {
      console.log('[Background Tasks] No failed referral operations to recover');
    }
    
    // Инициализируем оптимизированный процессор реферальной системы
    await referralSystemIntegrator.initialize();
    
    // В режиме разработки можно включить оптимизированный процессор
    if (process.env.USE_OPTIMIZED_REFERRALS === 'true') {
      referralSystemIntegrator.setOptimizedVersion(true);
      console.log('[Background Tasks] Optimized referral system ENABLED');
    } else {
      console.log('[Background Tasks] Using standard referral system (optimized system available but disabled)');
    }
    
    console.log('[Background Tasks] Referral bonus processor initialized successfully');
  } catch (error) {
    console.error('[Background Tasks] Error initializing referral processor:', error);
  }
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
    
    // При первом запуске пропускаем обновление
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
    
    console.log(`[Background Tasks] Starting hourly farming update - ${new Date().toISOString()}`);
    
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
      console.log(`[Background Tasks] No active farming users found. Skipping update.`);
      return;
    }
    
    console.log(`[Background Tasks] Processing hourly farming update for ${activeUsers.length} users`);
    
    let updatedCount = 0;
    
    // Обновляем фарминг для каждого пользователя
    for (const user of activeUsers) {
      try {
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
        
        updatedCount++;
      } catch (userError) {
        console.error(`[Background Tasks] Error updating farming for user ${user.id}:`, userError);
        // Продолжаем с другими пользователями даже при ошибке
      }
    }
    
    console.log(`[Background Tasks] Hourly farming update completed. Successfully updated ${updatedCount}/${activeUsers.length} users.`);
  } catch (error) {
    console.error('[Background Tasks] Error in hourly farming update:', error);
  }
}