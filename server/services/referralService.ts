import { db } from '../db';
import { referrals, Referral, InsertReferral, users, User } from '@shared/schema';
import { eq, sql, and } from 'drizzle-orm';
import { UserService } from './userService';
import { ValidationError } from '../middleware/errorHandler';

// Максимальная глубина реферальной цепочки согласно ТЗ
const MAX_REFERRAL_PATH_DEPTH = 20;

/**
 * Типы данных для реферальной системы
 */
export interface RefTreeNode {
  id: number;
  username: string | null;
  ref_code: string | null;
  level: number;
}

export interface ReferralRewardInfo {
  level: number;
  uni: number;
  ton: number;
}

export interface ReferralData {
  user_id: number;
  username: string | null;
  ref_code: string | null;
  total_referrals: number;
  referral_counts: Record<number, number>;
  level_income: Record<number, { uni: number, ton: number }>;
  referrals: Referral[];
}

export interface ReferralRelationshipResult {
  referral: Referral | null;
  success: boolean;
  isNewConnection: boolean;
  message: string;
}

export interface StartParamProcessResult {
  inviterId: number | null;
  refCode: string | null;
}

/**
 * Сервис для работы с реферальной системой
 * Реализует бизнес-логику работы с рефералами согласно SOLID принципам
 */
