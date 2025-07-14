"use strict";
/**
 * ЦЕНТРАЛИЗОВАННЫЙ BALANCE MANAGER
 * Объединяет все 4 дублирующих реализации в единый сервис
 * Рефакторинг по рекомендациям: docs/UNIFARM_CENTRALIZATION_AUDIT_REPORT.md
 *
 * УСТРАНЯЕТ ДУБЛИРОВАНИЕ:
 * - core/repositories/UserRepository.updateBalance()
 * - modules/user/model.updateBalance()
 * - core/TransactionService.updateUserBalance()
 * - modules/wallet/directBalanceHandler.ts
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.balanceManager = exports.BalanceManager = void 0;
var supabaseClient_1 = require("./supabaseClient");
var logger_1 = require("./logger");
var BalanceCache_1 = require("./BalanceCache");
var TransactionEnforcer_1 = require("./TransactionEnforcer");
var BalanceManager = /** @class */ (function () {
    function BalanceManager() {
    }
    BalanceManager.getInstance = function () {
        if (!BalanceManager.instance) {
            BalanceManager.instance = new BalanceManager();
        }
        return BalanceManager.instance;
    };
    /**
     * ЦЕНТРАЛИЗОВАННОЕ обновление баланса пользователя
     * Заменяет все 4 дублирующих реализации
     */
    BalanceManager.prototype.updateUserBalance = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var user_id_1, _a, amount_uni, _b, amount_ton, operation, _c, source, transaction_id, currentBalance, current, newUniBalance, newTonBalance, _d, updatedUser, updateError, newBalance, changeData, error_1;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 3, , 4]);
                        user_id_1 = data.user_id, _a = data.amount_uni, amount_uni = _a === void 0 ? 0 : _a, _b = data.amount_ton, amount_ton = _b === void 0 ? 0 : _b, operation = data.operation, _c = data.source, source = _c === void 0 ? 'BalanceManager' : _c, transaction_id = data.transaction_id;
                        logger_1.logger.info('[BalanceManager] Обновление баланса пользователя', {
                            user_id: user_id_1,
                            amount_uni: amount_uni,
                            amount_ton: amount_ton,
                            operation: operation,
                            source: source,
                            transaction_id: transaction_id,
                            timestamp: new Date().toISOString()
                        });
                        // Валидация данных
                        if (!user_id_1 || user_id_1 <= 0) {
                            return [2 /*return*/, { success: false, error: 'Некорректный user_id' }];
                        }
                        if (amount_uni === 0 && amount_ton === 0 && operation !== 'set') {
                            return [2 /*return*/, { success: false, error: 'Не указана сумма для обновления' }];
                        }
                        return [4 /*yield*/, this.getUserBalance(user_id_1)];
                    case 1:
                        currentBalance = _e.sent();
                        if (!currentBalance.success) {
                            return [2 /*return*/, { success: false, error: currentBalance.error }];
                        }
                        current = currentBalance.balance;
                        newUniBalance = current.balance_uni;
                        newTonBalance = current.balance_ton;
                        // Вычисляем новый баланс в зависимости от операции
                        switch (operation) {
                            case 'add':
                                newUniBalance = current.balance_uni + amount_uni;
                                newTonBalance = current.balance_ton + amount_ton;
                                break;
                            case 'subtract':
                                newUniBalance = Math.max(0, current.balance_uni - amount_uni);
                                newTonBalance = Math.max(0, current.balance_ton - amount_ton);
                                break;
                            case 'set':
                                newUniBalance = amount_uni;
                                newTonBalance = amount_ton;
                                break;
                            default:
                                return [2 /*return*/, { success: false, error: 'Неподдерживаемая операция' }];
                        }
                        // Обновляем баланс в базе данных
                        logger_1.logger.info('[BalanceManager] Попытка обновления баланса в Supabase', {
                            user_id: user_id_1,
                            newUniBalance: newUniBalance.toFixed(6),
                            newTonBalance: newTonBalance.toFixed(6),
                            operation: operation
                        });
                        return [4 /*yield*/, supabaseClient_1.supabase
                                .from('users')
                                .update({
                                balance_uni: parseFloat(newUniBalance.toFixed(6)), // Отправляем как число для NUMERIC типа
                                balance_ton: parseFloat(newTonBalance.toFixed(6)) // Отправляем как число для NUMERIC типа
                            })
                                .eq('id', user_id_1)
                                .select('id, balance_uni, balance_ton')
                                .single()];
                    case 2:
                        _d = _e.sent(), updatedUser = _d.data, updateError = _d.error;
                        logger_1.logger.info('[BalanceManager] Результат обновления в Supabase', {
                            user_id: user_id_1,
                            updateError: (updateError === null || updateError === void 0 ? void 0 : updateError.message) || null,
                            updatedUser: updatedUser || null,
                            success: !updateError
                        });
                        if (updateError) {
                            logger_1.logger.error('[BalanceManager] Ошибка обновления баланса в БД:', {
                                user_id: user_id_1,
                                error: updateError.message
                            });
                            return [2 /*return*/, { success: false, error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0431\u0430\u043B\u0430\u043D\u0441\u0430: ".concat(updateError.message) }];
                        }
                        newBalance = {
                            user_id: updatedUser.id,
                            balance_uni: parseFloat(updatedUser.balance_uni),
                            balance_ton: parseFloat(updatedUser.balance_ton),
                            last_updated: new Date().toISOString()
                        };
                        // Обновляем кеш с новыми балансами
                        BalanceCache_1.balanceCache.set(user_id_1, newBalance.balance_uni, newBalance.balance_ton);
                        // Логируем успешное обновление с деталями изменений
                        logger_1.logger.info('[BalanceManager] Баланс успешно обновлен', {
                            user_id: user_id_1,
                            operation: operation,
                            source: source,
                            previous_uni: current.balance_uni,
                            previous_ton: current.balance_ton,
                            new_uni: newBalance.balance_uni,
                            new_ton: newBalance.balance_ton,
                            change_uni: operation === 'set' ? 'set' : (newBalance.balance_uni - current.balance_uni).toFixed(6),
                            change_ton: operation === 'set' ? 'set' : (newBalance.balance_ton - current.balance_ton).toFixed(6)
                        });
                        logger_1.logger.info('[BalanceManager] Баланс успешно обновлен:', {
                            user_id: user_id_1,
                            old_uni: current.balance_uni,
                            new_uni: newBalance.balance_uni,
                            old_ton: current.balance_ton,
                            new_ton: newBalance.balance_ton,
                            operation: operation,
                            source: source
                        });
                        // Отправляем WebSocket уведомление об обновлении баланса
                        if (this.onBalanceUpdate) {
                            changeData = {
                                userId: user_id_1,
                                changeAmountUni: amount_uni || 0,
                                changeAmountTon: amount_ton || 0,
                                currency: amount_uni && amount_ton ? 'BOTH' : (amount_uni ? 'UNI' : 'TON'),
                                source: source || 'unknown',
                                oldBalanceUni: current.balance_uni,
                                oldBalanceTon: current.balance_ton,
                                newBalanceUni: newBalance.balance_uni,
                                newBalanceTon: newBalance.balance_ton
                            };
                            this.onBalanceUpdate(changeData).catch(function (error) {
                                logger_1.logger.error('[BalanceManager] Ошибка при отправке WebSocket уведомления:', {
                                    user_id: user_id_1,
                                    error: error instanceof Error ? error.message : String(error)
                                });
                            });
                        }
                        return [2 /*return*/, { success: true, newBalance: newBalance }];
                    case 3:
                        error_1 = _e.sent();
                        logger_1.logger.error('[BalanceManager] Критическая ошибка обновления баланса:', {
                            data: data,
                            error: error_1 instanceof Error ? error_1.message : String(error_1)
                        });
                        return [2 /*return*/, { success: false, error: 'Внутренняя ошибка сервера' }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * ЦЕНТРАЛИЗОВАННОЕ получение баланса пользователя
     */
    BalanceManager.prototype.getUserBalance = function (user_id) {
        return __awaiter(this, void 0, void 0, function () {
            var cached, _a, user, error, balance, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        logger_1.logger.info('[BalanceManager] Получение баланса пользователя', { user_id: user_id });
                        if (!user_id || user_id <= 0) {
                            return [2 /*return*/, { success: false, error: 'Некорректный user_id' }];
                        }
                        cached = BalanceCache_1.balanceCache.get(user_id);
                        if (cached) {
                            return [2 /*return*/, {
                                    success: true,
                                    balance: {
                                        user_id: user_id,
                                        balance_uni: cached.uniBalance,
                                        balance_ton: cached.tonBalance,
                                        last_updated: new Date().toISOString()
                                    }
                                }];
                        }
                        return [4 /*yield*/, supabaseClient_1.supabase
                                .from('users')
                                .select('id, balance_uni, balance_ton')
                                .eq('id', user_id)
                                .single()];
                    case 1:
                        _a = _b.sent(), user = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('[BalanceManager] Ошибка получения баланса:', {
                                user_id: user_id,
                                error: error.message
                            });
                            return [2 /*return*/, { success: false, error: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ".concat(error.message) }];
                        }
                        balance = {
                            user_id: user.id,
                            balance_uni: parseFloat(user.balance_uni || '0'),
                            balance_ton: parseFloat(user.balance_ton || '0'),
                            last_updated: new Date().toISOString()
                        };
                        // Сохраняем в кеш
                        BalanceCache_1.balanceCache.set(user_id, balance.balance_uni, balance.balance_ton);
                        logger_1.logger.info('[BalanceManager] Баланс получен и закеширован:', balance);
                        return [2 /*return*/, { success: true, balance: balance }];
                    case 2:
                        error_2 = _b.sent();
                        logger_1.logger.error('[BalanceManager] Критическая ошибка получения баланса:', {
                            user_id: user_id,
                            error: error_2 instanceof Error ? error_2.message : String(error_2)
                        });
                        return [2 /*return*/, { success: false, error: 'Внутренняя ошибка сервера' }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Пополнение баланса (добавление средств)
     */
    BalanceManager.prototype.addBalance = function (user_id_2) {
        return __awaiter(this, arguments, void 0, function (user_id, amount_uni, amount_ton, source, operationType) {
            var result, currency, amount, transactionResult;
            if (amount_uni === void 0) { amount_uni = 0; }
            if (amount_ton === void 0) { amount_ton = 0; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.updateUserBalance({
                            user_id: user_id,
                            amount_uni: amount_uni,
                            amount_ton: amount_ton,
                            operation: 'add',
                            source: source || 'addBalance'
                        })];
                    case 1:
                        result = _a.sent();
                        if (!(result.success && operationType)) return [3 /*break*/, 3];
                        currency = amount_uni > 0 ? 'UNI' : 'TON';
                        amount = amount_uni > 0 ? amount_uni : amount_ton;
                        return [4 /*yield*/, TransactionEnforcer_1.transactionEnforcer.createRequiredTransaction(operationType, user_id, amount, currency, source || 'Balance addition', { source: source })];
                    case 2:
                        transactionResult = _a.sent();
                        if (!transactionResult.success) {
                            logger_1.logger.warn('[BalanceManager] Не удалось создать транзакцию', {
                                operationType: operationType,
                                user_id: user_id,
                                error: transactionResult.error
                            });
                        }
                        _a.label = 3;
                    case 3: return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * Списание с баланса (вычитание средств)
     */
    BalanceManager.prototype.subtractBalance = function (user_id_2) {
        return __awaiter(this, arguments, void 0, function (user_id, amount_uni, amount_ton, source, operationType) {
            var result, currency, amount, transactionResult;
            if (amount_uni === void 0) { amount_uni = 0; }
            if (amount_ton === void 0) { amount_ton = 0; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.updateUserBalance({
                            user_id: user_id,
                            amount_uni: amount_uni,
                            amount_ton: amount_ton,
                            operation: 'subtract',
                            source: source || 'subtractBalance'
                        })];
                    case 1:
                        result = _a.sent();
                        if (!(result.success && operationType)) return [3 /*break*/, 3];
                        currency = amount_uni > 0 ? 'UNI' : 'TON';
                        amount = amount_uni > 0 ? amount_uni : amount_ton;
                        return [4 /*yield*/, TransactionEnforcer_1.transactionEnforcer.createRequiredTransaction(operationType, user_id, amount, currency, source || 'Balance deduction', { source: source })];
                    case 2:
                        transactionResult = _a.sent();
                        if (!transactionResult.success) {
                            logger_1.logger.warn('[BalanceManager] Не удалось создать транзакцию', {
                                operationType: operationType,
                                user_id: user_id,
                                error: transactionResult.error
                            });
                        }
                        _a.label = 3;
                    case 3: return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * Установка точного баланса (перезапись)
     */
    BalanceManager.prototype.setBalance = function (user_id, amount_uni, amount_ton, source) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.updateUserBalance({
                        user_id: user_id,
                        amount_uni: amount_uni,
                        amount_ton: amount_ton,
                        operation: 'set',
                        source: source || 'setBalance'
                    })];
            });
        });
    };
    /**
     * Проверка достаточности средств для операции
     */
    BalanceManager.prototype.hasSufficientBalance = function (user_id_2) {
        return __awaiter(this, arguments, void 0, function (user_id, required_uni, required_ton) {
            var balanceResult, current, sufficient, error_3;
            if (required_uni === void 0) { required_uni = 0; }
            if (required_ton === void 0) { required_ton = 0; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getUserBalance(user_id)];
                    case 1:
                        balanceResult = _a.sent();
                        if (!balanceResult.success) {
                            return [2 /*return*/, { sufficient: false, error: balanceResult.error }];
                        }
                        current = balanceResult.balance;
                        sufficient = current.balance_uni >= required_uni && current.balance_ton >= required_ton;
                        logger_1.logger.info('[BalanceManager] Проверка достаточности средств:', {
                            user_id: user_id,
                            required_uni: required_uni,
                            required_ton: required_ton,
                            current_uni: current.balance_uni,
                            current_ton: current.balance_ton,
                            sufficient: sufficient
                        });
                        return [2 /*return*/, { sufficient: sufficient, current: current }];
                    case 2:
                        error_3 = _a.sent();
                        logger_1.logger.error('[BalanceManager] Ошибка проверки достаточности средств:', {
                            user_id: user_id,
                            required_uni: required_uni,
                            required_ton: required_ton,
                            error: error_3 instanceof Error ? error_3.message : String(error_3)
                        });
                        return [2 /*return*/, { sufficient: false, error: 'Ошибка проверки баланса' }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Массовое обновление балансов (для batch операций)
     */
    BalanceManager.prototype.batchUpdateBalances = function (updates) {
        return __awaiter(this, void 0, void 0, function () {
            var results, successCount, failureCount, _i, updates_1, update, result, error_4, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        logger_1.logger.info('[BalanceManager] Массовое обновление балансов', { count: updates.length });
                        results = [];
                        successCount = 0;
                        failureCount = 0;
                        _i = 0, updates_1 = updates;
                        _a.label = 1;
                    case 1:
                        if (!(_i < updates_1.length)) return [3 /*break*/, 6];
                        update = updates_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.updateUserBalance(update)];
                    case 3:
                        result = _a.sent();
                        results.push({
                            user_id: update.user_id,
                            success: result.success,
                            error: result.error
                        });
                        if (result.success) {
                            successCount++;
                        }
                        else {
                            failureCount++;
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_4 = _a.sent();
                        results.push({
                            user_id: update.user_id,
                            success: false,
                            error: error_4 instanceof Error ? error_4.message : String(error_4)
                        });
                        failureCount++;
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6:
                        logger_1.logger.info('[BalanceManager] Массовое обновление завершено:', {
                            total: updates.length,
                            successCount: successCount,
                            failureCount: failureCount
                        });
                        return [2 /*return*/, {
                                success: failureCount === 0,
                                successCount: successCount,
                                failureCount: failureCount,
                                results: results
                            }];
                    case 7:
                        error_5 = _a.sent();
                        logger_1.logger.error('[BalanceManager] Критическая ошибка массового обновления:', {
                            error: error_5 instanceof Error ? error_5.message : String(error_5)
                        });
                        return [2 /*return*/, {
                                success: false,
                                successCount: 0,
                                failureCount: updates.length,
                                results: updates.map(function (u) { return ({ user_id: u.user_id, success: false, error: 'Системная ошибка' }); })
                            }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Валидация корректности баланса через транзакции
     * Пересчитывает баланс на основе всех транзакций пользователя
     */
    BalanceManager.prototype.validateAndRecalculateBalance = function (user_id) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, transactions, txError, calculatedUniBalance, calculatedTonBalance, _i, _b, tx, amount_uni, amount_ton, isIncome, currentBalanceResult, currentBalance, needsCorrection, correctionResult, error_6;
            var _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        _g.trys.push([0, 5, , 6]);
                        logger_1.logger.info('[BalanceManager] Валидация и пересчет баланса:', { user_id: user_id });
                        return [4 /*yield*/, supabaseClient_1.supabase
                                .from('transactions')
                                .select('type, amount_uni, amount_ton, description')
                                .eq('user_id', user_id)
                                .in('status', ['completed', 'confirmed'])];
                    case 1:
                        _a = _g.sent(), transactions = _a.data, txError = _a.error;
                        if (txError) {
                            logger_1.logger.error('[BalanceManager] Ошибка получения транзакций для валидации:', txError);
                            return [2 /*return*/, { success: false, corrected: false, error: 'Ошибка получения транзакций' }];
                        }
                        calculatedUniBalance = 0;
                        calculatedTonBalance = 0;
                        for (_i = 0, _b = transactions || []; _i < _b.length; _i++) {
                            tx = _b[_i];
                            amount_uni = parseFloat(tx.amount_uni || '0');
                            amount_ton = parseFloat(tx.amount_ton || '0');
                            isIncome = ((_c = tx.description) === null || _c === void 0 ? void 0 : _c.includes('доход')) ||
                                ((_d = tx.description) === null || _d === void 0 ? void 0 : _d.includes('награда')) ||
                                ((_e = tx.description) === null || _e === void 0 ? void 0 : _e.includes('бонус')) ||
                                ((_f = tx.description) === null || _f === void 0 ? void 0 : _f.includes('Airdrop')) ||
                                ['FARMING_REWARD', 'REFERRAL_REWARD', 'DAILY_BONUS', 'MISSION_REWARD'].includes(tx.type);
                            if (isIncome) {
                                calculatedUniBalance += amount_uni;
                                calculatedTonBalance += amount_ton;
                            }
                            else {
                                calculatedUniBalance -= amount_uni;
                                calculatedTonBalance -= amount_ton;
                            }
                        }
                        // Обеспечиваем неотрицательность баланса
                        calculatedUniBalance = Math.max(0, calculatedUniBalance);
                        calculatedTonBalance = Math.max(0, calculatedTonBalance);
                        return [4 /*yield*/, this.getUserBalance(user_id)];
                    case 2:
                        currentBalanceResult = _g.sent();
                        if (!currentBalanceResult.success) {
                            return [2 /*return*/, { success: false, corrected: false, error: currentBalanceResult.error }];
                        }
                        currentBalance = currentBalanceResult.balance;
                        needsCorrection = Math.abs(currentBalance.balance_uni - calculatedUniBalance) > 0.000001 ||
                            Math.abs(currentBalance.balance_ton - calculatedTonBalance) > 0.000001;
                        if (!needsCorrection) return [3 /*break*/, 4];
                        logger_1.logger.info('[BalanceManager] Обнаружено расхождение, корректируем баланс:', {
                            user_id: user_id,
                            current_uni: currentBalance.balance_uni,
                            calculated_uni: calculatedUniBalance,
                            current_ton: currentBalance.balance_ton,
                            calculated_ton: calculatedTonBalance
                        });
                        return [4 /*yield*/, this.setBalance(user_id, calculatedUniBalance, calculatedTonBalance, 'BalanceValidation')];
                    case 3:
                        correctionResult = _g.sent();
                        return [2 /*return*/, {
                                success: correctionResult.success,
                                corrected: true,
                                newBalance: correctionResult.newBalance,
                                error: correctionResult.error
                            }];
                    case 4:
                        logger_1.logger.info('[BalanceManager] Баланс корректен, коррекция не требуется:', { user_id: user_id });
                        return [2 /*return*/, {
                                success: true,
                                corrected: false,
                                newBalance: currentBalance
                            }];
                    case 5:
                        error_6 = _g.sent();
                        logger_1.logger.error('[BalanceManager] Критическая ошибка валидации баланса:', {
                            user_id: user_id,
                            error: error_6 instanceof Error ? error_6.message : String(error_6)
                        });
                        return [2 /*return*/, { success: false, corrected: false, error: 'Ошибка валидации баланса' }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Получить данные UNI farming для пользователя
     */
    BalanceManager.prototype.getUniFarmingData = function (user_id) {
        return __awaiter(this, void 0, void 0, function () {
            var uniFarmingRepository, data, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../modules/farming/UniFarmingRepository')); })];
                    case 1:
                        uniFarmingRepository = (_a.sent()).uniFarmingRepository;
                        return [4 /*yield*/, uniFarmingRepository.getByUserId(user_id.toString())];
                    case 2:
                        data = _a.sent();
                        return [2 /*return*/, data];
                    case 3:
                        error_7 = _a.sent();
                        logger_1.logger.error('[BalanceManager] Ошибка получения UNI farming данных:', error_7);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Обновить данные UNI farming
     */
    BalanceManager.prototype.updateUniFarmingData = function (user_id, data) {
        return __awaiter(this, void 0, void 0, function () {
            var uniFarmingRepository, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../modules/farming/UniFarmingRepository')); })];
                    case 1:
                        uniFarmingRepository = (_a.sent()).uniFarmingRepository;
                        return [4 /*yield*/, uniFarmingRepository.upsert(__assign({ user_id: user_id }, data))];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        error_8 = _a.sent();
                        logger_1.logger.error('[BalanceManager] Ошибка обновления UNI farming данных:', error_8);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Получить данные TON farming для пользователя
     */
    BalanceManager.prototype.getTonFarmingData = function (user_id) {
        return __awaiter(this, void 0, void 0, function () {
            var tonFarmingRepository, data, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../modules/boost/TonFarmingRepository')); })];
                    case 1:
                        tonFarmingRepository = (_a.sent()).tonFarmingRepository;
                        return [4 /*yield*/, tonFarmingRepository.getByUserId(user_id.toString())];
                    case 2:
                        data = _a.sent();
                        return [2 /*return*/, data];
                    case 3:
                        error_9 = _a.sent();
                        logger_1.logger.error('[BalanceManager] Ошибка получения TON farming данных:', error_9);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Обновить данные TON farming
     */
    BalanceManager.prototype.updateTonFarmingData = function (user_id, data) {
        return __awaiter(this, void 0, void 0, function () {
            var tonFarmingRepository, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../modules/boost/TonFarmingRepository')); })];
                    case 1:
                        tonFarmingRepository = (_a.sent()).tonFarmingRepository;
                        return [4 /*yield*/, tonFarmingRepository.upsert(__assign({ user_id: user_id }, data))];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        error_10 = _a.sent();
                        logger_1.logger.error('[BalanceManager] Ошибка обновления TON farming данных:', error_10);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Получить полные данные пользователя включая farming
     */
    BalanceManager.prototype.getUserFullData = function (user_id) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, balance, uniFarming, tonFarming, error_11;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Promise.all([
                                this.getUserBalance(user_id),
                                this.getUniFarmingData(user_id),
                                this.getTonFarmingData(user_id)
                            ])];
                    case 1:
                        _a = _b.sent(), balance = _a[0], uniFarming = _a[1], tonFarming = _a[2];
                        if (!balance.success) {
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, __assign(__assign({}, balance.balance), { uni_farming: uniFarming, ton_farming: tonFarming })];
                    case 2:
                        error_11 = _b.sent();
                        logger_1.logger.error('[BalanceManager] Ошибка получения полных данных пользователя:', error_11);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return BalanceManager;
}());
exports.BalanceManager = BalanceManager;
// Экспорт singleton instance для использования в других модулях
exports.balanceManager = BalanceManager.getInstance();
