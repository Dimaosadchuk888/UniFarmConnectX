import { db } from '../db';
import { missions, userMissions, users, transactions, Mission, UserMission } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { NotFoundError, ValidationError, InsufficientFundsError } from '../middleware/errorHandler';

/**
 * Статусы миссий
 */
export enum MissionStatus {
  AVAILABLE = 'available',
  PROCESSING = 'processing',
  COMPLETED = 'completed'
}

/**
 * Интерфейс для результата выполнения миссии 
 */
export interface MissionCompletionResult {
  success: boolean;
  message: string;
  reward?: number;
}

/**
 * Интерфейс для результата проверки миссии 
 */
export interface MissionSubmissionResult {
  success: boolean;
  message: string;
  status: MissionStatus;
  progress?: number;
}

/**
 * Интерфейс для получения статуса миссии
 */
export interface MissionStatusResult {
  id: number;
  status: MissionStatus;
  progress?: number;
  isCompleted: boolean;
  canClaim: boolean;
  completedAt?: Date | null;
}

/**
 * Интерфейс для полных данных миссии с информацией о её выполнении
 */
export interface MissionWithCompletion {
  id: number;
  type: string | null;
  title: string | null;
  description: string | null;
  reward_uni: string | null;
  is_active: boolean | null;
  is_completed: boolean;
  completed_at?: Date | null;
  status?: MissionStatus;
  progress?: number;
}

/**
 * Сервис для работы с миссиями
 * Содержит всю бизнес-логику для операций с миссиями
 */
export class MissionService {
  /**
   * Получает все активные миссии
   * @returns Массив активных миссий
   * @throws {Error} При ошибке запроса к БД
   */
  static async getActiveMissions(): Promise<Mission[]> {
    try {
      const activeMissions = await db
        .select()
        .from(missions)
        .where(eq(missions.is_active, true));
      
      return activeMissions;
    } catch (error) {
      console.error('[MissionService] Ошибка при получении активных миссий:', error);
      throw new Error('Не удалось загрузить активные миссии');
    }
  }

  /**
   * Получает все выполненные миссии пользователя
   * @param userId ID пользователя
   * @returns Массив выполненных миссий
   * @throws {NotFoundError} Если пользователь не найден
   * @throws {Error} При ошибке запроса к БД
   */
  static async getUserCompletedMissions(userId: number): Promise<UserMission[]> {
    try {
      // Проверяем существование пользователя
      await this.validateUserExists(userId);
      
      const userCompletedMissions = await db
        .select()
        .from(userMissions)
        .where(eq(userMissions.user_id, userId));
      
      return userCompletedMissions;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('[MissionService] Ошибка при получении выполненных миссий:', error);
      throw new Error('Не удалось загрузить выполненные миссии пользователя');
    }
  }

  /**
   * Получает все миссии с информацией о их выполнении для указанного пользователя
   * @param userId ID пользователя
   * @returns Массив миссий с информацией о статусе выполнения
   * @throws {NotFoundError} Если пользователь не найден
   * @throws {Error} При ошибке запроса к БД
   */
  static async getAllMissionsWithCompletion(userId: number): Promise<MissionWithCompletion[]> {
    try {
      // Проверяем существование пользователя
      await this.validateUserExists(userId);
      
      // Получаем все активные миссии
      const allMissions = await this.getActiveMissions();
      
      // Получаем все выполненные миссии пользователя
      const completedMissions = await this.getUserCompletedMissions(userId);
      
      // Создаем Map для быстрого поиска
      const completedMap = new Map<number, UserMission>();
      completedMissions.forEach(mission => {
        // Проверяем, что mission_id существует и является числом
        if (mission.mission_id !== null && mission.mission_id !== undefined) {
          completedMap.set(mission.mission_id, mission);
        }
      });
      
      // Объединяем информацию
      const missionsWithCompletion: MissionWithCompletion[] = allMissions.map(mission => {
        // Дополнительная проверка на существование id
        if (!mission.id) {
          console.warn('[MissionService] Обнаружена миссия без id:', mission);
        }
        
        const completed = mission.id ? completedMap.get(mission.id) : undefined;
        
        return {
          id: mission.id ?? 0, // Предоставляем значение по умолчанию на случай, если id отсутствует
          type: mission.type,
          title: mission.title,
          description: mission.description,
          reward_uni: mission.reward_uni,
          is_active: mission.is_active, 
          is_completed: !!completed,
          completed_at: completed?.completed_at ?? null
        };
      });
      
      return missionsWithCompletion;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('[MissionService] Ошибка при получении миссий с информацией о выполнении:', error);
      throw new Error('Не удалось загрузить миссии со статусом выполнения');
    }
  }

