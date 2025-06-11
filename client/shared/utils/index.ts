/**
 * Общие утилиты
 */

export { cn } from './cn';

/**
 * Форматирование чисел для отображения баланса
 */
export const formatBalance = (value: string | number, decimals: number = 2): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00';
  return num.toFixed(decimals);
};

/**
 * Форматирование даты
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return 'Не указано';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Неверная дата';
  }
};

/**
 * Безопасное преобразование в число
 */
export const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Проверка валидности пользовательских данных
 */
export const validateUserData = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;
  
  // Проверяем обязательные поля
  const requiredFields = ['id', 'balance_uni', 'balance_ton'];
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) return false;
  }
  
  // Проверяем корректность ID
  if (typeof data.id !== 'number' || data.id <= 0) return false;
  
  return true;
};