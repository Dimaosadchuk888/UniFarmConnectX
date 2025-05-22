/**
 * Утилита для автоматической настройки Telegram вебхука при запуске сервера
 */
import { telegramBot } from './bot';
import logger from '../utils/logger';

/**
 * Получает URL текущего приложения в Replit
 */
function getAppUrl(): string | null {
  // Приоритет - заданный вручную URL из переменных окружения
  if (process.env.MINI_APP_URL) {
    return process.env.MINI_APP_URL;
  }
  
  // Затем проверяем переменные деплоя Replit
  const replSlug = process.env.REPL_SLUG;
  const replOwner = process.env.REPL_OWNER;
  const replitId = process.env.REPLIT_DEPLOYMENT_ID; // новый формат URL для Deployment

  if (replitId) {
    // Для Replit Deployments формат URL отличается
    return `https://${replitId}.replit.app`;
  } else if (replSlug && replOwner) {
    // Для Replit стандартный формат URL
    return `https://${replSlug}.${replOwner}.repl.co`;
  } 
  
  // Если ничего не нашли, используем хардкод для целевого URL
  return 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app';
}

/**
 * Настраивает вебхук и Mini App URL автоматически
 */
export async function setupTelegramHook(): Promise<void> {
  try {
    // Получаем URL приложения
    const appUrl = getAppUrl();
    
    if (!appUrl) {
      logger.warn('[TelegramSetup] Не удалось определить URL приложения автоматически');
      return;
    }
    
    logger.info(`[TelegramSetup] Определен URL приложения: ${appUrl}`);
    
    // Сохраняем URL в переменные окружения для последующего использования
    process.env.MINI_APP_URL = appUrl;
    process.env.TELEGRAM_WEBHOOK_URL = appUrl;
    
    // Настраиваем Telegram бота
    logger.info('[TelegramSetup] Начинаем автоматическую настройку Telegram бота...');
    
    // Инициализируем бота
    await telegramBot.initialize();
    
    // Настраиваем Mini App и вебхук
    const result = await telegramBot.setupMiniApp(appUrl);
    
    if (result) {
      logger.info('[TelegramSetup] Telegram бот успешно настроен автоматически');
    } else {
      logger.warn('[TelegramSetup] Не удалось полностью настроить Telegram бота автоматически');
    }
  } catch (error) {
    logger.error('[TelegramSetup] Ошибка при автоматической настройке Telegram бота:', error);
  }
}