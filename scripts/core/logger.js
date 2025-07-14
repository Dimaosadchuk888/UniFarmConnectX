"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
var LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
};
// Dynamic import для Sentry (уникає циклічні залежності)
var Sentry = null;
try {
    if (process.env.SENTRY_DSN) {
        Sentry = require('@sentry/node');
    }
}
catch (error) {
    // Sentry недоступний - продовжуємо без нього
}
var Logger = /** @class */ (function () {
    function Logger() {
        this.isProduction = process.env.NODE_ENV === 'production';
    }
    Logger.prototype.formatMessage = function (level, message, meta) {
        var timestamp = new Date().toISOString();
        var metaStr = meta ? " ".concat(JSON.stringify(meta)) : '';
        return "[".concat(timestamp, "] [").concat(level.toUpperCase(), "] ").concat(message).concat(metaStr);
    };
    Logger.prototype.error = function (message, meta) {
        console.error(this.formatMessage(LOG_LEVELS.ERROR, message, meta));
        // Відправляємо критичні помилки в Sentry
        if (Sentry && process.env.SENTRY_DSN) {
            try {
                if (meta instanceof Error) {
                    // Якщо meta - це Error об'єкт
                    Sentry.captureException(meta, {
                        extra: { message: message, context: 'logger.error' }
                    });
                }
                else if (typeof meta === 'object' && meta && 'error' in meta) {
                    // Якщо в meta є поле error
                    var errorObj = meta.error;
                    if (errorObj instanceof Error) {
                        Sentry.captureException(errorObj, {
                            extra: { message: message, originalMeta: meta, context: 'logger.error' }
                        });
                    }
                    else {
                        // Створюємо Error з message
                        Sentry.captureException(new Error(message), {
                            extra: { meta: meta, context: 'logger.error' }
                        });
                    }
                }
                else {
                    // Створюємо Error з message
                    Sentry.captureException(new Error(message), {
                        extra: { meta: meta, context: 'logger.error' }
                    });
                }
            }
            catch (sentryError) {
                // Не блокуємо виконання, якщо Sentry недоступний
                console.warn('[Sentry] Failed to capture exception:', sentryError instanceof Error ? sentryError.message : String(sentryError));
            }
        }
    };
    Logger.prototype.warn = function (message, meta) {
        console.warn(this.formatMessage(LOG_LEVELS.WARN, message, meta));
    };
    Logger.prototype.info = function (message, meta) {
        console.log(this.formatMessage(LOG_LEVELS.INFO, message, meta));
    };
    Logger.prototype.debug = function (message, meta) {
        if (!this.isProduction) {
            console.log(this.formatMessage(LOG_LEVELS.DEBUG, message, meta));
        }
    };
    Logger.prototype.request = function (method, url, statusCode, duration) {
        var message = "".concat(method, " ").concat(url);
        var meta = { statusCode: statusCode, duration: duration };
        this.info(message, meta);
    };
    return Logger;
}());
exports.logger = new Logger();
exports.default = exports.logger;
