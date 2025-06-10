export const telegramConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
  webAppUrl: process.env.TELEGRAM_WEBAPP_URL || '',
  
  // Унифицированные Telegram настройки с поддержкой клиентских переменных
  botUsername: process.env.TELEGRAM_BOT_USERNAME || 'UniFarming_Bot',
  clientBotUsername: process.env.VITE_TELEGRAM_BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME || 'UniFarming_Bot',
  
  webAppName: process.env.TELEGRAM_WEBAPP_NAME || 'UniFarm',
  clientWebAppName: process.env.VITE_TELEGRAM_WEBAPP_NAME || process.env.TELEGRAM_WEBAPP_NAME || 'UniFarm',
  
  apiUrl: 'https://api.telegram.org',
  maxRetries: 3,
  timeout: 30000
};