export class ReferralService {
  /**
   * Строит реферальный путь для пользователя (Этап 4.1)
   * Рекурсивно проходит вверх по цепочке приглашений до 20 уровня
   * 
   * @param userId ID пользователя, для которого нужно построить ref_path
   * @returns Массив ID пригласителей [inviter_id, inviter_inviter_id, ...]
   */
  static async buildRefPath(userId: number): Promise<number[]> {
    if (!userId) {
      console.log('[ReferralService] Cannot build ref_path for null userId');
      return [];
    }
    
    try {
      // Новый подход с использованием parent_ref_code
      try {
        const { users } = await import('@shared/schema');
        const refPath: number[] = [];
        
        // Получаем пользователя и его parent_ref_code
        let [currentUser] = await db
          .select({
            id: users.id,
            parent_ref_code: users.parent_ref_code
          })
          .from(users)
          .where(eq(users.id, userId));
        
        // Если у пользователя нет parent_ref_code, возвращаем пустой массив
        if (!currentUser || !currentUser.parent_ref_code) {
          console.log(`[ReferralService] User ${userId} has no parent_ref_code`);
          return [];
        }
        
        let depth = 0;
        // Итеративно поднимаемся вверх по цепочке пригласителей
        while (currentUser && currentUser.parent_ref_code && depth < MAX_REFERRAL_PATH_DEPTH) {
          // Находим пользователя с ref_code = parent_ref_code текущего пользователя
          const [inviter] = await db
            .select({
              id: users.id,
              ref_code: users.ref_code,
              parent_ref_code: users.parent_ref_code
            })
            .from(users)
            .where(eq(users.ref_code, currentUser.parent_ref_code));
            
          if (inviter) {
            // Добавляем ID пригласителя в путь
            refPath.push(inviter.id);
            
            // Переходим к следующему пригласителю
            currentUser = inviter;
          } else {
            // Если пригласитель не найден, прерываем цикл
            break;
          }
          
          depth++;
        }
        
        console.log(`[referral] Построен ref_path с parent_ref_code: [${refPath.join(', ')}]`);
        return refPath;
      } catch (innerError) {
        console.error('[ReferralService] Error building ref_path with parent_ref_code:', innerError);
        
        // Старый метод через таблицу referrals
        console.log('[ReferralService] Falling back to legacy ref_path building');
        const refPath: number[] = [];
        let currentUserInviter = await this.getUserInviter(userId);
        
        // Если у пользователя нет пригласителя, возвращаем пустой массив
        if (!currentUserInviter) {
          console.log(`[ReferralService] No inviter found for user ${userId}`);
          return [];
        }
        
        // Итеративно поднимаемся вверх по цепочке пригласителей
        let depth = 0;
        let currentUserId = userId;
        
        while (currentUserInviter && depth < MAX_REFERRAL_PATH_DEPTH) {
          // Добавляем ID пригласителя в путь
          if (currentUserInviter.inviter_id) {
            refPath.push(currentUserInviter.inviter_id);
            
            // Переходим к пригласителю текущего пригласителя
            currentUserId = currentUserInviter.inviter_id;
            currentUserInviter = await this.getUserInviter(currentUserId);
          } else {
            // Если по какой-то причине inviter_id не определен, прерываем цикл
            break;
          }
          
          depth++;
        }
        
        console.log(`[referral] Построен ref_path через legacy метод: [${refPath.join(', ')}]`);
        return refPath;
      }
    } catch (error) {
      console.error(`[ReferralService] Error building ref_path for user ${userId}:`, error);
      return []; // В случае ошибки возвращаем пустой массив
    }
  }
  /**
   * Получает все реферальные связи пользователя
   * @param userId ID пользователя
   * @returns Массив реферальных связей (пустой массив, если рефералов нет)
   */
  static async getUserReferrals(userId: number): Promise<Referral[]> {
    try {
      if (!userId || typeof userId !== 'number' || userId <= 0) {
        console.log('[ReferralService] Invalid userId:', userId);
        return []; // Возвращаем пустой массив при некорректном userId
      }
      
      try {
        // Сначала получаем ref_code пользователя
        const { users } = await import('@shared/schema');
        const [user] = await db
          .select({ ref_code: users.ref_code })
          .from(users)
          .where(eq(users.id, userId));
          
        if (!user || !user.ref_code) {
          console.log(`[ReferralService] User ${userId} has no ref_code`);
          return [];
        }
        
        // Теперь ищем всех пользователей, у которых parent_ref_code равен ref_code пользователя
        const referralUsers = await db
          .select({
            id: users.id,
            username: users.username,
            parent_ref_code: users.parent_ref_code,
            created_at: users.created_at
          })
          .from(users)
          .where(eq(users.parent_ref_code, user.ref_code))
          .orderBy(users.created_at);

        // Преобразуем в формат, совместимый с Referral
        const result: Referral[] = referralUsers.map(refUser => ({
          id: 0, // Временный ID
          user_id: refUser.id,
          inviter_id: userId,
          level: 1, // По умолчанию уровень 1
          ref_path: [], // Пустой ref_path
          created_at: refUser.created_at || new Date(),
          reward_uni: null // Нет информации о наградах
        }));
        
        console.log(`[ReferralService] Found ${result.length} referrals for user ${userId} using parent_ref_code`);
        return result;
      } catch (innerError) {
        console.error('[ReferralService] Error in getUserReferrals with parent_ref_code:', innerError);
        
        // В случае ошибки пытаемся использовать старый метод через таблицу referrals
        console.log('[ReferralService] Falling back to legacy referrals table lookup');
        const userReferrals = await db
          .select()
          .from(referrals)
          .where(eq(referrals.inviter_id, userId))
          .orderBy(referrals.created_at);
        
        return userReferrals || [];
      }
    } catch (error) {
      console.error('[ReferralService] Error in getUserReferrals:', error);
      return []; // В случае ошибки также возвращаем пустой массив
    }
  }

  /**
   * Создает новую реферальную связь
   * @param referralData Данные реферальной связи
   * @returns Созданная реферальная связь
   */
  static async createReferral(referralData: InsertReferral): Promise<Referral> {
    const [referral] = await db
      .insert(referrals)
      .values(referralData)
      .returning();
    
    return referral;
  }

