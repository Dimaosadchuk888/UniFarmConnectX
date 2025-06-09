/**
 * Telegram Error Service
 * Handles error reporting and recovery for Telegram Mini App
 */

interface TelegramError {
  type: 'network' | 'api' | 'auth' | 'unknown';
  message: string;
  code?: string;
  timestamp: number;
}

export class TelegramErrorService {
  private errors: TelegramError[] = [];
  private maxErrors = 50;

  /**
   * Log an error
   */
  logError(type: TelegramError['type'], message: string, code?: string): void {
    const error: TelegramError = {
      type,
      message,
      code,
      timestamp: Date.now()
    };

    this.errors.unshift(error);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    console.error(`[TelegramError] ${type.toUpperCase()}: ${message}`, code ? `(${code})` : '');
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10): TelegramError[] {
    return this.errors.slice(0, limit);
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Check if there are critical errors
   */
  hasCriticalErrors(): boolean {
    const recentErrors = this.getRecentErrors(5);
    return recentErrors.filter(error => error.type === 'auth' || error.type === 'api').length >= 3;
  }

  /**
   * Handle Telegram API errors
   */
  handleTelegramApiError(error: any): void {
    if (error?.response?.status === 401) {
      this.logError('auth', 'Unauthorized access to Telegram API', '401');
    } else if (error?.response?.status === 429) {
      this.logError('api', 'Rate limit exceeded', '429');
    } else if (error?.code === 'NETWORK_ERROR') {
      this.logError('network', 'Network connection failed', error.code);
    } else {
      this.logError('unknown', error?.message || 'Unknown Telegram error', error?.code);
    }
  }
}

export const telegramErrorService = new TelegramErrorService();