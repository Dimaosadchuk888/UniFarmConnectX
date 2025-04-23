/**
 * Утилиты для работы с реферальными ссылками
 */

/**
 * Создает реферальную ссылку на основе реферального кода
 * @param refCode - Реферальный код пользователя
 * @returns Полная ссылка в формате https://t.me/UniFarming_Bot/app?startapp=ref_CODE
 * 
 * АУДИТ: Обновлена структура URL в соответствии с требованиями Telegram Mini App API.
 * Формат строго такой: https://t.me/UniFarming_Bot/app?startapp=ref_КОД
 */
export function buildReferralLink(refCode: string | undefined | null): string {
  if (!refCode) {
    return '';
  }
  
  // Формат указан в соответствии с требованиями Telegram Mini App
  return `https://t.me/UniFarming_Bot/app?startapp=ref_${refCode}`;
}