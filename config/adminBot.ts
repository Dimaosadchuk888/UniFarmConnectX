/**
 * Configuration for UniFarm Admin Bot
 * Separate bot for administrative functions
 */

// Check if admin bot token is set
if (!process.env.ADMIN_BOT_TOKEN) {
  console.warn('[AdminBot] ADMIN_BOT_TOKEN not set in environment');
}

export const adminBotConfig = {
  token: process.env.ADMIN_BOT_TOKEN || '',
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