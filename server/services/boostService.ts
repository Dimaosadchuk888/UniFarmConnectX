import { db } from '../db';
import { users, transactions, farmingDeposits } from '@shared/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { BigNumber } from 'bignumber.js';
import { add } from 'date-fns';
import { DatabaseError, NotFoundError } from '../middleware/errorHandler';

/**
 * Модель буст-пакета
 */
export interface BoostPackage {
  id: number;
  name: string;
  priceUni: string;    // Стоимость в UNI
  priceTon: string;    // Стоимость в TON (для будущего использования)
  bonusUni: string;    // Бонус UNI, который получит пользователь
  rateUni: string;     // Доходность в UNI (% в день)
  rateTon: string;     // Доходность в TON (% в день)
}

/**
 * Результат покупки буста
 */
export interface PurchaseBoostResult {
  success: boolean;
  message: string;
  boostPackage?: BoostPackage;
  transactionId?: number;
}

/**
 * Расширенная модель депозита буста с информацией о пакете
 */
export interface BoostDepositWithPackage {
  id: number;
  user_id: number;
  amount_uni: string;
  rate_uni: string;
  rate_ton: string;
  created_at: Date;
  last_claim: Date;
  is_boosted: boolean;
  deposit_type: string;
  boost_id: number;
  expires_at: Date;
  boostPackage?: BoostPackage;
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
      bonusUni: '10000',
      rateUni: '0',    // Доходность в UNI
      rateTon: '0.5'   // Доходность в TON (0.5% в день)
    },
    {
      id: 2,
      name: 'Boost 5',
      priceUni: '500000',
      priceTon: '5',
      bonusUni: '75000',
      rateUni: '0',    // Доходность в UNI
      rateTon: '1'     // Доходность в TON (1% в день)
    },
    {
      id: 3,
      name: 'Boost 15',
      priceUni: '1500000',
      priceTon: '15',
      bonusUni: '250000',
      rateUni: '0',    // Доходность в UNI
      rateTon: '2'     // Доходность в TON (2% в день)
    },
    {
      id: 4,
      name: 'Boost 25',
      priceUni: '2500000',
      priceTon: '25',
      bonusUni: '500000',
      rateUni: '0',    // Доходность в UNI
      rateTon: '2.5'   // Доходность в TON (2.5% в день)
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
   * @throws NotFoundError если буст-пакет не найден
   */
  static getBoostPackageById(boostId: number): BoostPackage {
    const boostPackage = this.boostPackages.find(boost => boost.id === boostId);
    
    if (!boostPackage) {
      throw new NotFoundError(`Буст-пакет с ID ${boostId} не найден`);
    }
    
    return boostPackage;
  }

  /**
   * Проверяет существование пользователя и возвращает его баланс
   * @param userId ID пользователя
   * @returns Баланс пользователя в UNI
   * @throws NotFoundError если пользователь не найден
   */
  static async getUserBalance(userId: number): Promise<string> {
    try {
      const [user] = await db
        .select({
          balance_uni: users.balance_uni
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        throw new NotFoundError(`Пользователь с ID ${userId} не найден`);
      }

      return user.balance_uni?.toString() || '0';
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new DatabaseError('Ошибка при получении баланса пользователя', error);
    }
  }

  /**
   * Получает все активные Boost-депозиты пользователя
   * @param userId ID пользователя
   * @returns Список активных Boost-депозитов с информацией о буст-пакетах
   * @throws DatabaseError в случае ошибки при работе с БД
   */
  static async getUserActiveBoosts(userId: number): Promise<BoostDepositWithPackage[]> {
    try {
      // Проверяем существование пользователя
      await this.getUserBalance(userId);
      
      // Получаем все активные буст-депозиты пользователя
      // (где тип депозита начинается с 'boost_' и дата окончания в будущем)
      const boostDeposits = await db
        .select()
        .from(farmingDeposits)
        .where(
          sql`${farmingDeposits.user_id} = ${userId} AND 
              ${farmingDeposits.deposit_type} LIKE 'boost_%' AND
              (${farmingDeposits.expires_at} IS NULL OR ${farmingDeposits.expires_at} > NOW())`
        )
        .orderBy(desc(farmingDeposits.created_at));
      
      // Объединяем с информацией о буст-пакетах
      return boostDeposits.map(deposit => {
        const boostId = deposit.boost_id || 0;
        let boostPackage: BoostPackage | undefined;
        
        try {
          boostPackage = this.getBoostPackageById(boostId);
        } catch (error) {
          // Если буст-пакет не найден, просто не добавляем его информацию
        }
        
        return {
          ...deposit,
          boostPackage
        };
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new DatabaseError('Ошибка при получении активных буст-депозитов', error);
    }
  }

  /**
   * Проверяет, достаточно ли у пользователя средств для покупки буст-пакета
   * @param balanceUni Баланс пользователя в UNI
   * @param priceUni Стоимость буст-пакета в UNI
   * @returns true, если средств достаточно
   * @throws Error с сообщением о недостаточном балансе
   */
  static checkSufficientFunds(balanceUni: string, priceUni: string): boolean {
    const balance = new BigNumber(balanceUni);
    const price = new BigNumber(priceUni);
    
    if (balance.isLessThan(price)) {
      throw new Error(`Недостаточно UNI на балансе. Необходимо: ${price.toFormat()}`);
    }
    
    return true;
  }

  /**
   * Покупает буст-пакет для пользователя
   * @param userId ID пользователя
   * @param boostId ID буст-пакета
   * @returns Результат покупки
   * @throws NotFoundError если пользователь или буст-пакет не найден
   * @throws DatabaseError в случае ошибки при работе с БД
   */
  static async purchaseBoost(userId: number, boostId: number): Promise<PurchaseBoostResult> {
    try {
      // Получаем буст-пакет (выбросит NotFoundError, если пакет не существует)
      const boostPackage = this.getBoostPackageById(boostId);
      
      // Получаем баланс пользователя (выбросит NotFoundError, если пользователь не существует)
      const balanceUni = await this.getUserBalance(userId);
      
      // Проверяем, хватает ли баланса
      const priceUni = boostPackage.priceUni;
      const bonusUni = boostPackage.bonusUni;
      
      try {
        this.checkSufficientFunds(balanceUni, priceUni);
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Недостаточно средств на балансе',
          availableBalance: balanceUni  // Добавляем информацию о текущем балансе
        };
      }

      // Выполняем транзакцию
      return await db.transaction(async (tx) => {
        // 1. Списываем средства с баланса пользователя
        await tx
          .update(users)
          .set({
            balance_uni: sql`${users.balance_uni} - ${priceUni}`
          })
          .where(eq(users.id, userId));

        // 2. Начисляем бонус
        await tx
          .update(users)
          .set({
            balance_uni: sql`${users.balance_uni} + ${bonusUni}`
          })
          .where(eq(users.id, userId));

        // 3. Создаем запись о транзакции для бонуса
        const [transaction] = await tx
          .insert(transactions)
          .values({
            user_id: userId,
            type: 'boost_bonus',
            currency: 'UNI',
            amount: bonusUni,
            status: 'confirmed',
            description: `Бонус за покупку буст-пакета "${boostPackage.name}"`,
            category: 'boost',
            source: 'boost_purchase'
          })
          .returning();

        // 4. Создаем запись в farming_deposits для буста
        // Срок действия буста - 365 дней
        const expiresAt = add(new Date(), { days: 365 });
        
        // Тип депозита в формате 'boost_X', где X - ID буста
        const depositType = `boost_${boostId}`;
        
        // Создаем запись о депозите
        await tx
          .insert(farmingDeposits)
          .values({
            user_id: userId,
            amount_uni: '0', // UNI не фармится, только TON
            rate_uni: '0',
            rate_ton: boostPackage.rateTon,
            last_claim: new Date(),
            is_boosted: true,
            deposit_type: depositType,
            boost_id: boostId,
            expires_at: expiresAt
          });

        // Форматируем сумму бонуса для сообщения
        const bonusDisplay = new BigNumber(bonusUni).toFormat();

        return {
          success: true,
          message: `Буст-пакет "${boostPackage.name}" успешно куплен. Получено ${bonusDisplay} UNI`,
          boostPackage,
          transactionId: transaction.id
        };
      });
    } catch (error) {
      // Специфические ошибки пробрасываем дальше
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new DatabaseError('Ошибка при покупке буст-пакета', error);
    }
  }
}