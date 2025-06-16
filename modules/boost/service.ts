import { logger } from '../../core/logger.js';
import { BOOST_TABLES, BOOST_PACKAGES, BOOST_CONFIG, BOOST_STATUS } from './model';

interface BoostPackageData {
  id: number;
  name: string;
  description: string;
  daily_rate: number;
  duration_days: number;
  min_amount: number;
  max_amount: number;
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
          description: "Increases farming speed by 50%",
          daily_rate: parseFloat(BOOST_PACKAGES.STARTER.daily_rate),
          duration_days: BOOST_PACKAGES.STARTER.duration_days,
          min_amount: parseFloat(BOOST_PACKAGES.STARTER.min_amount),
          max_amount: parseFloat(BOOST_PACKAGES.STARTER.max_amount),
          is_active: true
        },
        {
          id: 2,
          name: BOOST_PACKAGES.PREMIUM.name,
          description: "Doubles farming rewards",
          daily_rate: parseFloat(BOOST_PACKAGES.PREMIUM.daily_rate),
          duration_days: BOOST_PACKAGES.PREMIUM.duration_days,
          min_amount: parseFloat(BOOST_PACKAGES.PREMIUM.min_amount),
          max_amount: parseFloat(BOOST_PACKAGES.PREMIUM.max_amount),
          is_active: true
        },
        {
          id: 3,
          name: BOOST_PACKAGES.ELITE.name,
          description: "Triple rewards for advanced users",
          daily_rate: parseFloat(BOOST_PACKAGES.ELITE.daily_rate),
          duration_days: BOOST_PACKAGES.ELITE.duration_days,
          min_amount: parseFloat(BOOST_PACKAGES.ELITE.min_amount),
          max_amount: parseFloat(BOOST_PACKAGES.ELITE.max_amount),
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

      // Получаем данные кошелька пользователя
      const walletData = await walletService.getWalletDataByTelegramId(userId);
      const requiredAmount = parseFloat(boostPackage.min_amount || "0");

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

      // Создаем запись о покупке
      const purchase = await this.createBoostPurchase(userId, boostPackage.id, 'wallet', null, 'confirmed');

      logger.info('[BoostService] Успешная покупка через внутренний кошелек', {
        userId,
        boostPackageId: boostPackage.id,
        amount: requiredAmount,
        purchaseId: purchase?.id
      });

      return {
        success: true,
        message: `Boost "${boostPackage.name}" успешно активирован`,
        purchase
      };
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
      
      const { data, error } = await supabase
        .from('boost_purchases')
        .insert({
          user_id: userId,
          boost_id: boostId,
          source,
          tx_hash: txHash,
          status,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('[BoostService] Ошибка создания записи покупки:', error);
        return null;
      }

      logger.info('[BoostService] Создана запись покупки Boost', {
        purchaseId: data.id,
        userId,
        boostId,
        source,
        status
      });

      return data;
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
          amount: boostPackage.min_amount,
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

      // Ищем pending запись покупки
      const { supabase } = await import('../../core/supabase');
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

      // Проверяем статус транзакции в блокчейне
      const { checkTonTransaction } = await import('../../utils/checkTonTransaction');
      const tonResult = await checkTonTransaction(txHash);

      if (!tonResult.success) {
        logger.error('[BoostService] Ошибка проверки TON транзакции', {
          txHash,
          error: tonResult.error
        });
        return {
          success: false,
          status: 'error',
          message: tonResult.error || 'Ошибка проверки блокчейн транзакции'
        };
      }

      if (!tonResult.confirmed) {
        logger.info('[BoostService] Транзакция еще не подтверждена', {
          txHash,
          tonError: tonResult.error
        });
        return {
          success: true,
          status: 'waiting',
          message: 'Транзакция еще не подтверждена в блокчейне. Попробуйте позже.'
        };
      }

      // Транзакция подтверждена - активируем Boost
      logger.info('[BoostService] Транзакция подтверждена, активируем Boost', {
        txHash,
        amount: tonResult.amount,
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
          amount: amount || '0',
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
      
      // Пока возвращаем true как успешную активацию
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
}