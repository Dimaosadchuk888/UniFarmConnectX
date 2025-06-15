interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

// Dynamic import для Sentry (уникає циклічні залежності)
let Sentry: any = null;
try {
  if (process.env.SENTRY_DSN) {
    Sentry = require('@sentry/node');
  }
} catch (error) {
  // Sentry недоступний - продовжуємо без нього
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: string, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  error(message: string, meta?: unknown): void {
    console.error(this.formatMessage(LOG_LEVELS.ERROR, message, meta));
    
    // Відправляємо критичні помилки в Sentry
    if (Sentry && process.env.SENTRY_DSN) {
      try {
        if (meta instanceof Error) {
          // Якщо meta - це Error об'єкт
          Sentry.captureException(meta, {
            extra: { message, context: 'logger.error' }
          });
        } else if (typeof meta === 'object' && meta && 'error' in meta) {
          // Якщо в meta є поле error
          const errorObj = (meta as any).error;
          if (errorObj instanceof Error) {
            Sentry.captureException(errorObj, {
              extra: { message, originalMeta: meta, context: 'logger.error' }
            });
          } else {
            // Створюємо Error з message
            Sentry.captureException(new Error(message), {
              extra: { meta, context: 'logger.error' }
            });
          }
        } else {
          // Створюємо Error з message
          Sentry.captureException(new Error(message), {
            extra: { meta, context: 'logger.error' }
          });
        }
      } catch (sentryError) {
        // Не блокуємо виконання, якщо Sentry недоступний
        console.warn('[Sentry] Failed to capture exception:', sentryError instanceof Error ? sentryError.message : String(sentryError));
      }
    }
  }

  warn(message: string, meta?: unknown): void {
    console.warn(this.formatMessage(LOG_LEVELS.WARN, message, meta));
  }

  info(message: string, meta?: unknown): void {
    console.log(this.formatMessage(LOG_LEVELS.INFO, message, meta));
  }

  debug(message: string, meta?: unknown): void {
    if (!this.isProduction) {
      console.log(this.formatMessage(LOG_LEVELS.DEBUG, message, meta));
    }
  }

  request(method: string, url: string, statusCode?: number, duration?: number): void {
    const message = `${method} ${url}`;
    const meta = { statusCode, duration };
    this.info(message, meta);
  }
}

export const logger = new Logger();
export default logger;