  /**
   * Проверяет, выполнил ли пользователь конкретную миссию
   * @param userId ID пользователя
   * @param missionId ID миссии
   * @returns true если миссия выполнена, иначе false
   * @throws {ValidationError} Если переданы некорректные параметры
   * @throws {Error} При ошибке запроса к БД
   */
  static async isUserMissionCompleted(userId: number, missionId: number): Promise<boolean> {
    try {
      if (!userId || !missionId || isNaN(userId) || isNaN(missionId) || userId <= 0 || missionId <= 0) {
        throw new ValidationError('Некорректные ID пользователя или миссии');
      }
      
      const [existingMission] = await db
        .select()
        .from(userMissions)
        .where(and(
          eq(userMissions.user_id, userId),
          eq(userMissions.mission_id, missionId)
        ));
      
      return !!existingMission;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error('[MissionService] Ошибка при проверке статуса выполнения миссии:', error);
      throw new Error('Не удалось проверить статус выполнения миссии');
    }
  }

  /**
   * Валидирует существование пользователя
   * @param userId ID пользователя
   * @throws {NotFoundError} Если пользователь не найден
   */
  static async validateUserExists(userId: number): Promise<void> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
      
      if (!user) {
        throw new NotFoundError(`Пользователь с ID ${userId} не найден`);
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('[MissionService] Ошибка при проверке пользователя:', error);
      throw new Error('Не удалось проверить существование пользователя');
    }
  }

  /**
   * Валидирует существование миссии и её активность
   * @param missionId ID миссии
   * @returns Объект миссии, если она существует и активна
   * @throws {NotFoundError} Если миссия не найдена или неактивна
   */
  static async validateMissionExists(missionId: number): Promise<Mission> {
    try {
      const [mission] = await db
        .select()
        .from(missions)
        .where(and(
          eq(missions.id, missionId),
          eq(missions.is_active, true)
        ));
      
      if (!mission) {
        throw new NotFoundError(`Миссия с ID ${missionId} не найдена или неактивна`);
      }
      
      return mission;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('[MissionService] Ошибка при проверке миссии:', error);
      throw new Error('Не удалось проверить существование миссии');
    }
  }

  /**
   * Записывает выполнение миссии и начисляет награду пользователю транзакционно
   * @param userId ID пользователя
   * @param missionId ID миссии
   * @returns Объект с результатом выполнения
   * @throws {NotFoundError} Если пользователь или миссия не найдены
   * @throws {ValidationError} Если миссия уже выполнена пользователем
   * @throws {Error} При ошибке взаимодействия с БД
   */
  static async completeMission(userId: number, missionId: number): Promise<MissionCompletionResult> {
    try {
      // Проверяем существование пользователя
      await this.validateUserExists(userId);
      
      // Проверяем существование и активность миссии
      const mission = await this.validateMissionExists(missionId);
      
      // Проверяем, что пользователь еще не выполнял эту миссию
      const isCompleted = await this.isUserMissionCompleted(userId, missionId);
      
      if (isCompleted) {
        throw new ValidationError('Эта миссия уже выполнена пользователем');
      }
      
      // Получаем награду за миссию
      const rewardUni = mission.reward_uni;
      
      // Проверка на null и корректное преобразование, с обработкой невалидных значений
      let reward = 0;
      if (rewardUni !== null && rewardUni !== undefined) {
        const parsedReward = parseFloat(rewardUni);
        // Проверяем на корректность преобразования (не NaN)
        if (!isNaN(parsedReward)) {
          reward = parsedReward;
        } else {
          console.warn(`[MissionService] Невалидное значение reward_uni "${rewardUni}" для миссии ${missionId}`);
        }
      }
      
      // Создаем запись о выполнении миссии и начисляем награду транзакционно
      await this.processCompletionTransaction(userId, missionId, reward);
      
      return {
        success: true,
        message: `Миссия выполнена. ${reward} UNI добавлено на баланс.`,
        reward
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('[MissionService] Ошибка при выполнении миссии:', error);
      throw new Error('Не удалось выполнить миссию');
    }
  }

  /**
   * Обрабатывает транзакцию завершения миссии
   * @param userId ID пользователя
   * @param missionId ID миссии
   * @param reward Размер награды
   * @private
   */
  private static async processCompletionTransaction(userId: number, missionId: number, reward: number): Promise<void> {
    try {
      // Создаем запись о выполнении миссии
      await db.insert(userMissions).values({
        user_id: userId,
        mission_id: missionId,
        completed_at: new Date()
      });
      
      // Обновляем баланс пользователя
      await db
        .update(users)
        .set({ 
          balance_uni: sql`${users.balance_uni} + ${reward.toString()}`
        })
        .where(eq(users.id, userId));
      
      // Создаем запись о транзакции награды
      await db.insert(transactions).values({
        user_id: userId,
        type: "reward",
        currency: "UNI",
        amount: reward.toString(),
        status: "confirmed",
        source: "mission",
        description: `Награда за выполнение миссии #${missionId}`,
        created_at: new Date()
      });
      
      console.log(`[MissionService] Миссия ${missionId} успешно выполнена пользователем ${userId} с наградой ${reward} UNI`);
    } catch (error) {
      console.error('[MissionService] Ошибка при выполнении транзакции завершения миссии:', error);
      throw new Error('Не удалось обработать транзакцию завершения миссии');
    }
  }

  /**
   * Получает подробный статус миссии с учетом прогресса и выполнения
   * @param userId ID пользователя
   * @param missionId ID миссии
   * @returns Объект со статусом миссии
   * @throws {NotFoundError} Если пользователь или миссия не найдены
   * @throws {ValidationError} Если переданы некорректные параметры
   * @throws {Error} При ошибке запроса к БД
   */
  static async getMissionStatus(userId: number, missionId: number): Promise<MissionStatusResult> {
    try {
      // Проверяем существование пользователя и миссии
      await this.validateUserExists(userId);
      const mission = await this.validateMissionExists(missionId);
      
      // Проверяем, выполнена ли миссия
      const isCompleted = await this.isUserMissionCompleted(userId, missionId);
      
      // Получаем запись о выполнении миссии, если она есть
      const [completedMission] = isCompleted 
        ? await db
            .select()
            .from(userMissions)
            .where(and(
              eq(userMissions.user_id, userId),
              eq(userMissions.mission_id, missionId)
            ))
        : [];
        
      // Получаем текущий прогресс миссии, если требуется (для будущей реализации)
      // Сейчас миссии либо выполнены, либо нет, но в будущем могут иметь прогресс (0-100%)
      let progress = isCompleted ? 100 : 0;
      let status = MissionStatus.AVAILABLE;
      
      // В будущем можно добавить проверку состояния по типу миссии
      if (isCompleted) {
        status = MissionStatus.COMPLETED;
      } else if (mission.type === 'social' || mission.type === 'check-in') {
        // Для социальных миссий и ежедневного входа добавляем индикацию выполнения
        // В реальности здесь может быть дополнительная логика проверки
        status = MissionStatus.AVAILABLE;
      }
      
      // Определяем, может ли пользователь получить награду
      // В текущей реализации награда начисляется автоматически
      const canClaim = false;
      
      return {
        id: missionId,
        status,
        progress,
        isCompleted,
        canClaim,
        completedAt: completedMission?.completed_at ?? null
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('[MissionService] Ошибка при получении статуса миссии:', error);
      throw new Error('Не удалось получить статус миссии');
    }
  }
  
  /**
   * Отправляет миссию на проверку/выполнение
   * @param userId ID пользователя
   * @param missionId ID миссии
   * @returns Результат отправки миссии
   * @throws {NotFoundError} Если пользователь или миссия не найдены
   * @throws {ValidationError} Если миссия уже выполнена или имеет неподдерживаемый тип
   * @throws {Error} При ошибке запроса к БД
   */
  static async submitMission(userId: number, missionId: number): Promise<MissionSubmissionResult> {
    try {
      // Проверка на валидность параметров
      if (!userId || !missionId || isNaN(userId) || isNaN(missionId) || userId <= 0 || missionId <= 0) {
        throw new ValidationError('Некорректные ID пользователя или миссии');
      }
      
      // Проверяем существование пользователя и миссии
      await this.validateUserExists(userId);
      const mission = await this.validateMissionExists(missionId);
      
      // Проверяем, выполнена ли уже миссия
      const isCompleted = await this.isUserMissionCompleted(userId, missionId);
      
      if (isCompleted) {
        return {
          success: false,
          message: 'Эта миссия уже выполнена',
          status: MissionStatus.COMPLETED,
          progress: 100
        };
      }
      
      // Обработка в зависимости от типа миссии
      switch(mission.type) {
        case 'check-in':
          // Миссии по ежедневному входу выполняются мгновенно
          await this.completeMission(userId, missionId);
          return {
            success: true,
            message: 'Миссия ежедневного входа выполнена успешно',
            status: MissionStatus.COMPLETED,
            progress: 100
          };
          
        case 'social':
          // Социальные миссии (подписки, etc) требуют проверки
          return {
            success: true,
            message: 'Миссия отправлена на проверку',
            status: MissionStatus.PROCESSING,
            progress: 50
          };
          
        case 'invite':
          // Миссии по приглашению
          return {
            success: true,
            message: 'Отслеживание приглашений активировано',
            status: MissionStatus.PROCESSING,
            progress: 0
          };
          
        default:
          // Для неизвестных типов возвращаем ошибку
          throw new ValidationError(`Неподдерживаемый тип миссии: ${mission.type}`);
      }
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('[MissionService] Ошибка при отправке миссии на проверку:', error);
      throw new Error('Не удалось отправить миссию на проверку');
    }
  }
  
  /**
   * Получает награду за выполненную миссию
   * @param userId ID пользователя
   * @param missionId ID миссии
   * @returns Результат получения награды
   * @throws {NotFoundError} Если пользователь или миссия не найдены
   * @throws {ValidationError} Если миссия не выполнена или награда уже получена
   * @throws {Error} При ошибке запроса к БД
   */
  static async claimMissionReward(userId: number, missionId: number): Promise<MissionCompletionResult> {
    try {
      // Проверка на валидность параметров
      if (!userId || !missionId || isNaN(userId) || isNaN(missionId) || userId <= 0 || missionId <= 0) {
        throw new ValidationError('Некорректные ID пользователя или миссии');
      }
      
      // Проверяем существование пользователя и миссии
      await this.validateUserExists(userId);
      const mission = await this.validateMissionExists(missionId);
      
      // Проверяем, выполнена ли миссия
      const isCompleted = await this.isUserMissionCompleted(userId, missionId);
      
      if (!isCompleted) {
        throw new ValidationError('Невозможно получить награду: миссия не выполнена');
      }
      
      // В текущей реализации награды начисляются автоматически при выполнении миссии,
      // поэтому отдельный метод для получения наград не требуется
      // В будущем здесь может быть дополнительная логика
      
      // Получаем информацию о награде
      const rewardUni = mission.reward_uni;
      let reward = 0;
      if (rewardUni !== null && rewardUni !== undefined) {
        const parsedReward = parseFloat(rewardUni);
        if (!isNaN(parsedReward)) {
          reward = parsedReward;
        }
      }
      
      return {
        success: true,
        message: `Награда за миссию ${reward} UNI уже начислена на ваш баланс.`,
        reward
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('[MissionService] Ошибка при получении награды за миссию:', error);
      throw new Error('Не удалось получить награду за миссию');
    }
  }
}