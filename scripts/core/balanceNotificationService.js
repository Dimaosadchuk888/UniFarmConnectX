"use strict";
/**
 * Централизованная служба уведомлений об изменениях баланса
 * Интегрируется с WebSocket для уведомления клиентов о начислениях
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceNotificationService = void 0;
var logger_1 = require("./logger");
var BalanceNotificationService = /** @class */ (function () {
    function BalanceNotificationService() {
        this.websocketConnections = new Map();
        this.pendingUpdates = new Map();
        this.updateTimeouts = new Map();
    }
    BalanceNotificationService.getInstance = function () {
        if (!BalanceNotificationService.instance) {
            BalanceNotificationService.instance = new BalanceNotificationService();
        }
        return BalanceNotificationService.instance;
    };
    /**
     * Регистрирует WebSocket подключение для пользователя
     */
    BalanceNotificationService.prototype.registerConnection = function (userId, ws) {
        if (!this.websocketConnections.has(userId)) {
            this.websocketConnections.set(userId, []);
        }
        this.websocketConnections.get(userId).push(ws);
        logger_1.logger.info("[BalanceNotification] \u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0434\u043B\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F ".concat(userId));
    };
    /**
     * Удаляет WebSocket подключение для пользователя
     */
    BalanceNotificationService.prototype.removeConnection = function (userId, ws) {
        var connections = this.websocketConnections.get(userId);
        if (connections) {
            var index = connections.indexOf(ws);
            if (index !== -1) {
                connections.splice(index, 1);
                if (connections.length === 0) {
                    this.websocketConnections.delete(userId);
                }
                logger_1.logger.info("[BalanceNotification] \u0423\u0434\u0430\u043B\u0435\u043D\u043E \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0434\u043B\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F ".concat(userId));
            }
        }
    };
    /**
     * Отправляет уведомление об изменении баланса
     * Использует debounce для агрегации изменений
     */
    BalanceNotificationService.prototype.notifyBalanceUpdate = function (updateData) {
        var _this = this;
        var userId = updateData.userId;
        // Добавляем обновление в очередь
        if (!this.pendingUpdates.has(userId)) {
            this.pendingUpdates.set(userId, []);
        }
        this.pendingUpdates.get(userId).push(updateData);
        // Сбрасываем предыдущий таймаут, если есть
        if (this.updateTimeouts.has(userId)) {
            clearTimeout(this.updateTimeouts.get(userId));
        }
        // Устанавливаем новый таймаут для агрегации изменений
        var timeout = setTimeout(function () {
            _this.sendAggregatedUpdate(userId);
        }, 2000); // Ждем 2 секунды для агрегации
        this.updateTimeouts.set(userId, timeout);
    };
    /**
     * Отправляет агрегированное обновление баланса
     */
    BalanceNotificationService.prototype.sendAggregatedUpdate = function (userId) {
        var updates = this.pendingUpdates.get(userId);
        if (!updates || updates.length === 0)
            return;
        // Агрегируем все изменения
        var latestUpdate = updates[updates.length - 1];
        var totalUniChange = updates
            .filter(function (u) { return u.currency === 'UNI'; })
            .reduce(function (sum, u) { return sum + u.changeAmount; }, 0);
        var totalTonChange = updates
            .filter(function (u) { return u.currency === 'TON'; })
            .reduce(function (sum, u) { return sum + u.changeAmount; }, 0);
        var aggregatedUpdate = {
            type: 'balance_update',
            userId: userId,
            balanceData: {
                balanceUni: latestUpdate.balanceUni,
                balanceTon: latestUpdate.balanceTon,
                changes: {
                    uni: totalUniChange,
                    ton: totalTonChange
                },
                sources: __spreadArray([], new Set(updates.map(function (u) { return u.source; })), true),
                timestamp: new Date().toISOString()
            }
        };
        // Отправляем уведомление через WebSocket
        this.sendToUserConnections(userId, aggregatedUpdate);
        // Очищаем данные
        this.pendingUpdates.delete(userId);
        this.updateTimeouts.delete(userId);
        logger_1.logger.info("[BalanceNotification] \u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u0430\u0433\u0440\u0435\u0433\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u0431\u0430\u043B\u0430\u043D\u0441\u0430", {
            userId: userId,
            uniChange: totalUniChange,
            tonChange: totalTonChange,
            sources: aggregatedUpdate.balanceData.sources
        });
    };
    /**
     * Отправляет сообщение всем подключениям пользователя
     */
    BalanceNotificationService.prototype.sendToUserConnections = function (userId, message) {
        var connections = this.websocketConnections.get(userId);
        if (!connections || connections.length === 0) {
            logger_1.logger.debug("[BalanceNotification] \u041D\u0435\u0442 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0439 \u0434\u043B\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F ".concat(userId));
            return;
        }
        var messageStr = JSON.stringify(message);
        var sentCount = 0;
        connections.forEach(function (ws, index) {
            try {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(messageStr);
                    sentCount++;
                }
                else {
                    // Удаляем неактивное подключение
                    connections.splice(index, 1);
                }
            }
            catch (error) {
                logger_1.logger.error("[BalanceNotification] \u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E ".concat(userId), error);
                // Удаляем неисправное подключение
                connections.splice(index, 1);
            }
        });
        logger_1.logger.debug("[BalanceNotification] \u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 ".concat(sentCount, " \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F\u043C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F ").concat(userId));
    };
    /**
     * Принудительно отправляет все ожидающие обновления
     */
    BalanceNotificationService.prototype.flushPendingUpdates = function () {
        for (var _i = 0, _a = this.pendingUpdates.keys(); _i < _a.length; _i++) {
            var userId = _a[_i];
            if (this.updateTimeouts.has(userId)) {
                clearTimeout(this.updateTimeouts.get(userId));
                this.updateTimeouts.delete(userId);
            }
            this.sendAggregatedUpdate(userId);
        }
    };
    /**
     * Получает статистику активных подключений
     */
    BalanceNotificationService.prototype.getConnectionStats = function () {
        var totalConnections = 0;
        for (var _i = 0, _a = this.websocketConnections.values(); _i < _a.length; _i++) {
            var connections = _a[_i];
            totalConnections += connections.length;
        }
        return {
            totalUsers: this.websocketConnections.size,
            totalConnections: totalConnections
        };
    };
    return BalanceNotificationService;
}());
exports.BalanceNotificationService = BalanceNotificationService;