  /**
   * Проверяет, есть ли у пользователя пригласитель
   * @param userId ID пользователя
   * @returns Реферальная связь или undefined, если пригласителя нет
   */
  static async getUserInviter(userId: number): Promise<Referral | undefined> {
    try {
      // Сначала проверяем новый подход с parent_ref_code
      const { users } = await import('@shared/schema');
      
      // Получаем пользователя и его parent_ref_code
      const [user] = await db
        .select({
          id: users.id,
          parent_ref_code: users.parent_ref_code
        })
        .from(users)
        .where(eq(users.id, userId));
        
      if (user && user.parent_ref_code) {
        // Если у пользователя есть parent_ref_code, ищем пользователя с таким ref_code
        const [inviter] = await db
          .select({
            id: users.id,
            username: users.username,
            ref_code: users.ref_code
          })
          .from(users)
          .where(eq(users.ref_code, user.parent_ref_code));
          
        if (inviter) {
          console.log(`[ReferralService] Found inviter by parent_ref_code: user ${userId} invited by ${inviter.id}`);
          
          // Создаем объект, совместимый с Referral
          const referral: Referral = {
            id: 0, // Временный ID
            user_id: userId,
            inviter_id: inviter.id,
            level: 1, // По умолчанию уровень 1
            ref_path: [], // Пустой ref_path
            created_at: new Date(),
            reward_uni: null // Нет информации о наградах
          };
          
          return referral;
        }
      }
      
      // Если новый подход не дал результатов, используем старый через таблицу referrals
      console.log(`[ReferralService] No parent_ref_code found for user ${userId}, using legacy table`);
      const [referral] = await db
        .select()
        .from(referrals)
        .where(eq(referrals.user_id, userId));
      
      return referral;
    } catch (error) {
      console.error('[ReferralService] Error in getUserInviter:', error);
      
      // В случае ошибки пытаемся использовать старый метод
      try {
        const [referral] = await db
          .select()
          .from(referrals)
          .where(eq(referrals.user_id, userId));
        
        return referral;
      } catch (fallbackError) {
        console.error('[ReferralService] Error in fallback getUserInviter:', fallbackError);
        return undefined;
      }
    }
  }

  /**
   * Получает количество рефералов пользователя по уровням
   * @param userId ID пользователя
   * @returns Объект с количеством рефералов по уровням (пустой объект, если нет рефералов)
   */
  static async getReferralCounts(userId: number): Promise<Record<number, number>> {
    try {
      if (!userId || typeof userId !== 'number' || userId <= 0) {
        console.log('[ReferralService] Invalid userId in getReferralCounts:', userId);
        return {}; // Возвращаем пустой объект при некорректном userId
      }
      
      try {
        // Новый подход с использованием parent_ref_code
        const { users } = await import('@shared/schema');
        
        // Сначала получаем ref_code пользователя
        const [user] = await db
          .select({ ref_code: users.ref_code })
          .from(users)
          .where(eq(users.id, userId));
          
        if (!user || !user.ref_code) {
          console.log(`[ReferralService] User ${userId} has no ref_code, cannot count referrals`);
          return {}; // Если у пользователя нет ref_code, возвращаем пустой объект
        }
        
        // Считаем количество пользователей с parent_ref_code, равным ref_code пользователя
        const [referralsCount] = await db
          .select({
            count: sql<string>`count(*)`
          })
          .from(users)
          .where(eq(users.parent_ref_code, user.ref_code));
          
        console.log(`[ReferralService] Found ${referralsCount.count} direct referrals for user ${userId} using parent_ref_code`);
        
        // Пока что все рефералы считаются уровня 1
        const result: Record<number, number> = {
          1: Number(referralsCount.count)
        };
        
        return result;
      } catch (innerError) {
        console.error('[ReferralService] Error counting referrals with parent_ref_code:', innerError);
      
        // Если новый подход не сработал, используем старый через таблицу referrals
        console.log('[ReferralService] Falling back to legacy referrals count');
        const referralsCounts = await db
          .select({
            level: referrals.level,
            count: sql<string>`count(${referrals.id})`
          })
          .from(referrals)
          .where(eq(referrals.inviter_id, userId))
          .groupBy(referrals.level);
        
        // Преобразуем результат в объект { level: count }
        const result: Record<number, number> = {};
        for (const { level, count } of referralsCounts) {
          if (level !== null) {
            result[level] = Number(count);
          }
        }
        
        return result;
      }
    } catch (error) {
      console.error('[ReferralService] Error in getReferralCounts:', error);
      return {}; // В случае ошибки возвращаем пустой объект
    }
  }
  
