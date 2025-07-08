import { supabase } from '../../core/supabase';
import { SupabaseUserRepository } from '../user/service';
import { RewardCalculationLogic } from './logic/rewardCalculation';
import { logger } from '../../core/logger.js';
import { FARMING_TABLES, FARMING_CONFIG } from './model';

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

      const now = new Date();
      const lastClaim = user.uni_farming_last_update ? new Date(user.uni_farming_last_update) : null;
      const farmingStart = user.uni_farming_start_timestamp ? new Date(user.uni_farming_start_timestamp) : now;
      
      const baseHourlyRate = 0.01;
      const ratePerSecond = baseHourlyRate / 3600;
      const dailyRate = baseHourlyRate * 24;
      
      const hoursElapsed = lastClaim 
        ? (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60)
        : (now.getTime() - farmingStart.getTime()) / (1000 * 60 * 60);
      
      const accumulated = Math.max(0, hoursElapsed * baseHourlyRate);
      const isActive = !!user.uni_farming_start_timestamp;
      const depositAmount = user.uni_deposit_amount || '0';
      
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

      const { error } = await supabase
        .from(FARMING_TABLES.USERS)
        .update({
          uni_farming_start_timestamp: new Date().toISOString(),
          uni_farming_last_update: new Date().toISOString()
        })
        .eq('id', user.id);

      return !error;
    } catch (error) {
      logger.error('[FarmingService] Ошибка запуска фарминга', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async stopFarming(telegramId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.getUserByTelegramId(Number(telegramId));
      if (!user) return false;

      const { error } = await supabase
        .from(FARMING_TABLES.USERS)
        .update({
          uni_farming_start_timestamp: null,
          uni_farming_last_update: new Date().toISOString()
        })
        .eq('id', user.id);

      return !error;
    } catch (error) {
      logger.error('[FarmingService] Ошибка остановки фарминга', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async depositUniForFarming(telegramId: string, amount: string): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[FarmingService] ЭТАП 1: Начало депозита', { 
        telegramId, 
        telegramIdType: typeof telegramId,
        amount,
        amountType: typeof amount
      });

      const numericTelegramId = Number(telegramId);
      const user = await this.userRepository.getUserByTelegramId(numericTelegramId);
      
      logger.info('[FarmingService] ЭТАП 2: Результат поиска пользователя', { 
        numericTelegramId,
        userFound: !!user,
        userId: user?.id,
        userIdType: typeof user?.id,
        userName: user?.username
      });
      
      if (!user) {
        logger.error('[FarmingService] ЭТАП 2: Пользователь не найден', { telegramId, numericTelegramId });
        return { success: false, message: 'Пользователь не найден' };
      }

      const depositAmount = parseFloat(amount);
      if (depositAmount <= 0) {
        logger.error('[FarmingService] ЭТАП 3: Некорректная сумма депозита', { amount, depositAmount });
        return { success: false, message: 'Некорректная сумма депозита' };
      }

      const currentBalance = parseFloat(user.balance_uni || '0');
      if (currentBalance < depositAmount) {
        logger.error('[FarmingService] ЭТАП 4: Недостаточно средств', { 
          currentBalance, 
          depositAmount, 
          userId: user.id 
        });
        return { success: false, message: 'Недостаточно средств' };
      }

      logger.info('[FarmingService] ЭТАП 5: Валидация прошла успешно', {
        userId: user.id,
        currentBalance,
        depositAmount,
        validationPassed: true
      });

      // Обновляем баланс через централизованный BalanceManager
      logger.info('[FarmingService] ЭТАП 6: Попытка списания баланса через BalanceManager', {
        userId: user.id,
        currentBalance,
        depositAmount,
        operation: 'subtract'
      });

      try {
        const { balanceManager } = await import('../../core/BalanceManager');
        logger.info('[FarmingService] ЭТАП 6.1: BalanceManager импортирован успешно');
        
        const result = await balanceManager.subtractBalance(
          user.id,
          depositAmount,
          0,
          'FarmingService.depositUni'
        );

        logger.info('[FarmingService] ЭТАП 6.2: Результат BalanceManager.subtractBalance', {
          success: result.success,
          error: result.error,
          newBalance: result.newBalance
        });

        if (!result.success) {
          logger.error('[FarmingService] ЭТАП 6.3: КРИТИЧЕСКАЯ ОШИБКА: BalanceManager.subtractBalance не удался', {
            userId: user.id,
            error: result.error,
            depositAmount
          });
          return { success: false, message: result.error || 'Ошибка обновления баланса' };
        }

        logger.info('[FarmingService] ЭТАП 6.4: BalanceManager.subtractBalance завершен успешно', {
          userId: user.id,
          newBalance: result.newBalance
        });

      } catch (balanceError) {
        logger.error('[FarmingService] ЭТАП 6.5: Исключение в BalanceManager операции', {
          error: balanceError instanceof Error ? balanceError.message : String(balanceError),
          stack: balanceError instanceof Error ? balanceError.stack : undefined,
          userId: user.id,
          depositAmount
        });
        throw balanceError; // Пробрасываем исключение дальше для отладки
      }

      // Проверяем что баланс действительно обновился
      logger.info('[FarmingService] ЭТАП 7: Проверка обновления баланса', {
        userId: user.id,
        currentBalance,
        depositAmount
      });

      try {
        const updatedUser = await this.userRepository.getUserById(user.id);
        const newBalance = parseFloat(updatedUser?.balance_uni || '0');
        
        logger.info('[FarmingService] ЭТАП 7.1: Баланс после обновления', {
          userId: user.id,
          balanceBeforeDeposit: currentBalance,
          balanceAfterDeposit: newBalance,
          expectedBalance: currentBalance - depositAmount,
          actuallyUpdated: newBalance === (currentBalance - depositAmount)
        });

        // Обновляем депозит и данные фарминга отдельно
        const currentDeposit = parseFloat(user.uni_deposit_amount || '0');
        const newDepositAmount = (currentDeposit + depositAmount).toFixed(8);

        logger.info('[FarmingService] ЭТАП 8: Подготовка обновления депозита', { 
          userId: user.id,
          currentDeposit,
          newDepositAmount,
          farmingRate: FARMING_CONFIG.DEFAULT_RATE
        });

        const { data: updateData, error: updateError } = await supabase
          .from(FARMING_TABLES.USERS)
          .update({
            uni_deposit_amount: newDepositAmount,
            uni_farming_start_timestamp: new Date().toISOString(),
            uni_farming_last_update: new Date().toISOString(),
            uni_farming_rate: FARMING_CONFIG.DEFAULT_RATE // Устанавливаем ставку фарминга
          })
          .eq('id', user.id)
          .select();

        logger.info('[FarmingService] ЭТАП 8.1: Результат обновления базы данных', { 
          updateError: updateError?.message || null,
          updatedData: updateData,
          success: !updateError
        });

        if (updateError) {
          logger.error('[FarmingService] ЭТАП 8.2: Ошибка обновления базы данных', { 
            error: updateError,
            userId: user.id,
            errorMessage: updateError?.message,
            errorDetails: updateError?.details,
            errorCode: updateError?.code
          });
          return { success: false, message: 'Ошибка обновления данных' };
        }

        logger.info('[FarmingService] ЭТАП 8.3: Данные пользователя обновлены успешно', {
          userId: user.id,
          newDepositAmount,
          updateSuccess: true
        });

      } catch (updateError) {
        logger.error('[FarmingService] ЭТАП 7.2: Исключение при проверке/обновлении баланса', {
          error: updateError instanceof Error ? updateError.message : String(updateError),
          stack: updateError instanceof Error ? updateError.stack : undefined,
          userId: user.id
        });
        throw updateError;
      }

      // Создаем транзакцию напрямую с правильными полями для Supabase
      logger.info('[FarmingService] ЭТАП 9: Создание транзакции фарминга', {
        userId: user.id,
        depositAmount
      });

      try {
        const transactionPayload = {
          user_id: user.id,
          type: 'FARMING_REWARD',  // Используем существующий тип из ENUM
          amount_uni: depositAmount.toString(),  // Правильное поле для UNI
          amount_ton: '0',  // Правильное поле для TON
          status: 'confirmed',  // Используем confirmed как в существующей транзакции
          description: `UNI farming deposit: ${amount}`
        };

        logger.info('[FarmingService] ЭТАП 9.1: Подготовка payload транзакции', { 
          payload: transactionPayload,
          userId: user.id,
          depositAmount: depositAmount
        });

        const { data: transactionData, error: transactionError } = await supabase
          .from(FARMING_TABLES.TRANSACTIONS)
          .insert([transactionPayload])
          .select()
          .single();

        if (transactionError) {
          logger.error('[FarmingService] ЭТАП 9.2: Ошибка создания транзакции', { 
            error: transactionError.message,
            details: transactionError.details,
            code: transactionError.code,
            hint: transactionError.hint,
            payload: transactionPayload
          });
          
          // Выводим ошибку в консоль для отладки
          console.error('[TRANSACTION ERROR]', {
            message: transactionError.message,
            details: transactionError.details,
            code: transactionError.code,
            hint: transactionError.hint
          });
        } else {
          logger.info('[FarmingService] ЭТАП 9.3: Транзакция фарминга успешно создана', { 
            transactionId: transactionData?.id,
            type: transactionData?.type,
            amount: transactionData?.amount_uni
          });
          
          console.log('[TRANSACTION SUCCESS]', {
            id: transactionData?.id,
            type: transactionData?.type
          });
        }
        
      } catch (transactionError) {
        logger.error('[FarmingService] ЭТАП 9.4: Исключение при создании транзакции', { 
          error: transactionError instanceof Error ? transactionError.message : String(transactionError),
          stack: transactionError instanceof Error ? transactionError.stack : undefined,
          userId: user.id
        });
        console.error('[TRANSACTION EXCEPTION]', transactionError);
        throw transactionError;
      }

      logger.info('[FarmingService] ЭТАП 10: УСПЕШНОЕ ЗАВЕРШЕНИЕ', {
        userId: user.id,
        amount: depositAmount,
        telegramId,
        success: true
      });

      return { success: true, message: 'Депозит успешно добавлен в фарминг' };
    } catch (error) {
      logger.error('[FarmingService] ФИНАЛЬНЫЙ CATCH: Критическое исключение в depositUniForFarming', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: typeof error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        telegramId,
        amount,
        userId: user?.id || 'unknown'
      });
      
      console.error('[CRITICAL FARMING ERROR]', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        telegramId,
        amount
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