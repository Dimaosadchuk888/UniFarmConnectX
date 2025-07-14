"use strict";
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
exports.transactionEnforcer = exports.TransactionEnforcer = void 0;
var supabase_1 = require("./supabase");
var logger_1 = require("./logger");
/**
 * TransactionEnforcer - Обеспечивает строгую политику транзакций
 * Все изменения балансов должны проходить через BalanceManager и создавать транзакции
 */
var TransactionEnforcer = /** @class */ (function () {
    function TransactionEnforcer() {
        this.policies = new Map();
        this.initializePolicies();
    }
    /**
     * Инициализация политик для разных типов операций
     */
    TransactionEnforcer.prototype.initializePolicies = function () {
        // UNI Farming депозиты
        this.policies.set('FARMING_DEPOSIT', {
            requireTransaction: true,
            transactionType: 'FARMING_DEPOSIT',
            enforceBalanceManager: true,
            allowDirectSQL: false
        });
        // UNI Farming доходы
        this.policies.set('FARMING_INCOME', {
            requireTransaction: true,
            transactionType: 'FARMING_INCOME',
            enforceBalanceManager: true,
            allowDirectSQL: false
        });
        // TON Boost покупки
        this.policies.set('BOOST_PURCHASE', {
            requireTransaction: true,
            transactionType: 'TRANSACTION',
            enforceBalanceManager: true,
            allowDirectSQL: false
        });
        // TON Boost доходы
        this.policies.set('TON_BOOST_INCOME', {
            requireTransaction: true,
            transactionType: 'FARMING_INCOME',
            enforceBalanceManager: true,
            allowDirectSQL: false
        });
        // Реферальные награды
        this.policies.set('REFERRAL_REWARD', {
            requireTransaction: true,
            transactionType: 'REFERRAL_REWARD',
            enforceBalanceManager: true,
            allowDirectSQL: false
        });
        // Награды за миссии
        this.policies.set('MISSION_REWARD', {
            requireTransaction: true,
            transactionType: 'MISSION_REWARD',
            enforceBalanceManager: true,
            allowDirectSQL: false
        });
        // Ежедневные бонусы
        this.policies.set('DAILY_BONUS', {
            requireTransaction: true,
            transactionType: 'DAILY_BONUS',
            enforceBalanceManager: true,
            allowDirectSQL: false
        });
    };
    /**
     * Проверяет соответствие операции политике
     */
    TransactionEnforcer.prototype.enforcePolicy = function (operationType, userId, amount, currency, description) {
        return __awaiter(this, void 0, void 0, function () {
            var policy, hasTransaction;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        policy = this.policies.get(operationType);
                        if (!policy) {
                            logger_1.logger.warn('[TransactionEnforcer] Неизвестный тип операции:', operationType);
                            return [2 /*return*/, { valid: true }]; // Разрешаем неизвестные операции
                        }
                        if (!policy.requireTransaction) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.checkTransactionExists(userId, amount, currency, policy.transactionType)];
                    case 1:
                        hasTransaction = _a.sent();
                        if (!hasTransaction) {
                            logger_1.logger.error('[TransactionEnforcer] Транзакция не создана для операции', {
                                operationType: operationType,
                                userId: userId,
                                amount: amount,
                                currency: currency
                            });
                            return [2 /*return*/, {
                                    valid: false,
                                    error: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438 \u0442\u0438\u043F\u0430 ".concat(policy.transactionType)
                                }];
                        }
                        _a.label = 2;
                    case 2: return [2 /*return*/, { valid: true }];
                }
            });
        });
    };
    /**
     * Проверяет существование транзакции
     */
    TransactionEnforcer.prototype.checkTransactionExists = function (userId, amount, currency, transactionType) {
        return __awaiter(this, void 0, void 0, function () {
            var fiveMinutesAgo, _a, data, error, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
                        return [4 /*yield*/, supabase_1.supabase
                                .from('transactions')
                                .select('id')
                                .eq('user_id', userId)
                                .eq('type', transactionType)
                                .eq('currency', currency)
                                .gte('created_at', fiveMinutesAgo)
                                .limit(1)];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('[TransactionEnforcer] Ошибка проверки транзакции:', error);
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, data && data.length > 0];
                    case 2:
                        error_1 = _b.sent();
                        logger_1.logger.error('[TransactionEnforcer] Исключение при проверке транзакции:', error_1);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Создает транзакцию согласно политике
     */
    TransactionEnforcer.prototype.createRequiredTransaction = function (operationType, userId, amount, currency, description, metadata) {
        return __awaiter(this, void 0, void 0, function () {
            var policy, transactionData, _a, data, error, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        policy = this.policies.get(operationType);
                        if (!policy || !policy.requireTransaction) {
                            return [2 /*return*/, { success: true }];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        transactionData = {
                            user_id: userId,
                            type: policy.transactionType,
                            amount: amount.toString(),
                            amount_uni: currency === 'UNI' ? amount.toString() : '0',
                            amount_ton: currency === 'TON' ? amount.toString() : '0',
                            currency: currency,
                            status: 'completed',
                            description: description,
                            metadata: metadata,
                            created_at: new Date().toISOString()
                        };
                        return [4 /*yield*/, supabase_1.supabase
                                .from('transactions')
                                .insert([transactionData])
                                .select()
                                .single()];
                    case 2:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_1.logger.error('[TransactionEnforcer] Ошибка создания транзакции:', error);
                            return [2 /*return*/, {
                                    success: false,
                                    error: error.message
                                }];
                        }
                        logger_1.logger.info('[TransactionEnforcer] Транзакция создана', {
                            transactionId: data.id,
                            operationType: operationType,
                            userId: userId,
                            amount: amount,
                            currency: currency
                        });
                        return [2 /*return*/, {
                                success: true,
                                transactionId: data.id
                            }];
                    case 3:
                        error_2 = _b.sent();
                        logger_1.logger.error('[TransactionEnforcer] Исключение при создании транзакции:', error_2);
                        return [2 /*return*/, {
                                success: false,
                                error: error_2 instanceof Error ? error_2.message : 'Unknown error'
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Проверяет и логирует прямые SQL обновления балансов
     */
    TransactionEnforcer.prototype.detectDirectSQLUpdates = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, users, error, _loop_1, _i, users_1, user, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from('users')
                                .select('id, balance_uni, balance_ton, updated_at')
                                .order('updated_at', { ascending: false })
                                .limit(10)];
                    case 1:
                        _a = _b.sent(), users = _a.data, error = _a.error;
                        if (error || !users) {
                            return [2 /*return*/];
                        }
                        _loop_1 = function (user) {
                            var transactions, transactionSumUni, transactionSumTon, balanceDiffUni, balanceDiffTon;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0: return [4 /*yield*/, supabase_1.supabase
                                            .from('transactions')
                                            .select('amount_uni, amount_ton, type')
                                            .eq('user_id', user.id)];
                                    case 1:
                                        transactions = (_c.sent()).data;
                                        if (!transactions)
                                            return [2 /*return*/, "continue"];
                                        transactionSumUni = 0;
                                        transactionSumTon = 0;
                                        transactions.forEach(function (tx) {
                                            var uniAmount = parseFloat(tx.amount_uni || '0');
                                            var tonAmount = parseFloat(tx.amount_ton || '0');
                                            // Депозиты и покупки вычитаются
                                            if (tx.type === 'FARMING_DEPOSIT' || tx.type === 'TRANSACTION') {
                                                transactionSumUni -= Math.abs(uniAmount);
                                                transactionSumTon -= Math.abs(tonAmount);
                                            }
                                            else {
                                                // Все остальное прибавляется
                                                transactionSumUni += uniAmount;
                                                transactionSumTon += tonAmount;
                                            }
                                        });
                                        balanceDiffUni = parseFloat(user.balance_uni || '0') - transactionSumUni;
                                        balanceDiffTon = parseFloat(user.balance_ton || '0') - transactionSumTon;
                                        // Если разница больше 1 (для погрешности), логируем
                                        if (Math.abs(balanceDiffUni) > 1 || Math.abs(balanceDiffTon) > 1) {
                                            logger_1.logger.warn('[TransactionEnforcer] Обнаружено расхождение баланса', {
                                                userId: user.id,
                                                balanceUni: user.balance_uni,
                                                transactionSumUni: transactionSumUni,
                                                diffUni: balanceDiffUni,
                                                balanceTon: user.balance_ton,
                                                transactionSumTon: transactionSumTon,
                                                diffTon: balanceDiffTon
                                            });
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        };
                        _i = 0, users_1 = users;
                        _b.label = 2;
                    case 2:
                        if (!(_i < users_1.length)) return [3 /*break*/, 5];
                        user = users_1[_i];
                        return [5 /*yield**/, _loop_1(user)];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_3 = _b.sent();
                        logger_1.logger.error('[TransactionEnforcer] Ошибка при проверке прямых SQL обновлений:', error_3);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    return TransactionEnforcer;
}());
exports.TransactionEnforcer = TransactionEnforcer;
exports.transactionEnforcer = new TransactionEnforcer();