  /**
   * Получает данные о доходах с каждого уровня рефералов
   * @param userId ID пользователя
   * @returns Объект с доходами по уровням (пустой объект, если данных нет)
   */
  static async getLevelIncomeData(userId: number): Promise<Record<number, { uni: number, ton: number }>> {
    try {
      // Проверка валидности userId
      if (!userId || typeof userId !== 'number' || userId <= 0) {
        console.log('[ReferralService] Invalid userId in getLevelIncomeData:', userId);
        return {}; // Возвращаем пустой объект при некорректном userId
      }
      
      // Получаем транзакции с типом referral_bonus
      const { transactions } = await import('@shared/schema');
      
      try {
        // Запрос для получения суммы доходов от рефералов по уровням
        // Проверяем наличие поля data перед использованием оператора ->
        const hasDataColumnResult = await db
          .execute(sql`SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'data'
          ) AS exists`);
        
        const hasDataColumn = hasDataColumnResult && 
                          hasDataColumnResult.length > 0 && 
                          hasDataColumnResult[0] && 
                          (hasDataColumnResult[0] as Record<string, unknown>).exists === true;
        
        if (hasDataColumn) {
          const referralTransactions = await db
            .select({
              level: sql<number>`CAST(data->>'level' AS INTEGER)`,
              uni_amount: sql<string>`SUM(CASE WHEN currency = 'UNI' THEN amount ELSE 0 END)`,
              ton_amount: sql<string>`SUM(CASE WHEN currency = 'TON' THEN amount ELSE 0 END)`
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.user_id, userId),
                eq(transactions.type, 'referral_bonus')
              )
            )
            .groupBy(sql`data->>'level'`);
          
          // Преобразуем результат в объект { level: { uni: amount, ton: amount } }
          const result: Record<number, { uni: number, ton: number }> = {};
          
          // Проверка, что результат не null и не undefined
          if (!referralTransactions) {
            console.log('[ReferralService] Пустой результат запроса транзакций');
            return {};
          }
          
          for (const row of referralTransactions) {
            if (row.level !== null) {
              // Безопасное преобразование строк в числа
              const uniAmount = parseFloat(row.uni_amount || '0');
              const tonAmount = parseFloat(row.ton_amount || '0');
              
              result[row.level] = {
                // Проверка на NaN для гарантии числовых значений
                uni: isNaN(uniAmount) ? 0 : uniAmount,
                ton: isNaN(tonAmount) ? 0 : tonAmount
              };
            }
          }
          
          return result;
        } else {
          console.log('[ReferralService] Поле data в таблице transactions отсутствует, возвращаем пустой результат');
          return {};
        }
      } catch (error: any) {
        // Расширенная обработка известных ошибок
        if (error.message) {
          // Если ошибка связана с отсутствием поля data, возвращаем пустой объект
          if (error.message.includes("column \"data\" does not exist")) {
            console.log('[ReferralService] Поле "data" не найдено в таблице transactions, возвращаем пустой результат');
            return {};
          }
          
          // Обрабатываем ошибку оператора
          if (error.message.includes("operator does not exist") || error.message.includes("->>")) {
            console.log('[ReferralService] Ошибка оператора при запросе данных о доходе:', error.message);
            return {};
          }
        }
        
        // Логируем детали ошибки для отладки
        console.error('[ReferralService] Ошибка при выполнении SQL-запроса:', {
          message: error.message,
          code: error.code,
          stack: error.stack?.slice(0, 200) // Первые 200 символов стека для краткости
        });
        
        // Всегда возвращаем пустой объект при любой ошибке
        return {};
      }
    } catch (error) {
      console.error('[ReferralService] Критическая ошибка при расчете дохода по уровням:', error);
      return {}; // Безопасный ответ при любой ошибке
    }
  }
  
  /**
   * Обрабатывает параметр startParam из Telegram WebApp
   * Проверяет, что startParam соответствует ref_code существующего пользователя
   * 
   * @param startParam Параметр из Telegram WebApp.startParam
   * @returns ID пригласителя или null, если пригласитель не найден
   */
  /**
   * Получает полные реферальные данные пользователя
   * @param userId ID пользователя
   * @returns Объект, содержащий все реферальные данные пользователя
   * @throws ValidationError если пользователь не найден
   */
  static async getUserReferralData(userId: number): Promise<ReferralData> {
    // Проверка валидности userId
    if (!userId || typeof userId !== 'number' || userId <= 0) {
      throw new ValidationError('Некорректный идентификатор пользователя', {
        userId: 'Идентификатор пользователя должен быть положительным числом'
      });
    }
    
    try {
      // Получаем пользователя
      const user = await UserService.getUserById(userId);
      if (!user) {
        throw new ValidationError('Пользователь не найден', {
          userId: `Пользователь с ID ${userId} не существует`
        });
      }
      
      // Получаем список рефералов
      let referrals = await this.getUserReferrals(userId);
      
      // Получаем статистику по уровням рефералов
      const referralCounts = await this.getReferralCounts(userId);
      
      // Получаем данные по доходам по уровням
      const levelIncome = await this.getLevelIncomeData(userId);
      
      // Формируем и возвращаем структурированные данные
      const referralData: ReferralData = {
        user_id: userId,
        username: user.username || null,
        ref_code: user.ref_code || null,
        total_referrals: referrals ? referrals.length : 0,
        referral_counts: referralCounts || {},
        level_income: levelIncome || {},
        referrals: referrals || []
      };
      
      return referralData;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error; // Пробрасываем ValidationError дальше
      }
      
      console.error('[ReferralService] Ошибка при получении реферальных данных:', error);
      throw new Error('Ошибка при получении реферальных данных');
    }
  }
  
  static async processStartParam(startParam: string | null | undefined): Promise<{ inviterId: number | null, refCode: string | null }> {
    if (!startParam) {
      console.log('[ReferralService] No startParam provided');
      return { inviterId: null, refCode: null };
    }
    
    console.log(`[ReferralService] Processing startParam: ${startParam}`);
    
    // Регулярное выражение для проверки формата ref_XXXX
    const refPattern = /^ref_([a-zA-Z0-9]+)$/;
    const match = String(startParam).match(refPattern);
    
    if (!match) {
      // Если startParam не соответствует формату ref_XXXX, проверяем просто как ref_code
      if (/^[a-zA-Z0-9]{6,12}$/.test(startParam)) {
        console.log(`[ReferralService] Processing startParam as direct ref_code: ${startParam}`);
        
        try {
          const inviterUser = await UserService.getUserByRefCode(startParam);
          
          if (inviterUser) {
            console.log(`[ReferralService] Found inviter by direct ref_code: ${startParam}, userId: ${inviterUser.id}`);
            return { inviterId: inviterUser.id, refCode: startParam };
          }
        } catch (error) {
          console.error(`[ReferralService] Error looking up user by direct ref_code:`, error);
        }
      }
      
      console.warn(`[ReferralService] Invalid startParam format: ${startParam}`);
      return { inviterId: null, refCode: null };
    }
    
    const refCode = match[1];
    console.log(`[ReferralService] Extracted refCode from startParam: ${refCode}`);
    
    try {
      // Ищем пользователя с таким ref_code
      const inviterUser = await UserService.getUserByRefCode(refCode);
      
      if (!inviterUser) {
        console.warn(`[ReferralService] No user found with ref_code: ${refCode}`);
        return { inviterId: null, refCode };
      }
      
      console.log(`[ReferralService] Found inviter by ref_code: ${refCode}, userId: ${inviterUser.id}`);
      return { inviterId: inviterUser.id, refCode };
    } catch (error) {
      console.error(`[ReferralService] Error processing refCode ${refCode}:`, error);
      return { inviterId: null, refCode };
    }
  }
  
  /**
   * Создает реферальную связь между пользователями
   * 
   * @param userId ID нового пользователя
   * @param inviterId ID пригласившего пользователя
   * @param level Уровень реферальной связи (по умолчанию 1)
   * @returns Объект с информацией о реферальной связи и статусе операции
   */
  static async createReferralRelationship(
    userId: number, 
    inviterId: number, 
    level: number = 1
  ): Promise<{
    referral: Referral | null;
    success: boolean;
    isNewConnection: boolean;
    message: string;
  }> {
    if (!userId || !inviterId) {
      console.error(`[ReferralService] Invalid userId (${userId}) or inviterId (${inviterId})`);
      return {
        referral: null,
        success: false,
        isNewConnection: false,
        message: 'Недопустимый ID пользователя или пригласителя'
      };
    }
    
    if (userId === inviterId) {
      console.error(`[ReferralService] Cannot create self-referral: userId ${userId} equals inviterId ${inviterId}`);
      return {
        referral: null,
        success: false,
        isNewConnection: false,
        message: 'Невозможно создать реферальную связь с самим собой'
      };
    }
    
    try {
      // Проверяем, существует ли уже связь для этого пользователя
      const existingReferral = await this.getUserInviter(userId);
      
      if (existingReferral) {
        // Важно! Реализация задания из ТЗ (Этап 3.1)
        // При повторной попытке привязки возвращаем существующую связь, но флаг isNewConnection = false
        console.warn(`[referral] Ref_code ignored, user ${userId} already bound to inviter ${existingReferral.inviter_id}`);
        
        const sameInviter = existingReferral.inviter_id === inviterId;
        const logMessage = sameInviter
          ? `[referral] Попытка повторной привязки к тому же пригласителю: ${inviterId}`
          : `[referral] Отмена: пользователь ${userId} уже привязан к другому пригласителю: ${existingReferral.inviter_id}`;
        
        console.log(logMessage);
        
        return {
          referral: existingReferral,
          success: true,
          isNewConnection: false,
          message: 'Пользователь уже привязан к пригласителю'
        };
      }
      
      // Создаем новую реферальную связь
      console.log(`[ReferralService] Creating referral relationship: user ${userId} invited by ${inviterId} at level ${level}`);
      
      // Строим реферальный путь для пользователя
      const refPath = [inviterId]; // Начинаем с непосредственного приглашающего
      
      // Если inviterId имеет свой ref_path, добавляем его элементы
      // Сначала строим ref_path для пригласителя
      const inviterRefPath = await this.buildRefPath(inviterId);
      if (inviterRefPath.length > 0) {
        // Объединяем пути
        refPath.push(...inviterRefPath);
      }
      
      // Ограничиваем длину пути до 20 элементов
      const limitedRefPath = refPath.slice(0, MAX_REFERRAL_PATH_DEPTH);
      
      const referralData: InsertReferral = {
        user_id: userId,
        inviter_id: inviterId,
        level,
        ref_path: limitedRefPath,
        created_at: new Date()
      };
      
      const referral = await this.createReferral(referralData);
      console.log(`[referral] Привязка успешно: user ${userId} → inviter ${inviterId}`);
      console.log(`[referral] Цепочка построена для user_id: ${userId} → [${limitedRefPath.join(', ')}]`);
      
      return {
        referral,
        success: true,
        isNewConnection: true,
        message: 'Реферальная связь успешно создана'
      };
    } catch (error) {
      console.error(`[ReferralService] Error creating referral relationship: `, error);
      return {
        referral: null,
        success: false,
        isNewConnection: false,
        message: `Ошибка при создании реферальной связи: ${error}`
      };
    }
  }
}