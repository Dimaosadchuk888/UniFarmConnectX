/**
 * Утилиты для работы с реферальной системой
 */

/**
 * Генерирует реферальный код
 */
export function generateReferralCode(userId: number | string): string {
  const baseCode = userId.toString();
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  
  return `${baseCode}_${timestamp}_${random}`.toUpperCase();
}

/**
 * Создает безопасную реферальную ссылку через Telegram WebApp
 */
export function createReferralLink(referralCode: string): string {
  // БЕЗОПАСНОСТЬ: Используем только Telegram WebApp формат
  // Никогда не используем прямые Replit URL'ы для защиты конфиденциальности
  
  // Получаем конфигурацию бота из переменных окружения или дефолтных значений
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'UniFarming_Bot';
  const appName = import.meta.env.VITE_TELEGRAM_WEBAPP_NAME || 'UniFarm';
  
  return `https://t.me/${botUsername}/${appName}?startapp=${referralCode}`;
}

/**
 * Извлекает реферальный код из URL
 */
export function extractReferralCodeFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('ref');
}

/**
 * Сохраняет реферальный код в localStorage
 */
export function saveReferralCode(code: string): void {
  try {
    localStorage.setItem('unifarm_referral_code', code);
  } catch (error) {
    console.warn('Не удалось сохранить реферальный код:', error);
  }
}

/**
 * Получает сохраненный реферальный код
 */
export function getSavedReferralCode(): string | null {
  try {
    return localStorage.getItem('unifarm_referral_code');
  } catch (error) {
    console.warn('Не удалось получить реферальный код:', error);
    return null;
  }
}

/**
 * Проверяет валидность реферального кода
 */
export function isValidReferralCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  
  // Базовая проверка формата
  return /^[A-Z0-9_]+$/.test(code) && code.length >= 5;
}

/**
 * Копирует текст в буфер обмена
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Ошибка копирования в буфер обмена:', error);
    return false;
  }
}

/**
 * Вычисляет процент вознаграждения для уровня
 */
export function getReferralRewardPercent(level: number): number {
  if (level === 1) return 100;
  if (level === 2) return 2;
  if (level >= 3 && level <= 20) return level;
  return 0;
}

/**
 * Форматирует реферальную статистику
 */
export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  levelBreakdown: Array<{
    level: number;
    count: number;
    earnings: number;
  }>;
}

export function formatReferralStats(stats: ReferralStats): string {
  return `Всего рефералов: ${stats.totalReferrals}, Активных: ${stats.activeReferrals}, Заработано: ${stats.totalEarnings} UNI`;
}