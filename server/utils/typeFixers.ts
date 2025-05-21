/**
 * Утилиты для исправления проблем с типами
 * 
 * Этот модуль содержит вспомогательные функции для обеспечения совместимости 
 * между разными интерфейсами и устранения LSP-ошибок.
 */

/**
 * Приводит числовые строки к числовому типу
 * для корректной работы с базой данных
 * 
 * @param value Строковое или числовое значение
 * @returns Числовое значение или undefined
 */
export function ensureNumber(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return isNaN(num) ? undefined : num;
}

/**
 * Приводит различные типы данных к строковому типу для корректной работы с API
 * 
 * @param value Значение любого типа
 * @returns Строковое значение или undefined
 */
export function ensureString(value: any): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  
  return String(value);
}

/**
 * Проверяет, является ли значение строковым ID
 * Полезно для проверки параметров URL в API
 * 
 * @param value Значение для проверки
 * @returns true, если значение является строковым представлением числа
 */
export function isStringId(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0;
}

/**
 * Преобразует данные объекта для обеспечения совместимости с требуемым интерфейсом
 * Полезно для приведения данных из БД к формату, ожидаемому клиентом
 * 
 * @param data Исходные данные
 * @param defaultValues Значения по умолчанию
 * @returns Объект с дополненными полями
 */
export function ensureCompatibleObject<T>(data: any, defaultValues: Partial<T>): T {
  if (!data) {
    return defaultValues as T;
  }
  
  return { ...defaultValues, ...data } as T;
}

/**
 * Фильтрует null и undefined значения из объекта
 * Полезно для подготовки данных перед отправкой в БД
 * 
 * @param obj Исходный объект
 * @returns Объект без null и undefined значений
 */
export function removeNullValues<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      result[key as keyof T] = value as any;
    }
  }
  
  return result;
}

/**
 * Обеспечивает наличие всех обязательных полей в объекте
 * Заполняет отсутствующие поля значениями по умолчанию
 * 
 * @param obj Исходный объект
 * @param requiredFields Объект с обязательными полями и их значениями по умолчанию
 * @returns Объект с заполненными обязательными полями
 */
export function ensureRequiredFields<T extends object>(
  obj: Partial<T>,
  requiredFields: Record<keyof T, any>
): T {
  const result = { ...obj } as T;
  
  for (const [key, defaultValue] of Object.entries(requiredFields)) {
    if (result[key as keyof T] === undefined || result[key as keyof T] === null) {
      result[key as keyof T] = defaultValue;
    }
  }
  
  return result;
}