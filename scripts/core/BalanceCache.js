"use strict";
/**
 * Система кеширования балансов для оптимизации производительности
 * Использует in-memory кеш с TTL для уменьшения нагрузки на БД
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.balanceCache = exports.BalanceCache = void 0;
var logger_1 = require("./logger");
var BalanceCache = /** @class */ (function () {
    function BalanceCache() {
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            size: 0
        };
        // Настройки кеша
        this.TTL_SECONDS = 300; // 5 минут
        this.MAX_CACHE_SIZE = 10000; // Максимум 10k записей
        this.CLEANUP_INTERVAL = 60000; // Очистка каждую минуту
        this.cleanupTimer = null;
        // Запускаем периодическую очистку устаревших записей
        this.startCleanupTimer();
    }
    BalanceCache.getInstance = function () {
        if (!BalanceCache.instance) {
            BalanceCache.instance = new BalanceCache();
        }
        return BalanceCache.instance;
    };
    /**
     * Получить баланс из кеша
     */
    BalanceCache.prototype.get = function (userId) {
        var cached = this.cache.get(userId);
        if (!cached) {
            this.stats.misses++;
            logger_1.logger.debug('[BalanceCache] Cache miss', { userId: userId });
            return null;
        }
        // Проверяем срок действия
        if (cached.expiresAt < new Date()) {
            this.cache.delete(userId);
            this.stats.evictions++;
            this.stats.misses++;
            logger_1.logger.debug('[BalanceCache] Cache expired', { userId: userId });
            return null;
        }
        this.stats.hits++;
        logger_1.logger.debug('[BalanceCache] Cache hit', {
            userId: userId,
            uniBalance: cached.uniBalance,
            tonBalance: cached.tonBalance
        });
        return {
            uniBalance: cached.uniBalance,
            tonBalance: cached.tonBalance
        };
    };
    /**
     * Сохранить баланс в кеш
     */
    BalanceCache.prototype.set = function (userId, uniBalance, tonBalance) {
        // Проверяем размер кеша
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            this.evictOldest();
        }
        var now = new Date();
        var expiresAt = new Date(now.getTime() + this.TTL_SECONDS * 1000);
        this.cache.set(userId, {
            userId: userId,
            uniBalance: uniBalance,
            tonBalance: tonBalance,
            lastUpdated: now,
            expiresAt: expiresAt
        });
        this.stats.size = this.cache.size;
        logger_1.logger.debug('[BalanceCache] Balance cached', {
            userId: userId,
            uniBalance: uniBalance,
            tonBalance: tonBalance,
            ttl: this.TTL_SECONDS
        });
    };
    /**
     * Обновить только UNI баланс
     */
    BalanceCache.prototype.updateUni = function (userId, uniBalance) {
        var cached = this.cache.get(userId);
        if (cached) {
            cached.uniBalance = uniBalance;
            cached.lastUpdated = new Date();
            cached.expiresAt = new Date(Date.now() + this.TTL_SECONDS * 1000);
        }
    };
    /**
     * Обновить только TON баланс
     */
    BalanceCache.prototype.updateTon = function (userId, tonBalance) {
        var cached = this.cache.get(userId);
        if (cached) {
            cached.tonBalance = tonBalance;
            cached.lastUpdated = new Date();
            cached.expiresAt = new Date(Date.now() + this.TTL_SECONDS * 1000);
        }
    };
    /**
     * Инвалидировать кеш для пользователя
     */
    BalanceCache.prototype.invalidate = function (userId) {
        if (this.cache.delete(userId)) {
            this.stats.evictions++;
            logger_1.logger.debug('[BalanceCache] Cache invalidated', { userId: userId });
        }
    };
    /**
     * Инвалидировать кеш для нескольких пользователей
     */
    BalanceCache.prototype.invalidateBatch = function (userIds) {
        var invalidated = 0;
        for (var _i = 0, userIds_1 = userIds; _i < userIds_1.length; _i++) {
            var userId = userIds_1[_i];
            if (this.cache.delete(userId)) {
                invalidated++;
            }
        }
        this.stats.evictions += invalidated;
        logger_1.logger.debug('[BalanceCache] Batch invalidation', {
            count: invalidated,
            total: userIds.length
        });
    };
    /**
     * Очистить весь кеш
     */
    BalanceCache.prototype.clear = function () {
        var size = this.cache.size;
        this.cache.clear();
        this.stats.evictions += size;
        this.stats.size = 0;
        logger_1.logger.info('[BalanceCache] Cache cleared', { evicted: size });
    };
    /**
     * Получить статистику кеша
     */
    BalanceCache.prototype.getStats = function () {
        var total = this.stats.hits + this.stats.misses;
        var hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
        return __assign(__assign({}, this.stats), { hitRate: Math.round(hitRate * 100) / 100 });
    };
    /**
     * Удалить самые старые записи при переполнении
     */
    BalanceCache.prototype.evictOldest = function () {
        var sortedEntries = Array.from(this.cache.entries())
            .sort(function (a, b) { return a[1].lastUpdated.getTime() - b[1].lastUpdated.getTime(); });
        // Удаляем 10% самых старых записей
        var toEvict = Math.ceil(this.MAX_CACHE_SIZE * 0.1);
        for (var i = 0; i < toEvict && i < sortedEntries.length; i++) {
            this.cache.delete(sortedEntries[i][0]);
            this.stats.evictions++;
        }
        logger_1.logger.debug('[BalanceCache] Evicted oldest entries', { count: toEvict });
    };
    /**
     * Периодическая очистка устаревших записей
     */
    BalanceCache.prototype.cleanup = function () {
        var now = new Date();
        var expired = 0;
        for (var _i = 0, _a = this.cache.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], userId = _b[0], cached = _b[1];
            if (cached.expiresAt < now) {
                this.cache.delete(userId);
                expired++;
            }
        }
        if (expired > 0) {
            this.stats.evictions += expired;
            this.stats.size = this.cache.size;
            logger_1.logger.debug('[BalanceCache] Cleanup completed', { expired: expired });
        }
    };
    /**
     * Запустить таймер очистки
     */
    BalanceCache.prototype.startCleanupTimer = function () {
        var _this = this;
        this.cleanupTimer = setInterval(function () {
            _this.cleanup();
        }, this.CLEANUP_INTERVAL);
    };
    /**
     * Остановить таймер очистки
     */
    BalanceCache.prototype.stopCleanupTimer = function () {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    };
    return BalanceCache;
}());
exports.BalanceCache = BalanceCache;
// Экспортируем синглтон
exports.balanceCache = BalanceCache.getInstance();
