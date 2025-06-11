/**
 * Утилита логирования для клиентской части UniFarm
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  constructor() {
    // В production режиме показываем только warnings и errors
    if (import.meta.env.PROD) {
      this.logLevel = LogLevel.WARN;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private addLog(level: LogLevel, message: string, data?: any): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };

    this.logs.push(logEntry);

    // Ограничиваем количество логов в памяти
    if (this.logs.length > this.maxLogs) {
      this.logs.splice(0, this.logs.length - this.maxLogs);
    }
  }

  debug(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    this.addLog(LogLevel.DEBUG, message, data);
    console.debug(`[DEBUG] ${message}`, data || '');
  }

  info(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    this.addLog(LogLevel.INFO, message, data);
    console.info(`[INFO] ${message}`, data || '');
  }

  warn(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    this.addLog(LogLevel.WARN, message, data);
    console.warn(`[WARN] ${message}`, data || '');
  }

  error(message: string, error?: any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    this.addLog(LogLevel.ERROR, message, error);
    console.error(`[ERROR] ${message}`, error || '');
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Создаем единственный экземпляр логгера
export const logger = new Logger();

// Экспортируем удобные функции
export const log = {
  debug: (message: string, data?: any) => logger.debug(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  error: (message: string, error?: any) => logger.error(message, error)
};

export default logger;