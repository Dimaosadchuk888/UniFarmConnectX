/**
 * Утилиты для работы с реферальными ссылками
 */

/**
 * Создает реферальную ссылку на основе реферального кода
 * @param refCode - Реферальный код пользователя
 * @returns Полная ссылка в формате для Mini App
 * 
 * УНИФИКАЦИЯ: Обновлена структура URL для Mini App.
 * Формат: https://t.me/UniFarming_Bot/UniFarm?startapp=КОД
 * 
 * ВАЖНО: Используется параметр startapp для Mini App
 * для корректной передачи реферального кода в приложение
 */
export function buildReferralLink(refCode: string | undefined | null): string {
  if (!refCode) {
    return '';
  }
  
  // Унифицированный формат для Mini App
  // Использует параметр startapp для передачи реферального кода
  return `https://t.me/UniFarming_Bot/UniFarm?startapp=${refCode}`;
}

/**
 * Создает реферальную ссылку для прямого перехода к боту
 * Эта ссылка не открывает Mini App, а открывает диалог с ботом
 * С параметром start, который будет обработан ботом
 * 
 * @param refCode - Реферальный код пользователя
 * @returns Полная ссылка в формате https://t.me/UniFarming_Bot?start=ref_CODE
 */
export function buildDirectBotReferralLink(refCode: string | undefined | null): string {
  if (!refCode) {
    return '';
  }
  
  // Для прямого обращения к боту (не через Mini App) используем другой формат
  return `https://t.me/UniFarming_Bot?start=ref_${refCode}`;
}