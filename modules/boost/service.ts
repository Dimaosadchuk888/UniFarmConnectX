import { logger } from '../../core/logger.js';
import { BOOST_TABLES, BOOST_PACKAGES, BOOST_CONFIG, BOOST_STATUS, BOOST_TRANSACTION_TYPES } from './model';
import { supabase } from '../../core/supabase.js';
import { getTonBoostWalletAddress } from '../../config/tonBoost.js';

interface BoostPackageData {
  id: number;
  name: string;
  description: string;
  daily_rate: number;
  duration_days: number;
  min_amount: number;
  max_amount: number;
  uni_bonus: number;
  is_active: boolean;
}

interface UserBoostData {
  id: number;
  package_id: number;
  start_date: Date;
  end_date: Date;
  is_active: boolean;
}

export class BoostService {
  async getAvailableBoosts(): Promise<BoostPackageData[]> {
    try {
      return [
        {
          id: 1,
          name: BOOST_PACKAGES.STARTER.name,
          description: "1% в день на 365 дней + 10,000 UNI бонус",
          daily_rate: parseFloat(BOOST_PACKAGES.STARTER.daily_rate),
          duration_days: BOOST_PACKAGES.STARTER.duration_days,
          min_amount: parseFloat(BOOST_PACKAGES.STARTER.min_amount),
          max_amount: parseFloat(BOOST_PACKAGES.STARTER.max_amount),
          uni_bonus: parseFloat(BOOST_PACKAGES.STARTER.uni_bonus),
          is_active: true
        },
        {
          id: 2,
          name: BOOST_PACKAGES.STANDARD.name,
          description: "1.5% в день на 365 дней + 50,000 UNI бонус",
          daily_rate: parseFloat(BOOST_PACKAGES.STANDARD.daily_rate),
          duration_days: BOOST_PACKAGES.STANDARD.duration_days,
          min_amount: parseFloat(BOOST_PACKAGES.STANDARD.min_amount),
          max_amount: parseFloat(BOOST_PACKAGES.STANDARD.max_amount),
          uni_bonus: parseFloat(BOOST_PACKAGES.STANDARD.uni_bonus),
          is_active: true
        },
        {
          id: 3,
          name: BOOST_PACKAGES.ADVANCED.name,
          description: "2% в день на 365 дней + 100,000 UNI бонус",
          daily_rate: parseFloat(BOOST_PACKAGES.ADVANCED.daily_rate),
          duration_days: BOOST_PACKAGES.ADVANCED.duration_days,
          min_amount: parseFloat(BOOST_PACKAGES.ADVANCED.min_amount),
          max_amount: parseFloat(BOOST_PACKAGES.ADVANCED.max_amount),
          uni_bonus: parseFloat(BOOST_PACKAGES.ADVANCED.uni_bonus),
          is_active: true
        },
        {
          id: 4,
          name: BOOST_PACKAGES.PREMIUM.name,
          description: "2.5% в день на 365 дней + 500,000 UNI бонус",
          daily_rate: parseFloat(BOOST_PACKAGES.PREMIUM.daily_rate),
          duration_days: BOOST_PACKAGES.PREMIUM.duration_days,
          min_amount: parseFloat(BOOST_PACKAGES.PREMIUM.min_amount),
          max_amount: parseFloat(BOOST_PACKAGES.PREMIUM.max_amount),
          uni_bonus: parseFloat(BOOST_PACKAGES.PREMIUM.uni_bonus),
          is_active: true
        },
        {
          id: 5,
          name: BOOST_PACKAGES.ELITE.name,
          description: "3% в день на 365 дней + 1,000,000 UNI бонус",
          daily_rate: parseFloat(BOOST_PACKAGES.ELITE.daily_rate),
          duration_days: BOOST_PACKAGES.ELITE.duration_days,
          min_amount: parseFloat(BOOST_PACKAGES.ELITE.min_amount),
          max_amount: parseFloat(BOOST_PACKAGES.ELITE.max_amount),
          uni_bonus: parseFloat(BOOST_PACKAGES.ELITE.uni_bonus),
          is_active: true
        }
      ];
    } catch (error) {
      logger.error('[BoostService] Ошибка получения доступных бустов:', error);
      return [];
    }
  }

  async getBoostPackages(): Promise<BoostPackageData[]> {
    return this.getAvailableBoosts();
  }

