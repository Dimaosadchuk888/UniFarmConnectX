import { db } from '../db';
import { users, transactions, farmingDeposits } from '@shared/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { BigNumber } from 'bignumber.js';
import { add } from 'date-fns';

/**
 * Модель буст-пакета
 */
interface BoostPackage {
  id: number;
  name: string;
  priceUni: string;  // Стоимость в UNI
  priceTon: string;  // Стоимость в TON (для будущего использования)
  bonusUni: string;  // Бонус UNI, который получит пользователь
}

/**
 * Результат покупки буста
 */
interface PurchaseBoostResult {
  success: boolean;
  message: string;
  boostPackage?: BoostPackage;
  transactionId?: number;
}

/**
 * Сервис для работы с буст-пакетами
 */
export class BoostService {
  // Список доступных буст-пакетов
  private static readonly boostPackages: BoostPackage[] = [
    {
      id: 1,
      name: 'Boost 1',
      priceUni: '100000',
      priceTon: '1',
      bonusUni: '10000'
    },
    {
      id: 2,
      name: 'Boost 5',
      priceUni: '500000',
      priceTon: '5',
      bonusUni: '75000'
    },
    {
      id: 3,
      name: 'Boost 15',
      priceUni: '1500000',
      priceTon: '15',
      bonusUni: '250000'
    },
    {
      id: 4,
      name: 'Boost 25',
      priceUni: '2500000',
      priceTon: '25',
      bonusUni: '500000'
    }
  ];

  /**
   * Получает список всех доступных буст-пакетов
   * @returns Список буст-пакетов
   */
  static getBoostPackages(): BoostPackage[] {
    return this.boostPackages;
  }

  /**
   * Получает буст-пакет по ID
   * @param boostId ID буст-пакета
   * @returns Буст-пакет или undefined, если не найден
   */
  static getBoostPackageById(boostId: number): BoostPackage | undefined {
    return this.boostPackages.find(boost => boost.id === boostId);
  }

  /**
   * Покупает буст-пакет для пользователя
   * @param userId ID пользователя
   * @param boostId ID буст-пакета
   * @returns Результат покупки
   */
  static async purchaseBoost(userId: number, boostId: number): Promise<PurchaseBoostResult> {
    try {
      // Получаем буст-пакет
      const boostPackage = this.getBoostPackageById(boostId);
      if (!boostPackage) {
        return {
          success: false,
          message: 'Буст-пакет не найден'
        };
      }

      // Получаем пользователя
      const [user] = await db
        .select({
          balance_uni: users.balance_uni
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return {
          success: false,
          message: 'Пользователь не найден'
        };
      }

      // Проверяем, хватает ли баланса
      const balanceUni = new BigNumber(user.balance_uni?.toString() || '0');
      const priceUni = new BigNumber(boostPackage.priceUni);
      const bonusUni = new BigNumber(boostPackage.bonusUni);

      if (balanceUni.isLessThan(priceUni)) {
        return {
          success: false,
          message: `Недостаточно UNI на балансе. Необходимо: ${priceUni.toFormat()}`
        };
      }

      // Выполняем транзакцию
      return await db.transaction(async (tx) => {
        // 1. Списываем средства с баланса пользователя
        await tx
          .update(users)
          .set({
            balance_uni: sql`${users.balance_uni} - ${priceUni.toString()}`
          })
          .where(eq(users.id, userId));

        // 2. Начисляем бонус
        await tx
          .update(users)
          .set({
            balance_uni: sql`${users.balance_uni} + ${bonusUni.toString()}`
          })
          .where(eq(users.id, userId));

        // 3. Создаем запись о транзакции
        const [transaction] = await tx
          .insert(transactions)
          .values({
            user_id: userId,
            type: 'boost',
            currency: 'UNI',
            amount: bonusUni.toString(),
            status: 'confirmed'
          })
          .returning();

        return {
          success: true,
          message: `Буст-пакет "${boostPackage.name}" успешно куплен. Получено ${bonusUni.toFormat()} UNI`,
          boostPackage,
          transactionId: transaction.id
        };
      });
    } catch (error) {
      console.error('Error purchasing boost:', error);
      return {
        success: false,
        message: 'Произошла ошибка при покупке буст-пакета'
      };
    }
  }
}