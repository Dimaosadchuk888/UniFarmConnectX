/**
 * Централизованный логгер для frontend UniFarm
 * Стандартизирует все логирование на клиентской стороне
 */

interface FrontendLogger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

// Проверка production режима
const isProduction = import.meta.env.NODE_ENV === 'production';

const frontendLogger: FrontendLogger = {
  debug: (...args: any[]) => {
    if (!isProduction) {
      frontendLogger.debug('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => console.info('[INFO]', ...args),
  warn: (...args: any[]) => frontendLogger.warn('[WARN]', ...args),
  error: (...args: any[]) => frontendLogger.error('[ERROR]', ...args),
};

export default frontendLogger;