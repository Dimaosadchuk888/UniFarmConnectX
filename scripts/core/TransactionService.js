"use strict";
/**
 * Унифицированный сервис для управления транзакциями во всех модулях UniFarm
 * Обеспечивает единообразное создание, обновление и получение транзакций
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
exports.transactionService = exports.UnifiedTransactionService = void 0;
var supabaseClient_1 = require("./supabaseClient");
var logger_1 = require("./logger");
// Маппинг расширенных типов на поддерживаемые базой данных
var TRANSACTION_TYPE_MAPPING = {
    'FARMING_REWARD': 'FARMING_REWARD',
    'FARMING_DEPOSIT': 'FARMING_DEPOSIT', // Добавлен прямой маппинг для депозитов
    'REFERRAL_REWARD': 'REFERRAL_REWARD',
    'MISSION_REWARD': 'MISSION_REWARD',
    'DAILY_BONUS': 'DAILY_BONUS',
    // Маппинг расширенных типов на базовые
    'TON_BOOST_INCOME': 'FARMING_REWARD', // TON Boost доходы → FARMING_REWARD
    'UNI_DEPOSIT': 'FARMING_REWARD', // UNI депозиты → FARMING_REWARD
    'TON_DEPOSIT': 'FARMING_REWARD', // TON депозиты → FARMING_REWARD
    'UNI_WITHDRAWAL': 'FARMING_REWARD', // Выводы → FARMING_REWARD (с отрицательной суммой)
    'TON_WITHDRAWAL': 'FARMING_REWARD', // Выводы → FARMING_REWARD (с отрицательной суммой)
    'BOOST_PURCHASE': 'FARMING_REWARD', // Покупки boost → FARMING_REWARD
    'AIRDROP_REWARD': 'DAILY_BONUS' // Airdrop награды → DAILY_BONUS
};
var UnifiedTransactionService = /** @class */ (function () {
    function UnifiedTransactionService() {
    }
    UnifiedTransactionService.getInstance = function () {
        if (!UnifiedTransactionService.instance) {
            UnifiedTransactionService.instance = new UnifiedTransactionService();
        }
        return UnifiedTransactionService.instance;
    };
    /**
     * Создание транзакции с автоматическим обновлением баланса
     */
    UnifiedTransactionService.prototype.createTransaction = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var user_id, type, _a, amount_uni, _b, amount_ton, currency, _c, status_1, _d, description, _e, metadata, source_user_id, dbTransactionType, enhancedDescription, amount, transactionCurrency, _f, transaction, txError, error_1;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        _g.trys.push([0, 4, , 5]);
                        user_id = data.user_id, type = data.type, _a = data.amount_uni, amount_uni = _a === void 0 ? 0 : _a, _b = data.amount_ton, amount_ton = _b === void 0 ? 0 : _b, currency = data.currency, _c = data.status, status_1 = _c === void 0 ? 'completed' : _c, _d = data.description, description = _d === void 0 ? '' : _d, _e = data.metadata, metadata = _e === void 0 ? {} : _e, source_user_id = data.source_user_id;
                        // Валидация данных
                        if (!user_id || !type) {
                            return [2 /*return*/, { success: false, error: 'Отсутствуют обязательные поля: user_id, type' }];
                        }
                        if (amount_uni === 0 && amount_ton === 0) {
                            return [2 /*return*/, { success: false, error: 'Сумма транзакции должна быть больше 0' }];
                        }
                        dbTransactionType = TRANSACTION_TYPE_MAPPING[type];
                        enhancedDescription = description || this.generateDescription(type, amount_uni, amount_ton);
                        amount = amount_uni > 0 ? amount_uni : amount_ton;
                        transactionCurrency = amount_uni > 0 ? 'UNI' : 'TON';
                        return [4 /*yield*/, supabaseClient_1.supabase
                                .from('transactions')
                                .insert({
                                user_id: user_id,
                                type: dbTransactionType, // Используем преобразованный тип
                                amount: amount.toString(), // Используем новое поле amount
                                amount_uni: amount_uni.toString(),
                                amount_ton: amount_ton.toString(),
                                currency: currency || transactionCurrency, // Используем переданную валюту или определяем автоматически
                                status: status_1,
                                description: enhancedDescription,
                                metadata: __assign(__assign({}, metadata), { original_type: (metadata === null || metadata === void 0 ? void 0 : metadata.original_type) || type }), // Приоритет metadata.original_type, fallback на type
                                source_user_id: source_user_id || user_id,
                                created_at: new Date().toISOString()
                            })
                                .select()
                                .single()];
                    case 1:
                        _f = _g.sent(), transaction = _f.data, txError = _f.error;
                        if (txError) {
                            logger_1.logger.error('[UnifiedTransactionService] Ошибка создания транзакции:', { error: txError.message, data: data });
                            return [2 /*return*/, { success: false, error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0438: ".concat(txError.message) }];
                        }
                        if (!this.shouldUpdateBalance(type)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.updateUserBalance(user_id, amount_uni, amount_ton, dbTransactionType)];
                    case 2:
                        _g.sent();
                        _g.label = 3;
                    case 3:
                        logger_1.logger.info('[UnifiedTransactionService] Транзакция создана:', {
                            transaction_id: transaction.id,
                            user_id: user_id,
                            type: type,
                            amount_uni: amount_uni,
                            amount_ton: amount_ton
                        });
                        return [2 /*return*/, { success: true, transaction_id: transaction.id }];
                    case 4:
                        error_1 = _g.sent();
                        logger_1.logger.error('[UnifiedTransactionService] Критическая ошибка создания транзакции:', error_1);
                        return [2 /*return*/, { success: false, error: 'Внутренняя ошибка сервера' }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Получение истории транзакций пользователя с унифицированной структурой
     */
    UnifiedTransactionService.prototype.getUserTransactions = function (user_id_1) {
        return __awaiter(this, arguments, void 0, function (user_id, page, limit, filters) {
            var query, offset, _a, transactions, error, count, unifiedTransactions, filteredTransactions, total, totalPages, error_2;
            var _this = this;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 20; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        logger_1.logger.info('[UnifiedTransactionService] Запрос транзакций для user_id:', {
                            user_id: user_id,
                            filters: filters
                        });
                        query = supabaseClient_1.supabase
                            .from('transactions')
                            .select('*', { count: 'exact' })
                            .eq('user_id', user_id)
                            .order('created_at', { ascending: false });
                        // Применяем фильтры
                        if (filters === null || filters === void 0 ? void 0 : filters.type) {
                            query = query.eq('type', filters.type);
                        }
                        if (filters === null || filters === void 0 ? void 0 : filters.status) {
                            query = query.eq('status', filters.status);
                        }
                        offset = (page - 1) * limit;
                        query = query.range(offset, offset + limit - 1);
                        return [4 /*yield*/, query];
                    case 1:
                        _a = _b.sent(), transactions = _a.data, error = _a.error, count = _a.count;
                        if (error) {
                            logger_1.logger.error('[UnifiedTransactionService] Ошибка получения транзакций:', error);
                            return [2 /*return*/, {
                                    transactions: [],
                                    total: 0,
                                    page: page,
                                    limit: limit,
                                    totalPages: 0,
                                    hasMore: false
                                }];
                        }
                        unifiedTransactions = (transactions === null || transactions === void 0 ? void 0 : transactions.map(function (tx) { return _this.formatTransactionResponse(tx); })) || [];
                        filteredTransactions = (filters === null || filters === void 0 ? void 0 : filters.currency) && filters.currency !== 'ALL'
                            ? unifiedTransactions.filter(function (tx) { return tx.currency === filters.currency; })
                            : unifiedTransactions;
                        total = count || 0;
                        totalPages = Math.ceil(total / limit);
                        return [2 /*return*/, {
                                transactions: filteredTransactions,
                                total: total,
                                page: page,
                                limit: limit,
                                totalPages: totalPages,
                                hasMore: page < totalPages
                            }];
                    case 2:
                        error_2 = _b.sent();
                        logger_1.logger.error('[UnifiedTransactionService] Критическая ошибка получения транзакций:', error_2);
                        return [2 /*return*/, {
                                transactions: [],
                                total: 0,
                                page: page,
                                limit: limit,
                                totalPages: 0,
                                hasMore: false
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Форматирование транзакции в унифицированный формат для frontend
     */
    UnifiedTransactionService.prototype.formatTransactionResponse = function (tx) {
        // Используем новое поле amount, если оно есть
        var amount = tx.amount ? parseFloat(tx.amount) : 0;
        // Определяем валюту из поля currency или на основе amount_uni/amount_ton
        var currency = tx.currency || 'UNI';
        // Fallback для старых транзакций без поля amount
        if (!tx.amount || amount === 0) {
            var amount_uni = parseFloat(tx.amount_uni || '0');
            var amount_ton = parseFloat(tx.amount_ton || '0');
            currency = amount_uni > 0 ? 'UNI' : 'TON';
            var fallbackAmount = currency === 'UNI' ? amount_uni : amount_ton;
            return {
                id: tx.id,
                type: tx.type,
                amount: fallbackAmount,
                currency: currency,
                status: tx.status,
                description: tx.description || '',
                createdAt: tx.created_at,
                timestamp: new Date(tx.created_at).getTime()
            };
        }
        return {
            id: tx.id,
            type: tx.type,
            amount: amount,
            currency: currency,
            status: tx.status,
            description: tx.description || '',
            createdAt: tx.created_at,
            timestamp: new Date(tx.created_at).getTime()
        };
    };
    /**
     * Генерирует описание по умолчанию для транзакции
     */
    UnifiedTransactionService.prototype.generateDescription = function (type, amount_uni, amount_ton) {
        var currency = amount_uni > 0 ? 'UNI' : 'TON';
        var amount = amount_uni > 0 ? amount_uni : amount_ton;
        switch (type) {
            case 'TON_BOOST_INCOME':
                return "TON Boost \u0434\u043E\u0445\u043E\u0434: ".concat(amount, " ").concat(currency);
            case 'UNI_DEPOSIT':
                return "\u041F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 UNI: ".concat(amount);
            case 'TON_DEPOSIT':
                return "\u041F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 TON: ".concat(amount);
            case 'UNI_WITHDRAWAL':
                return "\u0412\u044B\u0432\u043E\u0434 UNI: ".concat(amount);
            case 'TON_WITHDRAWAL':
                return "\u0412\u044B\u0432\u043E\u0434 TON: ".concat(amount);
            case 'BOOST_PURCHASE':
                return "\u041F\u043E\u043A\u0443\u043F\u043A\u0430 Boost \u043F\u0430\u043A\u0435\u0442\u0430: ".concat(amount, " ").concat(currency);
            case 'AIRDROP_REWARD':
                return "Airdrop \u043D\u0430\u0433\u0440\u0430\u0434\u0430: ".concat(amount, " ").concat(currency);
            default:
                return "".concat(type, ": ").concat(amount, " ").concat(currency);
        }
    };
    /**
     * Определяет, нужно ли обновлять баланс пользователя для данного типа транзакции
     */
    UnifiedTransactionService.prototype.shouldUpdateBalance = function (type) {
        var incomeTypes = [
            'FARMING_REWARD',
            'REFERRAL_REWARD',
            'MISSION_REWARD',
            'DAILY_BONUS',
            'TON_BOOST_INCOME',
            'UNI_DEPOSIT',
            'TON_DEPOSIT',
            'AIRDROP_REWARD'
        ];
        return incomeTypes.includes(type);
    };
    /**
     * Обновление баланса пользователя через централизованный BalanceManager
     * УСТРАНЕНО ДУБЛИРОВАНИЕ: делегирует на BalanceManager
     */
    UnifiedTransactionService.prototype.updateUserBalance = function (user_id, amount_uni, amount_ton, type) {
        return __awaiter(this, void 0, void 0, function () {
            var balanceManager, operation, result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('./BalanceManager')); })];
                    case 1:
                        balanceManager = (_a.sent()).balanceManager;
                        operation = this.isWithdrawalType(type) ? 'subtract' : 'add';
                        return [4 /*yield*/, balanceManager.updateUserBalance({
                                user_id: user_id,
                                amount_uni: amount_uni,
                                amount_ton: amount_ton,
                                operation: operation,
                                source: 'UnifiedTransactionService'
                            })];
                    case 2:
                        result = _a.sent();
                        if (!result.success) {
                            logger_1.logger.error('[UnifiedTransactionService] Ошибка обновления баланса через BalanceManager:', {
                                user_id: user_id,
                                error: result.error
                            });
                        }
                        else {
                            logger_1.logger.info('[UnifiedTransactionService] Баланс обновлен через BalanceManager:', {
                                user_id: user_id,
                                amount_uni: amount_uni,
                                amount_ton: amount_ton,
                                operation: operation
                            });
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        logger_1.logger.error('[UnifiedTransactionService] Критическая ошибка делегирования обновления баланса:', error_3);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Проверяет, является ли тип транзакции выводом средств
     */
    UnifiedTransactionService.prototype.isWithdrawalType = function (type) {
        var withdrawalTypes = [
            'UNI_WITHDRAWAL',
            'TON_WITHDRAWAL',
            'BOOST_PURCHASE'
        ];
        return withdrawalTypes.includes(type);
    };
    return UnifiedTransactionService;
}());
exports.UnifiedTransactionService = UnifiedTransactionService;
// Экспорт singleton instance для использования в других модулях
exports.transactionService = UnifiedTransactionService.getInstance();
