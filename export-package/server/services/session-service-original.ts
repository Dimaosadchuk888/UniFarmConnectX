/**
 * Оригинальный сервис для работы с сессиями
 * 
 * Этот файл содержит все методы для работы с сессиями,
 * которые будут реэкспортироваться через прокси-файлы
 */

import { IExtendedStorage } from '../storage-interface';
import { randomUUID } from 'crypto';

/**
 * Интерфейс сервиса сессий
 */
export interface ISessionService {
  generateGuestId(): string;
}

/**
 * Фабрика для создания сервиса сессий
 */
export function createSessionService(storage: IExtendedStorage): ISessionService {
  return {
    /**
     * Генерирует идентификатор гостя
     */
    generateGuestId(): string {
      return randomUUID();
    }
  };
}

/**
 * Тип сервиса сессий
 * Используется для аннотации импортов из этого модуля
 */
export type SessionService = ReturnType<typeof createSessionService>;

/**
 * Статический API для обратной совместимости с существующим кодом
 */
export const SessionService = {
  /**
   * Генерирует идентификатор гостя
   */
  generateGuestId(): string {
    return randomUUID();
  }
};