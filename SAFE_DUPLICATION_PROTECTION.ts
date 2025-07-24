/**
 * 🛡️ БЕЗОПАСНАЯ ЗАЩИТА ОТ ДУБЛИРОВАНИЯ TON BOOST
 * Временное решение для предотвращения двойных начислений без рисков
 * Применяется БЕЗ удаления существующих вызовов
 */

// ПРИМЕР БЕЗОПАСНОГО ИСПРАВЛЕНИЯ для modules/boost/service.ts

class BoostService {
  // Временные защитные флаги
  private uniБонусНачислен = new Set<string>();
  private farmingАктивирован = new Set<string>();
  private activationInProgress = new Set<string>();

  /**
   * ЗАЩИЩЕННАЯ версия awardUniBonus - предотвращает дублирование
   */
  private async awardUniBonus(userId: string, boostPackage: BoostPackageData): Promise<boolean> {
    try {
      // Создаем уникальный ключ для предотвращения дублирования
      const timeWindow = Math.floor(Date.now() / 10000) * 10000; // Окно 10 секунд
      const key = `${userId}-${boostPackage.id}-${timeWindow}`;
      
      if (this.uniБонусНачислен.has(key)) {
        logger.warn('[BoostService] [ЗАЩИТА] UNI бонус уже начислен в этом временном окне, пропускаем дубликат', { 
          userId, 
          packageId: boostPackage.id,
          timeWindow 
        });
        return true; // Возвращаем успех, чтобы не сломать логику
      }
      
      // Помечаем что начисление в процессе
      this.uniБонусНачислен.add(key);
      
      logger.info('[BoostService] [ЗАЩИТА] Начисление UNI бонуса разрешено', {
        userId,
        packageName: boostPackage.name,
        uniBonus: boostPackage.uni_bonus,
        protectionKey: key
      });

      // ОРИГИНАЛЬНАЯ ЛОГИКА ОСТАЕТСЯ БЕЗ ИЗМЕНЕНИЙ
      const { data: user, error: getUserError } = await supabase
        .from(BOOST_TABLES.USERS)
        .select('balance_uni')
        .eq('id', userId)
        .single();

      if (getUserError) {
        logger.error('[BoostService] Ошибка получения пользователя для UNI бонуса:', getUserError);
        this.uniБонусНачислен.delete(key); // Убираем защиту при ошибке
        return false;
      }

      // Обновляем баланс UNI через централизованный BalanceManager
      const { balanceManager } = await import('../../core/BalanceManager');
      const result = await balanceManager.addBalance(
        parseInt(userId),
        boostPackage.uni_bonus,
        0,
        'BoostService.uni_bonus'
      );

      if (!result.success) {
        logger.error('[BoostService] Ошибка обновления баланса UNI:', result.error);
        this.uniБонусНачислен.delete(key); // Убираем защиту при ошибке
        return false;
      }

      // Записываем транзакцию UNI бонуса
      const { error: transactionError } = await supabase
        .from(BOOST_TABLES.TRANSACTIONS)
        .insert({
          user_id: parseInt(userId),
          type: 'DAILY_BONUS',
          amount: boostPackage.uni_bonus.toString(),
          currency: 'UNI',
          status: 'completed',
          description: `UNI бонус за покупку TON Boost "${boostPackage.name}" (+${boostPackage.uni_bonus} UNI)`,
          created_at: new Date().toISOString(),
          metadata: {
            protection_key: key,
            original_type: 'UNI_BONUS_TON_BOOST',
            boost_package_id: boostPackage.id
          }
        });

      if (transactionError) {
        logger.error('[BoostService] Ошибка создания транзакции UNI бонуса:', transactionError);
        // НЕ возвращаем false, так как баланс уже обновлен
      }

      logger.info('[BoostService] [ЗАЩИТА] UNI бонус успешно начислен с защитой', {
        userId,
        oldBalance: parseFloat(user.balance_uni || '0'),
        newBalance: result.newBalance || 'unknown',
        bonusAmount: boostPackage.uni_bonus,
        protectionKey: key
      });

      // Автоочистка защиты через 30 секунд
      setTimeout(() => {
        this.uniБонусНачислен.delete(key);
      }, 30000);

      return true;
    } catch (error) {
      logger.error('[BoostService] [ЗАЩИТА] Ошибка начисления UNI бонуса с защитой:', error);
      return false;
    }
  }

