/**
 * Утилиты для работы с реферальными ссылками
 */

/**
 * Создает реферальную ссылку на основе реферального кода
 * @param refCode - Реферальный код пользователя
 * @returns Полная ссылка в формате https://t.me/UniFarming_Bot/UniFarm?startapp=ref_CODE
 * 
 * АУДИТ: Обновлена структура URL в соответствии с требованиями Telegram Mini App API.
 * Формат строго такой: https://t.me/UniFarming_Bot/UniFarm?startapp=ref_КОД
 * 
 * ВАЖНО: Согласно пункту 2.2 ТЗ, реализована поддержка как startapp, так и start параметров
 * для обеспечения максимальной совместимости с разными способами запуска
 */
export function buildReferralLink(refCode: string | undefined | null): string {
  if (!refCode) {
    return '';
  }
  
  // Формат указан в соответствии с требованиями Telegram Mini App
  // Для приложений использовать startapp, для ботов - start
  return `https://t.me/UniFarming_Bot/UniFarm?startapp=ref_${refCode}`;
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