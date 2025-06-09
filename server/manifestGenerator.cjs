/**
 * Генератор динамічних маніфестів з підтримкою змінних оточення
 */

class ManifestGenerator {
  constructor() {
    this.appUrl = process.env.APP_URL || process.env.REPLIT_DEV_DOMAIN || 'http://localhost:3000';
  }

  generateTonConnectManifest() {
    return {
      url: this.appUrl,
      name: "UniFarm",
      iconUrl: `${this.appUrl}/assets/favicon.ico`,
      termsOfUseUrl: `${this.appUrl}/terms`,
      privacyPolicyUrl: `${this.appUrl}/privacy`
    };
  }

  generateTelegramWebAppManifest() {
    return {
      version: "1.0",
      name: "UniFarming",
      short_name: "UniFarm",
      description: "Фарминг, награды и рефералы в Telegram",
      start_parameter: "ref",
      bot_username: process.env.TELEGRAM_BOT_USERNAME || "UniFarming_Bot",
      url: this.appUrl
    };
  }

  setupRoutes(app) {
    // TON Connect manifest
    app.get('/tonconnect-manifest.json', (req, res) => {
      res.json(this.generateTonConnectManifest());
    });

    // Telegram WebApp manifest
    app.get('/.well-known/telegram-web-app-manifest.json', (req, res) => {
      res.json(this.generateTelegramWebAppManifest());
    });
  }
}

module.exports = ManifestGenerator;