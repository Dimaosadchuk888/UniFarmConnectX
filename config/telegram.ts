export const telegramConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
  webAppUrl: process.env.TELEGRAM_WEBAPP_URL || '',
  apiUrl: 'https://api.telegram.org',
  maxRetries: 3,
  timeout: 30000
};