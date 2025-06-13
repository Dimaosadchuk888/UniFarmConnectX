/**
 * Webhook Bypass Solution for Replit
 * Implements polling-based update retrieval as fallback for blocked webhook
 */

import fetch from 'node-fetch';

const BOT_TOKEN = '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

class TelegramPollingService {
  constructor() {
    this.offset = 0;
    this.isRunning = false;
    this.pollInterval = 2000; // 2 seconds
  }

  async getUpdates() {
    try {
      const response = await fetch(`${TELEGRAM_API}/getUpdates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offset: this.offset,
          timeout: 30,
          allowed_updates: ['message', 'callback_query']
        })
      });

      const data = await response.json();
      
      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          await this.processUpdate(update);
          this.offset = update.update_id + 1;
        }
      }
    } catch (error) {
      console.error('[Polling] Error getting updates:', error.message);
    }
  }

  async processUpdate(update) {
    try {
      // Forward to local webhook handler
      const response = await fetch('http://localhost:3000/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update)
      });

      if (response.ok) {
        console.log(`[Polling] Processed update ${update.update_id}`);
      }
    } catch (error) {
      console.error(`[Polling] Error processing update ${update.update_id}:`, error.message);
    }
  }

  async removeWebhook() {
    try {
      const response = await fetch(`${TELEGRAM_API}/deleteWebhook`);
      const data = await response.json();
      console.log('[Polling] Webhook removed:', data.description);
    } catch (error) {
      console.error('[Polling] Error removing webhook:', error.message);
    }
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[Polling] Starting Telegram polling service...');
    
    // Remove webhook first
    this.removeWebhook();
    
    // Start polling
    const poll = async () => {
      if (!this.isRunning) return;
      
      await this.getUpdates();
      setTimeout(poll, this.pollInterval);
    };
    
    poll();
  }

  stop() {
    this.isRunning = false;
    console.log('[Polling] Stopping Telegram polling service...');
  }
}

// Auto-start when imported
const pollingService = new TelegramPollingService();

// Start polling if webhook is not working
async function checkWebhookAndStartPolling() {
  try {
    const response = await fetch('https://uni-farm-connect-x-osadchukdmitro2.replit.app/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });

    if (response.status === 404) {
      console.log('[Solution] Webhook blocked, starting polling service...');
      pollingService.start();
    } else {
      console.log('[Solution] Webhook working, no polling needed');
    }
  } catch (error) {
    console.log('[Solution] Webhook unavailable, starting polling service...');
    pollingService.start();
  }
}

// Export for use in main server
export { TelegramPollingService };

// Auto-start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkWebhookAndStartPolling();
}