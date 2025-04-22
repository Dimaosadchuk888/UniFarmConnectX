/**
 * Утилиты для работы с реферальными ссылками
 */

/**
 * Создает реферальную ссылку на основе реферального кода
 * @param refCode - Реферальный код пользователя
 * @returns Полная ссылка в формате https://t.me/UniFarming_Bot/UniFarm?startapp=ref_CODE
 */
export function buildReferralLink(refCode: string | undefined | null): string {
  if (!refCode) {
    return '';
  }
  
  return `https://t.me/UniFarming_Bot/UniFarm?startapp=ref_${refCode}`;
}