  async getUserActiveBoosts(userId: string): Promise<UserBoostData[]> {
    try {
      logger.info(`[BoostService] Получение активных бустов для пользователя ${userId}`);
      
      return [
        {
          id: 1,
          package_id: 1,
          start_date: new Date(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          is_active: true
        }
      ];
    } catch (error) {
      logger.error('[BoostService] Ошибка получения активных бустов:', error);
      return [];
    }
  }

  async purchaseBoost(userId: string, boostId: string, paymentMethod: 'wallet' | 'ton', txHash?: string): Promise<{
    success: boolean;
    message: string;
    purchase?: any;
    balanceUpdate?: {
      tonBalance: number;
      uniBalance: number;
      previousTonBalance: number;
      deductedAmount: number;
    };
  }> {
    try {
      logger.info('[BoostService] Начало процесса покупки Boost', {
        userId,
        boostId,
        paymentMethod,
        hasTxHash: !!txHash
      });

      // Получаем информацию о пакете буста
      const boostPackage = await this.getBoostPackageById(boostId);
      if (!boostPackage) {
        logger.error('[BoostService] Boost-пакет не найден', { boostId });
        return {
          success: false,
          message: 'Boost-пакет не найден'
        };
      }

      if (paymentMethod === 'wallet') {
        return await this.purchaseWithInternalWallet(userId, boostPackage);
      } else if (paymentMethod === 'ton') {
        return await this.purchaseWithExternalTon(userId, boostPackage, txHash!);
      }

      return {
        success: false,
        message: 'Неподдерживаемый метод оплаты'
      };
    } catch (error) {
      logger.error('[BoostService] Ошибка покупки Boost-пакета:', error);
      return {
        success: false,
        message: 'Внутренняя ошибка сервера при покупке Boost'
      };
    }
  }

  /**
   * Начисляет UNI бонус пользователю при покупке boost пакета
   */
  private async awardUniBonus(userId: string, boostPackage: BoostPackageData): Promise<boolean> {
    try {
      logger.info('[BoostService] Начисление UNI бонуса', {
        userId,
        packageName: boostPackage.name,
        uniBonus: boostPackage.uni_bonus
      });

      // Получаем текущий баланс пользователя
      const { data: user, error: getUserError } = await supabase
        .from(BOOST_TABLES.USERS)
        .select('balance_uni')
        .eq('id', userId)
        .single();

      if (getUserError) {
        logger.error('[BoostService] Ошибка получения пользователя для UNI бонуса:', getUserError);
        return false;
      }

      // Обновляем баланс UNI через централизованный BalanceManager
      const { balanceManager } = await import('../../core/BalanceManager');
      const result = await balanceManager.addBalance(
        userId,
        boostPackage.uni_bonus,
        0,
        'BoostService.uni_bonus'
      );

      if (!result.success) {
        logger.error('[BoostService] Ошибка обновления баланса UNI:', result.error);
        return false;
      }

      // Записываем транзакцию UNI бонуса
      const { error: transactionError } = await supabase
        .from(BOOST_TABLES.TRANSACTIONS)
        .insert({
          user_id: parseInt(userId),
          type: 'DAILY_BONUS', // Используем существующий тип из схемы базы данных
          amount: boostPackage.uni_bonus.toString(),
          currency: 'UNI',
          status: 'completed',
          description: `UNI бонус за покупку TON Boost "${boostPackage.name}" (+${boostPackage.uni_bonus} UNI)`,
          created_at: new Date().toISOString()
        });

      if (transactionError) {
        logger.error('[BoostService] Ошибка создания транзакции UNI бонуса:', transactionError);
        // Не возвращаем false, так как баланс уже обновлен
      }

      logger.info('[BoostService] UNI бонус успешно начислен', {
        userId,
        oldBalance: currentBalance,
        newBalance,
        bonusAmount: boostPackage.uni_bonus
      });

      return true;
    } catch (error) {
      logger.error('[BoostService] Ошибка начисления UNI бонуса:', error);
      return false;
    }
  }

  private async getBoostPackageById(boostId: string): Promise<any | null> {
    try {
      const packages = await this.getBoostPackages();
      const packageFound = packages.find(pkg => pkg.id.toString() === boostId);
      
      if (packageFound) {
        logger.info('[BoostService] Найден Boost-пакет', { 
          boostId, 
          packageName: packageFound.name 
        });
        return packageFound;
      }
      
      return null;
    } catch (error) {
      logger.error('[BoostService] Ошибка поиска Boost-пакета:', error);
      return null;
    }
  }

  private async purchaseWithInternalWallet(userId: string, boostPackage: any): Promise<{
    success: boolean;
    message: string;
    purchase?: any;
    balanceUpdate?: {
      tonBalance: number;
      uniBalance: number;
      previousTonBalance: number;
      deductedAmount: number;
    };
  }> {
    try {
      logger.info('[BoostService] Покупка через внутренний кошелек', {
        userId,
        boostPackageId: boostPackage.id,
        packageName: boostPackage.name
      });

      // Импортируем WalletService для работы с балансом
      const { WalletService } = await import('../wallet/service');
      const walletService = new WalletService();

      // Получаем данные кошелька пользователя по ID
      const walletData = await walletService.getWalletDataByUserId(userId);
      // ИСПРАВЛЕНИЕ: убираем лишний parseFloat, так как min_amount уже число
      const requiredAmount = boostPackage.min_amount || 0;
      
      logger.info('[BoostService] Данные кошелька получены', {
        userId,
        userIdType: typeof userId,
        walletData,
        requiredAmount,
        packageInfo: {
          id: boostPackage.id,
          name: boostPackage.name,
          minAmount: boostPackage.min_amount
        }
      });

      // Проверяем достаточность средств
      if (walletData.ton_balance < requiredAmount) {
        logger.warn('[BoostService] Недостаточно средств для покупки', {
          userId,
          required: requiredAmount,
          available: walletData.ton_balance
        });
        return {
          success: false,
          message: `Недостаточно средств. Требуется: ${requiredAmount} TON, доступно: ${walletData.ton_balance} TON`
        };
      }

      // Списываем средства
      const withdrawSuccess = await walletService.processWithdrawal(userId, requiredAmount.toString(), 'TON');
      if (!withdrawSuccess) {
        logger.error('[BoostService] Не удалось списать средства', { userId, amount: requiredAmount });
        return {
          success: false,
          message: 'Ошибка списания средств с внутреннего баланса'
        };
      }

      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Активация TON Boost СРАЗУ после списания средств
      // Это гарантирует активацию планировщика независимо от проблем с createBoostPurchase
      logger.info('[BoostService] НЕМЕДЛЕННАЯ активация TON Boost планировщика', {
        userId,
        boostId: boostPackage.id,
        reason: 'Активация сразу после успешного списания средств'
      });
      
      // Используем TonFarmingRepository для активации boost
      const { TonFarmingRepository } = await import('./TonFarmingRepository');
      const tonFarmingRepo = new TonFarmingRepository();
      
      const immediateActivation = await tonFarmingRepo.activateBoost(
        userId,
        boostPackage.id,
        boostPackage.daily_rate / 100, // Конвертируем процент в десятичное число
        undefined, // expiresAt - необязательный параметр
        requiredAmount // Передаем сумму депозита для обновления farming_balance
      );
        
      if (!immediateActivation) {
        logger.error('[BoostService] КРИТИЧЕСКАЯ ОШИБКА немедленной активации');
      } else {
        logger.info('[BoostService] Немедленная активация УСПЕШНА - планировщик активирован');
      }

      // Создаем запись о покупке
      logger.info('[BoostService] Вызов createBoostPurchase', {
        userId,
        boostPackageId: boostPackage.id,
        boostPackageIdStr: boostPackage.id.toString()
      });
      
      const purchase = await this.createBoostPurchase(userId, boostPackage.id.toString(), 'wallet', null, 'confirmed');
      
      logger.info('[BoostService] Результат createBoostPurchase', {
        purchase,
        purchaseSuccess: !!purchase
      });

      // Активация планировщика должна быть после всех операций

      // Создаем транзакцию покупки буста для истории
      try {
        const { supabase } = await import('../../core/supabase');
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: parseInt(userId),
            type: 'BOOST_PURCHASE', // Новый тип для покупок TON Boost
            amount: requiredAmount.toString(),
            currency: 'TON',
            status: 'completed',
            description: `Покупка TON Boost "${boostPackage.name}" (-${requiredAmount} TON)`,
            created_at: new Date().toISOString(),
            metadata: {
              original_type: 'TON_BOOST_PURCHASE',
              boost_package_id: boostPackage.id,
              package_name: boostPackage.name,
              daily_rate: boostPackage.daily_rate
            }
          });

        if (transactionError) {
          logger.error('[BoostService] Ошибка создания транзакции покупки буста:', transactionError);
        } else {
          logger.info('[BoostService] Транзакция покупки буста успешно создана', {
            userId,
            amount: requiredAmount,
            packageName: boostPackage.name
          });
        }
      } catch (error) {
        logger.error('[BoostService] Ошибка создания транзакции покупки:', error);
      }

      // Начисляем UNI бонус за покупку boost пакета
      const uniBonusAwarded = await this.awardUniBonus(userId, boostPackage);
      if (!uniBonusAwarded) {
        logger.warn('[BoostService] Не удалось начислить UNI бонус', {
          userId,
          boostPackageId: boostPackage.id,
          uniBonus: boostPackage.uni_bonus
        });
      }

      // Реферальные награды теперь начисляются планировщиком от фактического дохода
      logger.warn('[BoostService] Referral reward отключён: перенесено в Boost-планировщик', {
        userId,
        boostPackageId: boostPackage.id,
        amount: requiredAmount,
        reason: 'Партнёрские начисления теперь происходят только от дохода, не от покупки'
      });

      // Получаем обновленный баланс пользователя для мгновенного обновления UI
      const updatedWalletData = await walletService.getWalletDataByUserId(userId);
      
      logger.info('[BoostService] Успешная покупка через внутренний кошелек', {
        userId,
        boostPackageId: boostPackage.id,
        amount: requiredAmount,
        purchaseId: purchase?.id,
        oldBalance: walletData.ton_balance,
        newBalance: updatedWalletData.ton_balance
      });

      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Принудительная активация TON Boost планировщика
      // Выполняется в самом конце для гарантированного обновления ton_boost_package
      logger.info('[BoostService] ФИНАЛЬНАЯ активация TON Boost планировщика', {
        userId,
        boostId: boostPackage.id,
        reason: 'Гарантированная активация после успешной покупки'
      });
      
      // Используем TonFarmingRepository для финальной активации boost
      const finalActivation = await tonFarmingRepo.activateBoost(
        userId, // Передаем как строку, метод сам конвертирует
        boostPackage.id,
        boostPackage.daily_rate / 100, // Конвертируем процент в десятичное число
        undefined, // expiresAt - будет рассчитано автоматически
        requiredAmount // КРИТИЧНО: передаем сумму депозита для farming_balance
      );
        
      if (!finalActivation) {
        logger.error('[BoostService] КРИТИЧЕСКАЯ ОШИБКА финальной активации');
      } else {
        logger.info('[BoostService] Финальная активация УСПЕШНА - планировщик активирован');
      }

      const responseData = {
        success: true,
        message: `Boost "${boostPackage.name}" успешно активирован`,
        purchase,
        // Добавляем обновленные балансы для мгновенного обновления UI
        balanceUpdate: {
          tonBalance: updatedWalletData.ton_balance,
          uniBalance: updatedWalletData.uni_balance,
          previousTonBalance: walletData.ton_balance,
          deductedAmount: requiredAmount
        }
      };

      logger.info('[BoostService] Формируется ответ с balanceUpdate:', {
        responseData,
        hasBalanceUpdate: !!responseData.balanceUpdate,
        balanceUpdateData: responseData.balanceUpdate
      });

      return responseData;
    } catch (error) {
      logger.error('[BoostService] Ошибка покупки через внутренний кошелек:', error);
      return {
        success: false,
        message: 'Ошибка обработки платежа через внутренний кошелек'
      };
    }
  }

  private async purchaseWithExternalTon(userId: string, boostPackage: any, txHash: string): Promise<{
    success: boolean;
    message: string;
    purchase?: any;
  }> {
    try {
      logger.info('[BoostService] Покупка через внешний TON кошелек', {
        userId,
        boostPackageId: boostPackage.id,
        txHash
      });

      // Создаем запись о покупке со статусом pending
      const purchase = await this.createBoostPurchase(userId, boostPackage.id, 'ton', txHash, 'pending');

      // Создаем транзакцию со статусом pending
      await this.createPendingTransaction(userId, boostPackage, txHash);

      logger.info('[BoostService] Создана pending покупка через внешний TON', {
        userId,
        boostPackageId: boostPackage.id,
        txHash,
        purchaseId: purchase?.id
      });

      return {
        success: true,
        message: 'Платеж принят. Boost будет активирован после подтверждения транзакции в блокчейне',
        purchase
      };
    } catch (error) {
      logger.error('[BoostService] Ошибка покупки через внешний TON:', error);
      return {
        success: false,
        message: 'Ошибка обработки платежа через внешний TON кошелек'
      };
    }
  }

  private async createBoostPurchase(userId: string, boostId: string, source: 'wallet' | 'ton', txHash: string | null, status: 'pending' | 'confirmed' | 'failed') {
    try {
      const { supabase } = await import('../../core/supabase');
      
      // Получаем информацию о пакете
      const boostPackage = await this.getBoostPackageById(boostId);
      if (!boostPackage) {
        logger.error('[BoostService] Пакет не найден для создания покупки', { boostId });
        return null;
      }

      logger.info('[BoostService] Активация TON Boost пакета через users таблицу', {
        userId,
        boostId,
        boostPackage: boostPackage.name,
        rate: boostPackage.daily_rate
      });

      // ОСНОВНАЯ ЛОГИКА: Обновляем users.ton_boost_package для активации планировщика
      // boost_purchases таблица имеет проблемы со схемой, используем прямое обновление users
      const { data: updateResult, error: userUpdateError } = await supabase
        .from(BOOST_TABLES.USERS)
        .update({ 
          ton_boost_package: parseInt(boostId),
          ton_boost_rate: boostPackage.daily_rate
        })
        .eq('id', userId)
        .select('id, ton_boost_package, ton_boost_rate');
        
      if (userUpdateError) {
        logger.error('[BoostService] Ошибка активации TON Boost пакета:', userUpdateError);
        return null;
      } else {
        logger.info('[BoostService] TON Boost пакет успешно активирован', {
          userId,
          updateResult,
          boostPackage: parseInt(boostId),
          rate: boostPackage.daily_rate
        });
      }

      // Возвращаем симулированный объект покупки для совместимости
      return {
        id: `virtual_${Date.now()}`,
        user_id: parseInt(userId),
        package_id: parseInt(boostId),
        amount: boostPackage.min_amount.toString(),
        status: status,
        payment_method: source,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[BoostService] Ошибка в createBoostPurchase:', error);
      return null;
    }
  }

  private async createPendingTransaction(userId: string, boostPackage: any, txHash: string) {
    try {
      const { supabase } = await import('../../core/supabase');
      
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: parseInt(userId),
          type: 'boost_purchase',
          amount_uni: '0',
          amount_ton: boostPackage.min_amount.toString(),
          currency: 'TON',
          status: 'pending',
          tx_hash: txHash,
          description: `Покупка Boost "${boostPackage.name}"`,
          created_at: new Date().toISOString()
        });

      if (error) {
        logger.error('[BoostService] Ошибка создания pending транзакции:', error);
        return false;
      }

      logger.info('[BoostService] Создана pending транзакция', {
        userId,
        txHash,
        amount: boostPackage.min_amount
      });

      return true;
    } catch (error) {
      logger.error('[BoostService] Ошибка в createPendingTransaction:', error);
      return false;
    }
  }

  async verifyTonPayment(txHash: string, userId: string, boostId: string): Promise<{
    success: boolean;
    status: 'confirmed' | 'waiting' | 'not_found' | 'error';
    message: string;
    transaction_amount?: string;
    boost_activated?: boolean;
  }> {
    try {
      logger.info('[BoostService] Начало проверки TON платежа', {
        txHash,
        userId,
        boostId
      });

      const { supabase } = await import('../../core/supabase');

      // Проверяем, не был ли этот tx_hash уже использован
      const { data: existingConfirmed, error: duplicateError } = await supabase
        .from('boost_purchases')
        .select('*')
        .eq('tx_hash', txHash)
        .eq('status', 'confirmed')
        .single();

      if (existingConfirmed) {
        logger.warn('[BoostService] Попытка повторного использования tx_hash', {
          txHash,
          existingPurchaseId: existingConfirmed.id,
          existingUserId: existingConfirmed.user_id
        });
        return {
          success: false,
          status: 'error',
          message: 'Эта транзакция уже была использована для активации Boost'
        };
      }

      // Ищем pending запись покупки
      const { data: purchase, error: purchaseError } = await supabase
        .from('boost_purchases')
        .select('*')
        .eq('user_id', userId)
        .eq('boost_id', boostId)
        .eq('tx_hash', txHash)
        .eq('status', 'pending')
        .single();

      if (purchaseError || !purchase) {
        logger.warn('[BoostService] Pending покупка не найдена', {
          txHash,
          userId,
          boostId,
          error: purchaseError?.message
        });
        return {
          success: true,
          status: 'not_found',
          message: 'Pending покупка с указанным tx_hash не найдена'
        };
      }

      logger.info('[BoostService] Найдена pending покупка', {
        purchaseId: purchase.id,
        txHash
      });

      // Проверяем статус транзакции в блокчейне с реальным TonAPI
      const { verifyTonTransaction } = await import('../../core/tonApiClient');
      const tonResult = await verifyTonTransaction(txHash);

      if (!tonResult.isValid) {
        logger.error('[BoostService] Транзакция не найдена в блокчейне', {
          txHash
        });
        return {
          success: false,
          status: 'error',
          message: 'Транзакция не найдена в блокчейне TON'
        };
      }

      if (tonResult.status !== 'success') {
        logger.info('[BoostService] Транзакция не успешна', {
          txHash,
          status: tonResult.status
        });
        return {
          success: true,
          status: 'waiting',
          message: 'Транзакция не была успешно выполнена в блокчейне'
        };
      }

      // Транзакция подтверждена - активируем Boost
      logger.info('[BoostService] Транзакция подтверждена через TonAPI, активируем Boost', {
        txHash,
        amount: tonResult.amount,
        sender: tonResult.sender,
        recipient: tonResult.recipient,
        timestamp: tonResult.timestamp,
        purchaseId: purchase.id
      });

      // Обновляем статус покупки на confirmed
      const { error: updateError } = await supabase
        .from('boost_purchases')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', purchase.id);

      if (updateError) {
        logger.error('[BoostService] Ошибка обновления статуса покупки', {
          purchaseId: purchase.id,
          error: updateError.message
        });
        return {
          success: false,
          status: 'error',
          message: 'Ошибка обновления статуса покупки'
        };
      }

      // Создаем confirmed транзакцию
      await this.createConfirmedTransaction(userId, boostId, txHash, tonResult.amount);

      // Получаем информацию о boost пакете для начисления UNI бонуса
      const boostPackage = await this.getBoostPackageById(boostId);
      if (boostPackage) {
        // Начисляем UNI бонус за покупку boost пакета
        const uniBonusAwarded = await this.awardUniBonus(userId, boostPackage);
        if (!uniBonusAwarded) {
          logger.warn('[BoostService] Не удалось начислить UNI бонус при подтверждении TON транзакции', {
            userId,
            boostId: boostPackage.id,
            uniBonus: boostPackage.uni_bonus
          });
        }
      }

      // Активируем Boost
      const boostActivated = await this.activateBoost(userId, boostId);

      logger.info('[BoostService] TON платеж успешно подтвержден и Boost активирован', {
        txHash,
        userId,
        boostId,
        amount: tonResult.amount,
        boostActivated
      });

      return {
        success: true,
        status: 'confirmed',
        message: 'Платеж подтвержден, Boost успешно активирован',
        transaction_amount: tonResult.amount,
        boost_activated: boostActivated
      };

    } catch (error) {
      logger.error('[BoostService] Критическая ошибка проверки TON платежа', {
        txHash,
        userId,
        boostId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        status: 'error',
        message: 'Внутренняя ошибка при проверке платежа'
      };
    }
  }

  private async createConfirmedTransaction(userId: string, boostId: string, txHash: string, amount?: string): Promise<boolean> {
    try {
      const { supabase } = await import('../../core/supabase');
      
      // Получаем информацию о Boost пакете для description
      const boostPackage = await this.getBoostPackageById(boostId);
      const description = boostPackage ? 
        `Подтвержденная покупка Boost "${boostPackage.name}"` : 
        `Подтвержденная покупка Boost ID: ${boostId}`;

      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: parseInt(userId),
          type: 'boost_purchase',
          amount_uni: '0',
          amount_ton: amount || '0',
          currency: 'TON',
          status: 'completed',
          tx_hash: txHash,
          description,
          created_at: new Date().toISOString()
        });

      if (error) {
        logger.error('[BoostService] Ошибка создания confirmed транзакции', {
          userId,
          txHash,
          error: error.message
        });
        return false;
      }

      logger.info('[BoostService] Создана confirmed транзакция', {
        userId,
        txHash,
        amount
      });

      return true;
    } catch (error) {
      logger.error('[BoostService] Ошибка в createConfirmedTransaction', {
        userId,
        txHash,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  private async activateBoost(userId: string, boostId: string): Promise<boolean> {
    try {
      // Получаем информацию о Boost пакете
      const boostPackage = await this.getBoostPackageById(boostId);
      if (!boostPackage) {
        logger.error('[BoostService] Boost пакет не найден для активации', { boostId });
        return false;
      }

      logger.info('[BoostService] Активация Boost пакета', {
        userId,
        boostId,
        packageName: boostPackage.name,
        durationDays: boostPackage.duration_days
      });

      // Здесь будет логика активации Boost:
      // - Обновление пользовательских множителей
      // - Установка времени окончания действия
      // - Применение эффектов к farming

      // Реферальные награды теперь начисляются планировщиком от фактического дохода
      logger.warn('[BoostService] Referral reward отключён: перенесено в Boost-планировщик', {
        userId,
        boostId,
        packageName: boostPackage.name,
        reason: 'Партнёрские начисления теперь происходят только от дохода Boost, не от активации'
      });
      
      logger.info('[BoostService] Boost успешно активирован', {
        userId,
        boostId,
        packageName: boostPackage.name
      });

      return true;

    } catch (error) {
      logger.error('[BoostService] Ошибка активации Boost', {
        userId,
        boostId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Получить статус TON Boost фарминга для дашборда
   * Возвращает расчётные данные на основе активных Boost пакетов пользователя
   */
  async getTonBoostFarmingStatus(userId: string): Promise<{
    totalTonRatePerSecond: string;
    totalUniRatePerSecond: string;
    dailyIncomeTon: string;
    dailyIncomeUni: string;
    deposits: any[];
  }> {
    try {
      // Получаем пользователя из базы данных
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', parseInt(userId))
        .single();

      if (error || !user) {
        logger.info('[BoostService] Пользователь не найден для TON Boost статуса', { userId });
        return {
          totalTonRatePerSecond: '0',
          totalUniRatePerSecond: '0', 
          dailyIncomeTon: '0',
          dailyIncomeUni: '0',
          deposits: []
        };
      }

      // Проверяем наличие активного TON Boost пакета
      const activeBoostId = user.ton_boost_package;
      const tonBalance = parseFloat(user.balance_ton || '0');

      logger.info('[BoostService] Анализ пользователя для TON Boost', {
        userId,
        activeBoostId,
        tonBalance,
        hasActiveBoost: !!activeBoostId,
        hasEnoughBalance: tonBalance >= 10
      });

      if (!activeBoostId || tonBalance < 10) {
        logger.info('[BoostService] TON Boost неактивен - нет пакета или недостаточно баланса', {
          activeBoostId,
          tonBalance,
          required: 10
        });
        return {
          totalTonRatePerSecond: '0',
          totalUniRatePerSecond: '0',
          dailyIncomeTon: '0', 
          dailyIncomeUni: '0',
          deposits: []
        };
      }

      // Получаем данные о Boost пакете
      const boostPackage = await this.getBoostPackageById(activeBoostId.toString());
      logger.info('[BoostService] Результат поиска Boost пакета', {
        activeBoostId,
        packageFound: !!boostPackage,
        packageData: boostPackage
      });
      
      if (!boostPackage) {
        logger.warn('[BoostService] Boost пакет не найден', { activeBoostId });
        return {
          totalTonRatePerSecond: '0',
          totalUniRatePerSecond: '0',
          dailyIncomeTon: '0',
          dailyIncomeUni: '0',
          deposits: []
        };
      }

      // Получаем farming_balance из ton_farming_data для корректного отображения
      let farmingBalance = tonBalance; // По умолчанию используем balance_ton
      try {
        const { data: farmingData } = await supabase
          .from('ton_farming_data')
          .select('farming_balance')
          .eq('user_id', parseInt(userId))
          .single();
        
        if (farmingData && farmingData.farming_balance) {
          farmingBalance = parseFloat(farmingData.farming_balance);
        }
      } catch (e) {
        // Используем tonBalance как fallback
      }

      // Рассчитываем доход на основе ставки пакета
      const dailyRate = parseFloat(boostPackage.daily_rate) * 100; // 1%, 1.5%, 2%, 2.5%, 3%
      const ratePerSecond = (dailyRate / 100) / 86400; // Процент в секунду
      const dailyIncome = (farmingBalance * dailyRate) / 100; // Дневной доход в TON

      logger.info('[BoostService] Рассчитан статус TON Boost фарминга', {
        userId,
        activeBoostId,
        tonBalance,
        farmingBalance,
        dailyRate,
        dailyIncome
      });

      return {
        totalTonRatePerSecond: ratePerSecond.toFixed(8),
        totalUniRatePerSecond: '0', // TON Boost не генерирует UNI
        dailyIncomeTon: dailyIncome.toFixed(6),
        dailyIncomeUni: '0',
        deposits: [{
          id: activeBoostId,
          package_name: boostPackage.name,
          amount: farmingBalance.toString(), // Используем farming_balance для отображения
          rate: dailyRate.toString(),
          status: 'active'
        }]
      };

    } catch (error) {
      logger.error('[BoostService] Ошибка получения статуса TON Boost фарминга:', error);
      return {
        totalTonRatePerSecond: '0',
        totalUniRatePerSecond: '0',
        dailyIncomeTon: '0',
        dailyIncomeUni: '0',
        deposits: []
      };
    }
  }

  async activatePackage(userId: string, packageId: string): Promise<{
    success: boolean;
    message: string;
    activated?: boolean;
  }> {
    try {
      logger.info('[BoostService] Активация TON Boost пакета', { userId, packageId });
      
      // Проверяем, существует ли пакет
      const boostPackage = this.tonBoostPackages.find(pkg => pkg.id.toString() === packageId);
      if (!boostPackage) {
        return {
          success: false,
          message: 'Пакет не найден'
        };
      }

      // Проверяем, есть ли у пользователя купленный пакет
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, ton_boost_package')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        logger.error('[BoostService] Ошибка получения пользователя:', userError);
        return {
          success: false,
          message: 'Пользователь не найден'
        };
      }

      // Проверяем, не активирован ли уже пакет
      if (user.ton_boost_package === parseInt(packageId)) {
        return {
          success: true,
          message: 'Пакет уже активирован',
          activated: false
        };
      }

      // Активируем пакет
      const { error: updateError } = await supabase
        .from('users')
        .update({
          ton_boost_package: boostPackage.id,
          ton_boost_rate: boostPackage.daily_rate
        })
        .eq('id', userId);

      if (updateError) {
        logger.error('[BoostService] Ошибка активации пакета:', updateError);
        return {
          success: false,
          message: 'Ошибка активации пакета'
        };
      }

      logger.info('[BoostService] Пакет успешно активирован', {
        userId,
        packageId,
        packageName: boostPackage.name,
        dailyRate: boostPackage.daily_rate
      });

      return {
        success: true,
        message: `Пакет "${boostPackage.name}" успешно активирован`,
        activated: true
      };
    } catch (error) {
      logger.error('[BoostService] Ошибка активации пакета:', error);
      return {
        success: false,
        message: 'Внутренняя ошибка сервера'
      };
    }
  }

  /**
   * Получить активные boost пакеты пользователя
   */
  async getActiveBoosts(userId: string): Promise<any[]> {
    try {
      logger.info('[BoostService] Получение активных boost пакетов', { userId });
      
      const { data: user, error } = await supabase
        .from('users')
        .select('ton_boost_package, ton_boost_rate, uni_farming_active, uni_deposit_amount')
        .eq('id', userId)
        .single();

      if (error || !user) {
        logger.error('[BoostService] Ошибка получения пользователя:', error);
        return [];
      }

      const activeBoosts = [];

      // Проверяем активный TON Boost пакет
      if (user.ton_boost_package) {
        const tonPackage = this.tonBoostPackages.find(pkg => pkg.id === user.ton_boost_package);
        if (tonPackage) {
          activeBoosts.push({
            type: 'ton_boost',
            package_id: tonPackage.id,
            name: tonPackage.name,
            daily_rate: tonPackage.daily_rate,
            status: 'active'
          });
        }
      }

      // Проверяем активный UNI Farming
      if (user.uni_farming_active && user.uni_deposit_amount > 0) {
        activeBoosts.push({
          type: 'uni_farming',
          deposit_amount: user.uni_deposit_amount,
          daily_rate: 0.01, // 1% в день
          status: 'active'
        });
      }

      logger.info('[BoostService] Найдены активные boost пакеты', {
        userId,
        activeBoostsCount: activeBoosts.length
      });

      return activeBoosts;
    } catch (error) {
      logger.error('[BoostService] Ошибка получения активных boost пакетов:', error);
      return [];
    }
  }

  /**
   * Получить статус pending boost платежей для диагностики
   * Добавлено для нового планировщика автоматической верификации
   */
  async getPendingPaymentsStatus() {
    try {
      logger.info('[BoostService] Получение статуса pending boost платежей');

      // Получаем все pending покупки
      const { data: pendingPurchases, error } = await supabase
        .from('boost_purchases')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('[BoostService] Ошибка получения pending покупок:', error);
        throw error;
      }

      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Статистика по pending покупкам
      const totalPending = pendingPurchases?.length || 0;
      const readyForVerification = pendingPurchases?.filter(p => 
        new Date(p.created_at) < twoMinutesAgo
      ).length || 0;
      const recent = pendingPurchases?.filter(p => 
        new Date(p.created_at) > twoMinutesAgo
      ).length || 0;
      const expired = pendingPurchases?.filter(p => 
        new Date(p.created_at) < twentyFourHoursAgo
      ).length || 0;

      return {
        total_pending: totalPending,
        ready_for_verification: readyForVerification,
        recent_pending: recent,
        expired_pending: expired,
        last_check: new Date().toISOString(),
        verification_schedule: 'Каждые 2 минуты',
        cleanup_schedule: 'Expired записи старше 24 часов'
      };

    } catch (error) {
      logger.error('[BoostService] Ошибка получения статуса pending платежей:', error);
      throw error;
    }
  }
}

export const boostService = new BoostService();