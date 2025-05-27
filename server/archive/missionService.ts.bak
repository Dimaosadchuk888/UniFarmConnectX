/**
 * ВНИМАНИЕ: Используйте импорт из services/index.ts вместо прямого импорта
 * 
 * Этот файл является прокси-оберткой для обратной совместимости.
 * Для новых разработок используйте инстанс missionService из services/index.ts
 */

import { Mission, UserMission } from '@shared/schema';
import { missionServiceInstance } from './missionServiceInstance.js';

// Повторно определяем типы для LSP и для локального использования
export enum MissionStatus {
  AVAILABLE = 'available',
  PROCESSING = 'processing',
  COMPLETED = 'completed'
}

export interface MissionCompletionResult {
  success: boolean;
  message: string;
  reward?: number;
}

export interface MissionSubmissionResult {
  success: boolean;
  message: string;
  status: MissionStatus;
  progress?: number;
}

export interface MissionStatusResult {
  id: number;
  status: MissionStatus;
  progress?: number;
  isCompleted: boolean;
  canClaim: boolean;
  completedAt?: Date | null;
}

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

// Реэкспортируем все из missionServiceInstance
export * from './missionServiceInstance.js';

/**
 * @deprecated Используйте инстанс missionService из services/index.ts
 */
export class MissionService {
  /**
   * Получает все активные миссии
   * @returns Массив активных миссий
   * @throws {Error} При ошибке запроса к БД
   */
  static async getActiveMissions(): Promise<Mission[]> {
    return missionServiceInstance.getActiveMissions();
  }

  /**
   * Получает все выполненные миссии пользователя
   * @param userId ID пользователя
   * @returns Массив выполненных миссий
   * @throws {NotFoundError} Если пользователь не найден
   * @throws {Error} При ошибке запроса к БД
   */
  static async getUserCompletedMissions(userId: number): Promise<UserMission[]> {
    return missionServiceInstance.getUserCompletedMissions(userId);
  }

  /**
   * Получает все миссии с информацией о их выполнении для указанного пользователя
   * @param userId ID пользователя
   * @returns Массив миссий с информацией о статусе выполнения
   * @throws {NotFoundError} Если пользователь не найден
   * @throws {Error} При ошибке запроса к БД
   */
  static async getAllMissionsWithCompletion(userId: number): Promise<MissionWithCompletion[]> {
    return missionServiceInstance.getAllMissionsWithCompletion(userId);
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
    return missionServiceInstance.isUserMissionCompleted(userId, missionId);
  }

  /**
   * Валидирует существование пользователя
   * @param userId ID пользователя
   * @throws {NotFoundError} Если пользователь не найден
   */
  static async validateUserExists(userId: number): Promise<void> {
    return missionServiceInstance.validateUserExists(userId);
  }

  /**
   * Валидирует существование миссии и её активность
   * @param missionId ID миссии
   * @returns Объект миссии, если она существует и активна
   * @throws {NotFoundError} Если миссия не найдена или неактивна
   */
  static async validateMissionExists(missionId: number): Promise<Mission> {
    return missionServiceInstance.validateMissionExists(missionId);
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
    return missionServiceInstance.completeMission(userId, missionId);
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
    return missionServiceInstance.getMissionStatus(userId, missionId);
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
    return missionServiceInstance.submitMission(userId, missionId);
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
    return missionServiceInstance.claimMissionReward(userId, missionId);
  }
}