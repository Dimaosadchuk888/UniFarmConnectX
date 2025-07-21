import { supabase } from '../../core/supabase';
import { SupabaseUserRepository } from '../user/service';
import { RewardCalculationLogic } from './logic/rewardCalculation';
import { logger } from '../../core/logger';
import { FARMING_TABLES, FARMING_CONFIG } from './model';
import { balanceManager } from '../../core/BalanceManager';

export class FarmingService {
  private userRepository: SupabaseUserRepository;

  constructor() {
    this.userRepository = new SupabaseUserRepository();
  }

  async getFarmingDataByTelegramId(telegramId: string): Promise<{
    isActive: boolean;
    depositAmount: string;
    ratePerSecond: string;
    totalRatePerSecond: string;
    dailyIncomeUni: string;
    depositCount: number;
    totalDepositAmount: string;
    startDate: string | null;
    uni_farming_start_timestamp: string | null;
    rate: string;
    accumulated: string;
    last_claim: string | null;
    can_claim: boolean;
    next_claim_available: string | null;
  }> {
    try {
      const user = await this.userRepository.getUserByTelegramId(Number(telegramId));

      if (!user) {
        return {
          isActive: false,
          depositAmount: '0',
          ratePerSecond: '0',
          totalRatePerSecond: '0',
          dailyIncomeUni: '0',
          depositCount: 0,
          totalDepositAmount: '0',
          startDate: null,
          uni_farming_start_timestamp: null,
          rate: '0.000000',
          accumulated: '0.000000',
          last_claim: null,
          can_claim: false,
          next_claim_available: null
        };
      }

      // Получаем данные из новой таблицы uni_farming_data
      const { uniFarmingRepository } = await import('./UniFarmingRepository');
      const farmingData = await uniFarmingRepository.getByUserId(user.id.toString());

      if (!farmingData) {
        return {
          isActive: false,
          depositAmount: '0',
          ratePerSecond: '0',
          totalRatePerSecond: '0',
          dailyIncomeUni: '0',
          depositCount: 0,
          totalDepositAmount: '0',
          startDate: null,
          uni_farming_start_timestamp: null,
          rate: '0.000000',
          accumulated: '0.000000',
          last_claim: null,
          can_claim: false,
          next_claim_available: null
        };
      }

      const now = new Date();
      const lastClaim = farmingData.farming_last_update ? new Date(farmingData.farming_last_update) : null;
      const farmingStart = farmingData.farming_start_timestamp ? new Date(farmingData.farming_start_timestamp) : now;
      
      const baseHourlyRate = 0.01;
      const ratePerSecond = baseHourlyRate / 3600;
      const dailyRate = baseHourlyRate * 24;
      
      const hoursElapsed = lastClaim 
        ? (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60)
        : (now.getTime() - farmingStart.getTime()) / (1000 * 60 * 60);
      
      const accumulated = Math.max(0, hoursElapsed * baseHourlyRate);
      const isActive = farmingData.is_active;
      const depositAmount = farmingData.deposit_amount || '0';
      
      return {
        isActive,
        depositAmount,
        ratePerSecond: ratePerSecond.toFixed(8),
        totalRatePerSecond: ratePerSecond.toFixed(8),
        dailyIncomeUni: dailyRate.toFixed(6),
        depositCount: isActive ? 1 : 0,
        totalDepositAmount: depositAmount,
        startDate: farmingStart.toISOString(),
        uni_farming_start_timestamp: user.uni_farming_start_timestamp || null,
        rate: baseHourlyRate.toFixed(6),
        accumulated: accumulated.toFixed(6),
        last_claim: lastClaim?.toISOString() || null,
        can_claim: accumulated >= 0.01,
        next_claim_available: lastClaim 
          ? new Date(lastClaim.getTime() + (24 * 60 * 60 * 1000)).toISOString()
          : null
      };
    } catch (error) {
      logger.error('[FarmingService] Ошибка получения данных фарминга', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async startFarming(telegramId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.getUserByTelegramId(Number(telegramId));
      if (!user) return false;

      const { uniFarmingRepository } = await import('./UniFarmingRepository');
      
      const success = await uniFarmingRepository.upsert({
        user_id: user.id,
        farming_start_timestamp: new Date().toISOString(),
        farming_last_update: new Date().toISOString(),
        farming_rate: FARMING_CONFIG.DEFAULT_RATE,
        is_active: true
      });

      return success;
    } catch (error) {
      logger.error('[FarmingService] Ошибка запуска фарминга', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async stopFarming(telegramId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.getUserByTelegramId(Number(telegramId));
      if (!user) return false;

      const { uniFarmingRepository } = await import('./UniFarmingRepository');
      
      const success = await uniFarmingRepository.updateActivity(user.id.toString(), false);

      return success;
    } catch (error) {
      logger.error('[FarmingService] Ошибка остановки фарминга', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async getRates(): Promise<{
    base_rate: number;
    daily_rate: number;
    hourly_rate: number;
    per_second_rate: number;
    minimum_deposit: number;
    maximum_deposit: number;
  }> {
    try {
      const baseHourlyRate = FARMING_CONFIG.BASE_HOURLY_RATE || 0.01;
      const dailyRate = baseHourlyRate * 24;
      const ratePerSecond = baseHourlyRate / 3600;
      
      return {
        base_rate: baseHourlyRate,
        daily_rate: dailyRate,
        hourly_rate: baseHourlyRate,
        per_second_rate: ratePerSecond,
        minimum_deposit: FARMING_CONFIG.MIN_DEPOSIT || 1,
        maximum_deposit: FARMING_CONFIG.MAX_DEPOSIT || 1000000
      };
    } catch (error) {
      logger.error('[FarmingService] Ошибка получения ставок фарминга', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async depositUniForFarming(userId: string, amount: string): Promise<{ success: boolean; message: string }> {
    // КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ ДЛЯ ОТЛАДКИ
    console.log('\n\n=== DEPOSIT UNI FARMING CALLED ===');
    console.log('User ID:', userId);
    console.log('Amount:', amount);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Stack trace:', new Error().stack);
    
    try {
      logger.info('[FarmingService] Депозит для фарминга', { 
        userId, 
        amount,
        userIdType: typeof userId,
        amountType: typeof amount
      });

      const numericUserId = Number(userId);
      const user = await this.userRepository.getUserById(numericUserId);
      
      logger.info('[FarmingService] ЭТАП 1: Пользователь найден', { 
        numericUserId,
        userFound: !!user,
        userId: user?.id,
        userName: user?.username,
        balance_uni: user?.balance_uni,
        balance_uni_type: typeof user?.balance_uni,
        uni_deposit_amount: user?.uni_deposit_amount,
        uni_deposit_amount_type: typeof user?.uni_deposit_amount
      });
      
      if (!user) {
        logger.error('[FarmingService] ЭТАП 1: Пользователь не найден', { userId, numericUserId });
        return { success: false, message: 'Пользователь не найден' };
      }

      const depositAmount = parseFloat(amount);
      if (depositAmount <= 0) {
        logger.error('[FarmingService] ЭТАП 2: Некорректная сумма депозита', { amount, depositAmount });
        return { success: false, message: 'Некорректная сумма депозита' };
      }

      // balance_uni уже является числом в Supabase, не нужно parseFloat
      const currentBalance = typeof user.balance_uni === 'number' ? user.balance_uni : parseFloat(user.balance_uni || '0');
      
      logger.info('[FarmingService] ЭТАП 2.5: Детальная проверка баланса', {
        rawBalance: user.balance_uni,
        balanceType: typeof user.balance_uni,
        currentBalance,
        depositAmount,
        comparisonResult: currentBalance < depositAmount,
        difference: currentBalance - depositAmount,
        stringComparison: String(currentBalance) + ' < ' + String(depositAmount) + ' = ' + (currentBalance < depositAmount)
      });
      
      if (currentBalance < depositAmount) {
        logger.error('[FarmingService] ЭТАП 3: Недостаточно средств', { 
          currentBalance, 
          depositAmount, 
          userId: user.id,
          balanceType: typeof user.balance_uni,
          rawBalance: user.balance_uni
        });
        return { success: false, message: 'Недостаточно средств' };
      }

      logger.info('[FarmingService] ЭТАП 4: Валидация прошла успешно', {
        userId: user.id,
        currentBalance,
        depositAmount,
        validationPassed: true
      });

      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Минуем BalanceManager и обновляем баланс напрямую
      const newBalance = (currentBalance - depositAmount).toFixed(8);
      // uni_deposit_amount тоже может быть числом
      const currentDeposit = typeof user.uni_deposit_amount === 'number' ? user.uni_deposit_amount : parseFloat(user.uni_deposit_amount || '0');
      const newDepositAmount = (currentDeposit + depositAmount).toFixed(8);

      logger.info('[FarmingService] ЭТАП 5: Подготовка прямого обновления баланса', { 
        userId: user.id,
        currentBalance,
        newBalance,
        currentDeposit,
        newDepositAmount,
        farmingRate: FARMING_CONFIG.DEFAULT_RATE
      });

      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Обновление баланса через BalanceManager
      logger.info('[FarmingService] ЭТАП 6: Обновление баланса через BalanceManager', { 
        userId: user.id,
        currentBalance,
        newBalance,
        depositAmount
      });
      
      // Используем BalanceManager для надежного обновления баланса
      const balanceUpdateResult = await balanceManager.subtractBalance(
        user.id,
        depositAmount,
        0,
        'UNI farming deposit'
      );

      if (!balanceUpdateResult.success) {
        logger.error('[FarmingService] ЭТАП 6.1: Ошибка обновления баланса', { 
          error: balanceUpdateResult.error,
          userId: user.id
        });
        return { success: false, message: 'Ошибка обновления баланса' };
      }

      // Обновляем депозит в фарминге через новый репозиторий
      const { uniFarmingRepository } = await import('./UniFarmingRepository');
      
      const updateSuccess = await uniFarmingRepository.addDeposit(
        user.id.toString(),
        depositAmount.toString()
      );

      logger.info('[FarmingService] ЭТАП 6: Результат обновления базы данных', { 
        success: updateSuccess,
        userId: user.id,
        depositAmount
      });

      if (!updateSuccess) {
        logger.error('[FarmingService] ЭТАП 6.1: Ошибка обновления базы данных', { 
          userId: user.id
        });
        return { success: false, message: 'Ошибка обновления данных' };
      }

      logger.info('[FarmingService] ЭТАП 7: Депозит выполнен успешно', {
        userId: user.id,
        balanceBeforeDeposit: currentBalance,
        balanceAfterDeposit: newBalance,
        depositAmount,
        newDepositAmount,
        updateSuccess: true
      });

      // ИСПРАВЛЕНИЕ ДУБЛИРОВАНИЯ: Транзакция создается в UniFarmingRepository.addDeposit()
      // Убираем избыточное создание транзакции здесь для предотвращения дублей
      logger.info('[FarmingService] ИСПРАВЛЕНО: Убрана дублирующая логика создания транзакций', {
        userId: user.id,
        depositAmount,
        note: 'Транзакция будет создана в UniFarmingRepository.addDeposit()'
      });

      // Создаём запись в farming_sessions после успешного депозита
      logger.info('[FarmingService] ЭТАП 10: Создание записи в farming_sessions', {
        userId: user.id,
        depositAmount
      });

      try {
        const farmingSessionPayload = {
          user_id: user.id,
          session_type: 'UNI_FARMING',
          deposit_amount: depositAmount,
          farming_rate: parseFloat(FARMING_CONFIG.DEFAULT_RATE.toString()),
          session_start: new Date().toISOString(),
          currency: 'UNI',
          status: 'active',
          created_at: new Date().toISOString()
        };

        const { data: sessionData, error: sessionError } = await supabase
          .from('farming_sessions')
          .insert([farmingSessionPayload])
          .select()
          .single();

        if (sessionError) {
          logger.error('[FarmingService] Ошибка создания farming_sessions', {
            error: sessionError.message,
            details: sessionError.details,
            payload: farmingSessionPayload
          });
        } else {
          logger.info('[FarmingService] Запись farming_sessions успешно создана', {
            sessionId: sessionData?.id,
            userId: sessionData?.user_id,
            depositAmount: sessionData?.deposit_amount
          });
        }
      } catch (sessionError) {
        logger.error('[FarmingService] Исключение при создании farming_sessions', {
          error: sessionError instanceof Error ? sessionError.message : String(sessionError),
          userId: user.id
        });
      }

      logger.info('[FarmingService] ЭТАП 11: УСПЕШНОЕ ЗАВЕРШЕНИЕ', {
        userId: user.id,
        amount: depositAmount,
        success: true
      });

      return { success: true, message: 'Депозит успешно добавлен в фарминг' };
    } catch (error) {
      logger.error('[FarmingService] ФИНАЛЬНЫЙ CATCH: Критическое исключение в depositUniForFarming', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: typeof error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        userId: userId || 'unknown',
        amount: amount || 'unknown'
      });
      
      console.error('[CRITICAL FARMING ERROR]', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: userId || 'unknown',
        amount: amount || 'unknown'
      });
      
      return { success: false, message: 'Ошибка при обработке депозита' };
    }
  }

  async claimRewards(telegramId: string): Promise<{ success: boolean; message: string; amount?: number }> {
    try {
      const user = await this.userRepository.getUserByTelegramId(Number(telegramId));
      if (!user) {
        return { success: false, message: 'Пользователь не найден' };
      }

      // Расчет накопленных вознаграждений
      const startTime = user.uni_farming_start_timestamp ? new Date(user.uni_farming_start_timestamp).getTime() : 0;
      const currentTime = Date.now();
      const farmingDuration = Math.max(0, currentTime - startTime) / 1000; // в секундах
      
      const depositAmount = parseFloat(user.uni_deposit_amount || '0');
      const rate = parseFloat(user.uni_farming_rate || '0.01');
      const rewards = depositAmount * rate * farmingDuration / 86400; // дневная ставка

      if (rewards <= 0) {
        return { success: false, message: 'Нет доступных вознаграждений' };
      }

      // Обновляем баланс через централизованный BalanceManager
      const { balanceManager } = await import('../../core/BalanceManager');
      const result = await balanceManager.addBalance(
        user.id,
        rewards,
        0,
        'FarmingService.harvestUni'
      );

      if (!result.success) {
        return { success: false, message: result.error || 'Ошибка обновления баланса' };
      }

      // Обновляем время последнего сбора отдельно
      const { error } = await supabase
        .from(FARMING_TABLES.USERS)
        .update({
          uni_farming_last_update: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        return { success: false, message: 'Ошибка обновления времени сбора' };
      }

      return { success: true, message: 'Вознаграждения собраны', amount: rewards };
    } catch (error) {
      logger.error('[FarmingService] Ошибка сбора вознаграждений:', error);
      return { success: false, message: 'Ошибка при сборе вознаграждений' };
    }
  }

  async harvestUniFarming(telegramId: string): Promise<{ success: boolean; message: string; harvested?: number }> {
    try {
      const result = await this.claimRewards(telegramId);
      return {
        success: result.success,
        message: result.message,
        harvested: result.amount
      };
    } catch (error) {
      logger.error('[FarmingService] Ошибка харвеста UNI:', error);
      return { success: false, message: 'Ошибка при харвесте UNI' };
    }
  }

  async getFarmingHistory(telegramId: string, limit: number = 10): Promise<any[]> {
    try {
      const user = await this.userRepository.getUserByTelegramId(Number(telegramId));
      if (!user) {
        return [];
      }

      // Возвращаем историю транзакций farming
      const { data: transactions } = await supabase
        .from(FARMING_TABLES.TRANSACTIONS)
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['UNI_DEPOSIT', 'UNI_HARVEST', 'UNI_REWARD'])
        .order('created_at', { ascending: false })
        .limit(limit);

      return transactions || [];
    } catch (error) {
      logger.error('[FarmingService] Ошибка получения истории фарминга:', error);
      return [];
    }
  }
}

// Экспорт экземпляра для использования в directDeposit
export const farmingService = new FarmingService();