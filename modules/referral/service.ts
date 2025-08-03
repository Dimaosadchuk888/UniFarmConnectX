import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';
import { REFERRAL_TABLES, REFERRAL_COMMISSION_RATES } from './model';

export class ReferralService {
  /**
   * Генерирует реферальный код для пользователя
   */
  async generateReferralCode(userId: number): Promise<string> {
    try {
      logger.info('[ReferralService] Генерация реферального кода', { userId });

      // Получаем данные пользователя
      const { data: user, error: userError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .select('id, ref_code, telegram_id, username')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        logger.error('[ReferralService] Пользователь не найден', {
          userId,
          error: userError?.message
        });
        throw new Error('Пользователь не найден');
      }

      // Если у пользователя уже есть реферальный код, возвращаем его
      if (user.ref_code && user.ref_code.trim() !== '') {
        logger.info('[ReferralService] Возвращаем существующий реферальный код', {
          userId,
          refCode: user.ref_code
        });
        return user.ref_code;
      }

      // Генерируем новый уникальный реферальный код
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const newRefCode = `REF_${timestamp}_${randomSuffix}`;

      // Обновляем реферальный код в базе данных
      const { error: updateError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .update({ ref_code: newRefCode })
        .eq('id', userId);

      if (updateError) {
        logger.error('[ReferralService] Ошибка обновления реферального кода', {
          userId,
          newRefCode,
          error: updateError.message
        });
        throw new Error('Не удалось сохранить реферальный код');
      }

      logger.info('[ReferralService] Реферальный код успешно сгенерирован', {
        userId,
        refCode: newRefCode
      });

      return newRefCode;
    } catch (error) {
      logger.error('[ReferralService] Ошибка генерации реферального кода', {
        userId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Обработка реферала - связывание нового пользователя с реферером
   */
  async processReferral(refCode: string, newUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('[ReferralService] Обработка реферала', {
        refCode,
        newUserId
      });

      // Находим пользователя по реферальному коду
      const { data: inviter, error: inviterError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .select('id, telegram_id, username')
        .eq('ref_code', refCode)
        .single();

      if (inviterError || !inviter) {
        logger.warn('[ReferralService] Реферальный код не найден', {
          refCode,
          error: inviterError?.message
        });
        return { success: false, error: 'Недействительный реферальный код' };
      }

      // Проверяем, что пользователь не пытается пригласить сам себя
      if (inviter.id.toString() === newUserId) {
        logger.warn('[ReferralService] Попытка самоприглашения', {
          userId: newUserId,
          refCode
        });
        return { success: false, error: 'Нельзя использовать собственный реферальный код' };
      }

      // Обновляем поле referred_by у нового пользователя
      const { error: updateError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .update({ referred_by: inviter.id })
        .eq('id', newUserId);

      if (updateError) {
        logger.error('[ReferralService] Ошибка обновления реферальной связи', {
          newUserId,
          inviterId: inviter.id,
          error: updateError.message
        });
        return { success: false, error: 'Ошибка сохранения реферальной связи' };
      }

      logger.info('[ReferralService] Реферальная связь установлена', {
        newUserId,
        inviterId: inviter.id,
        inviterTelegramId: inviter.telegram_id,
        refCode
      });

      // Создаем запись в таблице referrals для отслеживания реферальной связи
      const { error: referralError } = await supabase
        .from(REFERRAL_TABLES.REFERRALS)
        .insert({
          user_id: parseInt(newUserId),          // ID приглашенного пользователя
          referred_user_id: parseInt(newUserId), // Дублируем ID для совместимости с БД
          inviter_id: inviter.id,                // ID пригласившего
          level: 1,
          reward_uni: '0',
          reward_ton: '0',
          ref_path: [inviter.id] // Путь начинается с прямого пригласителя
        });

      if (referralError) {
        logger.warn('[ReferralService] Ошибка создания записи в таблице referrals', {
          error: referralError.message,
          referrerId: inviter.id,
          referredId: newUserId
        });
        // Не возвращаем ошибку, так как основная связь уже установлена через referred_by
      }

      return { success: true };

    } catch (error) {
      logger.error('[ReferralService] Ошибка обработки реферала:', {
        refCode,
        newUserId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return { success: false, error: 'Внутренняя ошибка сервера' };
    }
  }

  /**
   * Построение цепочки рефереров до 20 уровней через Supabase API
   */
  async buildReferrerChain(userId: string): Promise<string[]> {
    try {
      const referrerChain: string[] = [];
      let currentUserId = userId;
      let level = 0;
      const maxLevels = 20;

      while (level < maxLevels) {
        // Получаем пользователя и его реферера
        const { data: user, error } = await supabase
          .from(REFERRAL_TABLES.USERS)
          .select('id, referred_by')
          .eq('id', currentUserId)
          .single();

        if (error || !user) {
          logger.warn('[ReferralService] Пользователь не найден или ошибка запроса', {
            currentUserId,
            level,
            error: error?.message
          });
          break;
        }

        // Если нет реферера, завершаем цепочку
        if (!user.referred_by) {
          break;
        }

        // Добавляем реферера в цепочку
        referrerChain.push(user.referred_by.toString());
        currentUserId = user.referred_by.toString();
        level++;
      }

      logger.info('[ReferralService] Построена цепочка рефереров', {
        userId,
        chainLength: referrerChain.length,
        maxDepth: level
      });

      return referrerChain;
    } catch (error) {
      logger.error('[ReferralService] Ошибка построения цепочки рефереров', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Рассчёт реферальных комиссий для 20-уровневой системы
   * Новая схема: прямые проценты от фактического дохода
   */
  calculateReferralCommissions(
    amount: number,
    referrerChain: string[]
  ): Array<{ userId: string; level: number; percentage: number; amount: string }> {
    const commissions: Array<{ userId: string; level: number; percentage: number; amount: string }> = [];

    for (let i = 0; i < referrerChain.length && i < 20; i++) {
      const level = i + 1;
      const userId = referrerChain[i];

      // Получаем процент напрямую от фактического дохода
      const commissionRate = REFERRAL_COMMISSION_RATES[level as keyof typeof REFERRAL_COMMISSION_RATES];
      
      if (!commissionRate) {
        continue; // Пропускаем уровни без определенной ставки
      }

      const commissionAmount = amount * commissionRate;
      const percentageDisplay = commissionRate * 100; // Для отображения в %

      commissions.push({
        userId,
        level,
        percentage: percentageDisplay,
        amount: commissionAmount.toFixed(8)
      });
    }

    return commissions;
  }

  /**
   * Распределение реферальных наград через Supabase API
   */
  async distributeReferralRewards(
    sourceUserId: string,
    amount: string,
    currency: 'UNI' | 'TON',
    sourceType: 'farming' | 'boost' = 'farming'
  ): Promise<{ success: boolean; distributed: number; totalAmount: string }> {
    try {
      logger.info('[ReferralService] Начало распределения реферальных наград', {
        sourceUserId,
        amount,
        currency,
        sourceType
      });

      // Получаем цепочку рефереров
      const referrerChain = await this.buildReferrerChain(sourceUserId);
      
      if (referrerChain.length === 0) {
        logger.info('[ReferralService] Цепочка рефереров пуста', { sourceUserId });
        return { success: true, distributed: 0, totalAmount: '0' };
      }

      // Рассчитываем комиссии
      const commissions = this.calculateReferralCommissions(parseFloat(amount), referrerChain);
      
      let distributedCount = 0;
      let totalDistributedAmount = 0;

      // Распределяем награды
      for (const commission of commissions) {
        try {
          // Логируем реферальное начисление (без создания транзакций)
          logger.info('[ReferralService] Реферальное начисление', {
            recipientId: commission.userId,
            level: commission.level,
            percentage: commission.percentage,
            amount: commission.amount,
            currency,
            sourceType,
            sourceUserId
          });

          // Обновляем баланс получателя награды через централизованный BalanceManager
          const { balanceManager } = await import('../../core/BalanceManager');
          const amount_uni = currency === 'UNI' ? parseFloat(commission.amount) : 0;
          const amount_ton = currency === 'TON' ? parseFloat(commission.amount) : 0;
          
          const result = await balanceManager.addBalance(
            parseInt(commission.userId),
            amount_uni,
            amount_ton,
            'ReferralService.distributeCommissions'
          );

          if (result.success) {
            distributedCount++;
            totalDistributedAmount += parseFloat(commission.amount);

            // Записываем в referral_earnings таблицу
            await supabase
              .from('referral_earnings')
              .insert({
                referrer_user_id: parseInt(commission.userId),
                referred_user_id: parseInt(sourceUserId),
                level: commission.level,
                percentage: commission.percentage,
                amount: parseFloat(commission.amount),
                currency: currency,
                source_type: sourceType,
                created_at: new Date().toISOString()
              });

            // 🛡️ КРИТИЧЕСКАЯ ЗАЩИТА: Проверка дубликатов REFERRAL_REWARD
            const { DeduplicationHelper } = await import('../../safe-deduplication-helper');
            const duplicateCheck = await DeduplicationHelper.checkRecentTransaction(
              parseInt(commission.userId),
              'REFERRAL_REWARD',
              parseFloat(commission.amount),
              currency,
              10 // 10 минут окно для реферальных наград
            );

            if (duplicateCheck.exists) {
              DeduplicationHelper.logPreventedDuplicate(
                parseInt(commission.userId),
                'REFERRAL_REWARD',
                parseFloat(commission.amount),
                `Referral L${commission.level} from User ${sourceUserId} (prevented duplicate)`
              );
              
              logger.warn('[ReferralService] 🛡️ ДУБЛИРОВАНИЕ ПРЕДОТВРАЩЕНО: REFERRAL_REWARD уже существует', {
                userId: commission.userId,
                sourceUserId,
                level: commission.level,
                amount: commission.amount,
                currency,
                existingTransactionId: duplicateCheck.existingTransaction?.id
              });
              continue; // Пропускаем создание дублированной транзакции
            }

            // Создаем транзакцию через UnifiedTransactionService
            const { UnifiedTransactionService } = await import('../../core/TransactionService');
            const transactionService = UnifiedTransactionService.getInstance();
            
            await transactionService.createTransaction({
              user_id: parseInt(commission.userId),
              type: 'REFERRAL_REWARD',
              amount_uni: currency === 'UNI' ? parseFloat(commission.amount) : 0,
              amount_ton: currency === 'TON' ? parseFloat(commission.amount) : 0,
              currency: currency,
              status: 'completed',
              description: `Referral L${commission.level} from User ${sourceUserId}: ${commission.amount} ${currency} (${commission.percentage}%)`,
              metadata: {
                source_user_id: parseInt(sourceUserId),
                level: commission.level,
                percentage: commission.percentage,
                source_type: sourceType
              }
            });

            logger.info('[ReferralService] Реферальная награда начислена', {
              recipientId: commission.userId,
              level: commission.level,
              amount: commission.amount,
              currency,
              newBalance: result.newBalance ? 
                (currency === 'UNI' ? result.newBalance.balance_uni : result.newBalance.balance_ton) : 0,
              sourceType,
              sourceUserId
            });
          } else {
            logger.error('[ReferralService] Ошибка обновления баланса', {
              recipientId: commission.userId,
              error: result.error
            });
          }
        } catch (error) {
          logger.error('[ReferralService] Ошибка начисления реферальной награды', {
            recipientId: commission.userId,
            level: commission.level,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      logger.info('[ReferralService] Завершено распределение реферальных наград', {
        sourceUserId,
        sourceType,
        distributedCount,
        totalDistributedAmount: totalDistributedAmount.toFixed(6),
        currency
      });

      return {
        success: true,
        distributed: distributedCount,
        totalAmount: totalDistributedAmount.toFixed(6)
      };

    } catch (error) {
      logger.error('[ReferralService] Ошибка распределения реферальных наград', {
        sourceUserId,
        amount,
        sourceType,
        error: error instanceof Error ? error.message : String(error)
      });
      return { success: false, distributed: 0, totalAmount: '0' };
    }
  }

  /**
   * Получение статистики реферальной программы
   */
  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    totalEarned: { UNI: string; TON: string };
    monthlyEarned: { UNI: string; TON: string };
  }> {
    try {
      // Получаем общее количество рефералов
      const { data: referrals, error: referralsError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .select('id, created_at')
        .eq('referred_by', userId);

      if (referralsError) {
        logger.error('[ReferralService] Ошибка получения рефералов', {
          userId,
          error: referralsError.message
        });
        throw referralsError;
      }

      const totalReferrals = referrals?.length || 0;
      
      // Для упрощения считаем всех рефералов активными
      // В будущем можно добавить логику проверки активности
      const activeReferrals = totalReferrals;

      // Возвращаем базовую статистику
      // В production здесь должна быть логика подсчёта заработанных средств
      return {
        totalReferrals,
        activeReferrals,
        totalEarned: { UNI: '0.00000000', TON: '0.00000000' },
        monthlyEarned: { UNI: '0.00000000', TON: '0.00000000' }
      };

    } catch (error) {
      logger.error('[ReferralService] Ошибка получения статистики рефералов', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarned: { UNI: '0.00000000', TON: '0.00000000' },
        monthlyEarned: { UNI: '0.00000000', TON: '0.00000000' }
      };
    }
  }

  /**
   * Получить список рефералов пользователя
   */
  async getUserReferrals(userId: number): Promise<any[]> {
    try {
      logger.info('[ReferralService] Получение списка рефералов', { userId });

      const { data: referrals, error: referralsError } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .select('id, username, first_name, created_at, uni_balance, ton_balance')
        .eq('referred_by', userId)
        .order('created_at', { ascending: false });

      if (referralsError) {
        logger.error('[ReferralService] Ошибка получения рефералов', {
          userId,
          error: referralsError.message
        });
        return [];
      }

      return referrals || [];

    } catch (error) {
      logger.error('[ReferralService] Ошибка получения списка рефералов', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Получить реальную статистику партнерской программы с данными из базы
   */
  async getRealReferralStats(userId: number): Promise<any> {
    try {
      console.log('[ReferralService API CALL] НАЧАЛО getRealReferralStats для userId:', userId);
      console.log('[ReferralService ENV CHECK] Проверка переменных окружения:', {
        supabaseUrl: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
        supabaseKey: process.env.SUPABASE_KEY ? 'SET' : 'NOT SET',
        supabaseClient: !!supabase
      });
      logger.info('[ReferralService] Получение реальной статистики партнерской программы', { 
        userId,
        supabaseUrl: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
        supabaseKey: process.env.SUPABASE_KEY ? 'SET' : 'NOT SET'
      });

      // Сначала проверим, существует ли пользователь
      console.log('[ReferralService API DEBUG] Начинаем поиск пользователя в базе данных:', {
        userId,
        tableName: 'users',
        supabaseConfigured: !!supabase,
        envVarsSet: {
          SUPABASE_URL: !!process.env.SUPABASE_URL,
          SUPABASE_KEY: !!process.env.SUPABASE_KEY
        }
      });
      
      console.log('[ReferralService] ВЫПОЛНЯЕМ ЗАПРОС: supabase.from("users").select("id, username, ref_code").eq("id", ' + userId + ').single()');
      
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, username, ref_code')
        .eq('id', userId)
        .single();
        
      console.log('[ReferralService] РЕЗУЛЬТАТ ЗАПРОСА ПОЛУЧЕН');
        
      console.log('[ReferralService API DEBUG] Результат поиска пользователя:', {
        hasUser: !!user,
        userError: userError,
        userErrorMessage: userError?.message,
        userErrorCode: userError?.code,
        userData: user
      });

      logger.info('[ReferralService] Результат поиска пользователя', { 
        hasUser: !!user,
        error: userError?.message,
        userDetailsCount: user ? Object.keys(user).length : 0,
        userId,
        query: `users table where id = ${userId}`
      });

      // ИСПРАВЛЕНО: Если пользователь не найден в базе, возвращаем пустую статистику вместо fallback данных
      if (userError || !user) {
        console.log('[ReferralService] Пользователь не найден в базе, возвращаем пустую статистику:', {
          userId,
          userError: userError?.message,
          userErrorCode: userError?.code
        });
        logger.info('[ReferralService] Пользователь не найден, возвращаем пустую статистику', { userId, error: userError?.message });
        
        // Возвращаем пустую статистику для нового пользователя
        return {
          success: true,
          user: {
            id: userId,
            username: 'Новый пользователь',
            ref_code: 'Не найден'
          },
          summary: {
            total_partners: 0,
            total_transactions: 0,
            total_income: {
              uni: 0,
              ton: 0
            }
          },
          levels: []
        };
      }

      const actualUser = user;
      console.log('[ReferralService DEBUG] Пользователь найден успешно:', {
        userId,
        username: actualUser.username,
        ref_code: actualUser.ref_code
      });

      logger.info('[ReferralService] Использую данные пользователя', { actualUser });

      // 1. Получаем все реферальные транзакции
      const { data: referralTransactions, error: refError } = await supabase
        .from('transactions')
        .select('id, user_id, type, amount_uni, amount_ton, currency, description, created_at')
        .eq('user_id', userId)
        .eq('type', 'REFERRAL_REWARD')
        .order('created_at', { ascending: false });

      console.log('[ReferralService] Результат запроса реферальных транзакций:', {
        hasTransactions: !!referralTransactions,
        transactionsCount: referralTransactions?.length || 0,
        hasError: !!refError,
        errorMessage: refError?.message,
        errorCode: refError?.code
      });

      if (refError) {
        logger.error('[ReferralService] Ошибка получения реферальных транзакций', {
          userId,
          error: refError.message
        });
        console.log('[ReferralService КРИТИЧЕСКАЯ ОШИБКА] Ошибка в запросе транзакций:', {
          userId,
          error: refError,
          errorMessage: refError.message,
          errorCode: refError.code,
          errorDetails: refError.details
        });
        // Временно НЕ бросаем ошибку для диагностики
        // throw refError;
      } else if (referralTransactions && referralTransactions.length > 0) {
        console.log('[ReferralService] Найдены реферальные транзакции:', {
          count: referralTransactions.length,
          firstThree: referralTransactions.slice(0, 3).map(tx => ({
            id: tx.id,
            amount_uni: tx.amount_uni,
            amount_ton: tx.amount_ton,
            description: tx.description?.substring(0, 50)
          }))
        });
      }

      // 2. Получаем всех пользователей для построения реферальной цепочки
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id, username, first_name, referred_by, balance_uni, balance_ton, uni_farming_start_timestamp, ton_boost_package')
        .order('id', { ascending: true });

      if (usersError) {
        logger.error('[ReferralService] Ошибка получения пользователей', { error: usersError.message });
        console.log('[ReferralService КРИТИЧЕСКАЯ ОШИБКА] Ошибка в запросе пользователей:', {
          userId,
          error: usersError,
          errorMessage: usersError.message,
          errorCode: usersError.code,
          errorDetails: usersError.details
        });
        // Временно НЕ бросаем ошибку для диагностики
        // throw usersError;
      }

      // 3. Строим реферальную цепочку
      const referralChain = this.buildReferralChain(userId, allUsers || []);
      
      // 4. Анализируем транзакции по уровням
      const levelIncome: Record<number, { uni: number; ton: number }> = {};
      const levelCounts: Record<number, number> = {};

      if (referralTransactions && referralTransactions.length > 0) {
        referralTransactions.forEach(tx => {
          // Извлекаем уровень из описания транзакции
          const levelMatch = tx.description?.match(/L(\d+)/);
          if (levelMatch) {
            const level = parseInt(levelMatch[1]);
            if (!levelIncome[level]) {
              levelIncome[level] = { uni: 0, ton: 0 };
            }
            // Обрабатываем UNI транзакции
            if (tx.amount_uni && parseFloat(tx.amount_uni) > 0) {
              levelIncome[level].uni += parseFloat(tx.amount_uni);
            }
            // Обрабатываем TON транзакции  
            if (tx.amount_ton && parseFloat(tx.amount_ton) > 0) {
              levelIncome[level].ton += parseFloat(tx.amount_ton);
            }
          }
        });
      }

      // 5. Подсчитываем общий доход
      let totalUniEarned = 0;
      let totalTonEarned = 0;
      Object.values(levelIncome).forEach(income => {
        totalUniEarned += income.uni;
        totalTonEarned += income.ton;
      });

      // 6. Строим статистику по уровням
      const levelStats = [];
      const partnersByLevelMap: Record<number, any[]> = {};
      
      referralChain.forEach(partner => {
        if (!partnersByLevelMap[partner.level]) {
          partnersByLevelMap[partner.level] = [];
        }
        partnersByLevelMap[partner.level].push(partner);
      });

      for (let level = 1; level <= 20; level++) {
        const partners = partnersByLevelMap[level] || [];
        const income = levelIncome[level] || { uni: 0, ton: 0 };
        
        levelStats.push({
          level,
          partners: partners.length,
          income: {
            uni: parseFloat(income.uni.toFixed(6)),
            ton: parseFloat(income.ton.toFixed(6))
          },
          partnersList: partners.map((p: any) => ({
            id: p.id,
            username: p.username || p.first_name || `user_${p.id}`,
            balance_uni: parseFloat(p.balance_uni || 0),
            balance_ton: parseFloat(p.balance_ton || 0),
            is_farming: !!p.uni_farming_start_timestamp,
            has_boost: !!p.ton_boost_package
          }))
        });
      }

      // 7. Формируем итоговый результат
      const result = {
        success: true,
        user: {
          id: userId,
          username: actualUser?.username || 'demo_user',
          ref_code: actualUser?.ref_code || 'REF_1750952576614_t938vs'
        },
        summary: {
          total_partners: referralChain.length,
          total_transactions: referralTransactions?.length || 0,
          total_income: {
            uni: parseFloat(totalUniEarned.toFixed(6)),
            ton: parseFloat(totalTonEarned.toFixed(6))
          }
        },
        levels: levelStats.filter(level => level.partners > 0 || level.income.uni > 0 || level.income.ton > 0)
      };

      logger.info('[ReferralService] Статистика успешно сформирована', {
        userId,
        totalPartners: result.summary.total_partners,
        totalIncome: result.summary.total_income
      });

      return result;

    } catch (error) {
      console.log('[ReferralService КРИТИЧЕСКАЯ ОШИБКА] Перехвачено исключение в catch блоке:', {
        userId,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack',
        errorType: typeof error
      });
      logger.error('[ReferralService] Ошибка получения реальной статистики', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Возвращаем пустую структуру в случае ошибки
      return {
        success: true,
        data: {
          user_id: userId,
          username: "",
          total_referrals: 0,
          referral_counts: {},
          level_income: {},
          referrals: []
        }
      };
    }
  }

  /**
   * Строит реферальную цепочку до 20 уровней в глубину
   */
  private buildReferralChain(startUserId: number, users: any[], level = 1, visited = new Set()): any[] {
    if (level > 20 || visited.has(startUserId)) return [];

    visited.add(startUserId);

    const directReferrals = users.filter(u => u.referred_by === startUserId);
    let chain: any[] = [];

    directReferrals.forEach(referral => {
      chain.push({
        ...referral,
        level: level,
        referrer_id: startUserId
      });

      // Рекурсивно находим рефералов этого пользователя
      const subChain = this.buildReferralChain(referral.id, users, level + 1, visited);
      chain.push(...subChain);
    });

    return chain;
  }

  /**
   * Получить историю реферальных доходов
   */
  async getReferralHistory(userId: number): Promise<any> {
    try {
      logger.info('[ReferralService] Получение истории реферальных доходов', { userId });

      // Получаем транзакции типа REFERRAL_REWARD для пользователя
      const { data: transactions, error } = await supabase
        .from(REFERRAL_TABLES.TRANSACTIONS)
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'REFERRAL_REWARD')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        logger.error('[ReferralService] Ошибка получения истории доходов', { userId, error });
        return { history: [], total: 0 };
      }

      const history = transactions?.map(tx => ({
        id: tx.id,
        amount: parseFloat(tx.amount),
        currency: tx.currency,
        timestamp: tx.timestamp,
        from_user: tx.from_user_id,
        level: tx.referral_level || 1
      })) || [];

      const total = history.reduce((sum, item) => sum + item.amount, 0);

      return {
        history,
        total,
        currency: 'UNI'
      };
    } catch (error) {
      logger.error('[ReferralService] Ошибка получения истории доходов', { userId, error });
      return { history: [], total: 0 };
    }
  }

  /**
   * Получить реферальную цепочку
   */
  async getReferralChain(userId: number): Promise<any> {
    try {
      logger.info('[ReferralService] Получение реферальной цепочки', { userId });

      // Получаем всех пользователей для построения цепочки
      const { data: users, error } = await supabase
        .from(REFERRAL_TABLES.USERS)
        .select('id, username, first_name, referred_by, ref_code, balance_uni, balance_ton');

      if (error) {
        logger.error('[ReferralService] Ошибка получения данных пользователей', { error });
        return { chain: [], levels: 0 };
      }

      // Строим цепочку рефералов
      const chain = this.buildReferralChain(userId, users || [], 1, new Set());

      return {
        chain,
        levels: Math.max(...chain.map(user => user.level), 0),
        total_referrals: chain.length
      };
    } catch (error) {
      logger.error('[ReferralService] Ошибка получения реферальной цепочки', { userId, error });
      return { chain: [], levels: 0 };
    }
  }
}