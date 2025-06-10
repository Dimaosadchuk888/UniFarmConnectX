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

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: string, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  error(message: string, meta?: unknown): void {
    console.error(this.formatMessage(LOG_LEVELS.ERROR, message, meta));
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