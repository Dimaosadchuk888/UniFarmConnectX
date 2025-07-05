/**
 * Configuration for UniFarm Admin Bot
 * Separate bot for administrative functions
 */

export const adminBotConfig = {
  token: process.env.ADMIN_BOT_TOKEN || '7662298323:AAFLgX05fWtgNYJfT_VeZ_kRZhIBixoseIY',
  username: '@unifarm_admin_bot',
  
  // Authorized admin usernames
  authorizedAdmins: [
    '@a888bnd',
    '@DimaOsadchuk'
  ],
  
  // Webhook configuration
  webhookPath: '/admin-bot-webhook',
  
  // API URL for Telegram
  apiUrl: 'https://api.telegram.org'
};