  /**
   * ЗАЩИЩЕННАЯ версия TonFarmingRepository активации
   */
  private async activateBoostWithProtection(
    userId: string, 
    boostPackage: any, 
    depositAmount: number
  ): Promise<boolean> {
    try {
      const key = `${userId}-${boostPackage.id}`;
      
      if (this.farmingАктивирован.has(key)) {
        logger.warn('[BoostService] [ЗАЩИТА] TON Farming уже активирован, пропускаем дубликат', { 
          userId, 
          boostId: boostPackage.id 
        });
        return true;
      }
      
      this.farmingАктивирован.add(key);

      logger.info('[BoostService] [ЗАЩИТА] Активация TON Farming разрешена', {
        userId,
        boostPackageId: boostPackage.id,
        protectionKey: key
      });

      const { TonFarmingRepository } = await import('./TonFarmingRepository');
      const tonFarmingRepo = new TonFarmingRepository();
      
      const activationSuccess = await tonFarmingRepo.activateBoost(
        userId,
        boostPackage.id,
        boostPackage.daily_rate,
        new Date(Date.now() + boostPackage.duration_days * 24 * 60 * 60 * 1000).toISOString(),
        depositAmount
      );
      
      if (activationSuccess) {
        logger.info('[BoostService] [ЗАЩИТА] TON Farming успешно активирован с защитой', {
          userId, 
          boostPackageId: boostPackage.id, 
          dailyRate: boostPackage.daily_rate,
          depositAmount
        });
      } else {
        logger.error('[BoostService] [ЗАЩИТА] Ошибка активации TON Farming с защитой');
        this.farmingАктивирован.delete(key); // Убираем защиту при ошибке
      }

      // Автоочистка защиты через 60 секунд
      setTimeout(() => {
        this.farmingАктивирован.delete(key);
      }, 60000);

      return activationSuccess;
    } catch (error) {
      logger.error('[BoostService] [ЗАЩИТА] Ошибка активации TON Farming с защитой:', error);
      return false;
    }
  }

  /**
   * ЗАЩИЩЕННАЯ версия полной активации boost
   */
  private async activateBoost(userId: string, boostId: string): Promise<boolean> {
    const key = `${userId}-${boostId}`;
    
    if (this.activationInProgress.has(key)) {
      logger.warn('[BoostService] [ЗАЩИТА] Активация Boost уже в процессе, пропускаем дубликат', { 
        userId, 
        boostId 
      });
      return true;
    }
    
    this.activationInProgress.add(key);

    try {
      // ОРИГИНАЛЬНАЯ ЛОГИКА activateBoost ОСТАЕТСЯ БЕЗ ИЗМЕНЕНИЙ
      const boostPackage = await this.getBoostPackageById(boostId);
      if (!boostPackage) {
        logger.error('[BoostService] Boost пакет не найден для активации', { boostId });
        return false;
      }

      logger.info('[BoostService] [ЗАЩИТА] Активация Boost пакета с защитой', {
        userId,
        boostId,
        packageName: boostPackage.name,
        durationDays: boostPackage.duration_days
      });

      // Обновить поля в users таблице для планировщика
      const { error: userError } = await supabase
        .from('users')
        .update({
          ton_boost_package: parseInt(boostId),
          ton_boost_rate: boostPackage.daily_rate
        })
        .eq('id', parseInt(userId));
      
      if (userError) {
        logger.error('[BoostService] Ошибка обновления users:', userError);
        return false;
      }
      
      // Создать/обновить запись в ton_farming_data через защищенный метод
      const activationSuccess = await this.activateBoostWithProtection(
        userId,
        boostPackage,
        parseFloat(boostPackage.min_amount.toString())
      );
      
      if (!activationSuccess) {
        logger.error('[BoostService] Ошибка активации через защищенный TonFarmingRepository');
        return false;
      }
      
      logger.info('[BoostService] [ЗАЩИТА] Boost успешно активирован с защитой', {
        userId,
        boostId,
        packageName: boostPackage.name,
        dailyRate: boostPackage.daily_rate,
        durationDays: boostPackage.duration_days
      });

      return true;

    } catch (error) {
      logger.error('[BoostService] [ЗАЩИТА] Ошибка активации Boost с защитой', {
        userId,
        boostId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    } finally {
      // Автоочистка защиты через 60 секунд
      setTimeout(() => {
        this.activationInProgress.delete(key);
      }, 60000);
    }
  }
}

export { BoostService };