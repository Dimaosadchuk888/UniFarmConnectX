import { supabase } from '../../core/supabase';
import { SupabaseUserRepository } from '../user/service';
import { RewardCalculationLogic } from './logic/rewardCalculation';
import { logger } from '../../core/logger.js';

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
      
      const baseHourlyRate = 0.001;
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
        can_claim: accumulated >= 0.001,
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
        .from('users')
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
        .from('users')
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
      const user = await this.userRepository.getUserByTelegramId(Number(telegramId));
      if (!user) {
        return { success: false, message: 'Пользователь не найден' };
      }

      const depositAmount = parseFloat(amount);
      if (depositAmount <= 0) {
        return { success: false, message: 'Некорректная сумма депозита' };
      }

      const currentBalance = parseFloat(user.balance_uni || '0');
      if (currentBalance < depositAmount) {
        return { success: false, message: 'Недостаточно средств' };
      }

      const newBalance = (currentBalance - depositAmount).toFixed(8);
      const currentDeposit = parseFloat(user.uni_deposit_amount || '0');
      const newDepositAmount = (currentDeposit + depositAmount).toFixed(8);

      const { error: updateError } = await supabase
        .from('users')
        .update({
          balance_uni: newBalance,
          uni_deposit_amount: newDepositAmount,
          uni_farming_start_timestamp: new Date().toISOString(),
          uni_farming_last_update: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        return { success: false, message: 'Ошибка обновления данных' };
      }

      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'UNI_DEPOSIT',
          amount_uni: depositAmount,
          amount_ton: 0,
          description: `UNI farming deposit: ${amount}`
        });

      logger.info(`[FARMING] User ${telegramId} deposited ${amount} UNI for farming`, {
        userId: user.id,
        amount: depositAmount,
        newBalance,
        newDepositAmount
      });

      return { success: true, message: 'Депозит успешно добавлен в фарминг' };
    } catch (error) {
      logger.error('[FarmingService] Ошибка депозита UNI:', error);
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
      const rate = parseFloat(user.uni_farming_rate || '0.001');
      const rewards = depositAmount * rate * farmingDuration / 86400; // дневная ставка

      if (rewards <= 0) {
        return { success: false, message: 'Нет доступных вознаграждений' };
      }

      // Обновляем баланс и время последнего сбора
      const currentBalance = parseFloat(user.balance_uni || '0');
      const newBalance = (currentBalance + rewards).toFixed(8);

      const { error } = await supabase
        .from('users')
        .update({
          balance_uni: newBalance,
          uni_farming_last_update: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        return { success: false, message: 'Ошибка обновления баланса' };
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
        .from('transactions')
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