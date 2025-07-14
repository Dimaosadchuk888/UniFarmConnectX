"use strict";
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
exports.WalletService = void 0;
var supabase_1 = require("../../core/supabase");
var logger_js_1 = require("../../core/logger.js");
var model_1 = require("./model");
var WalletService = /** @class */ (function () {
    function WalletService() {
    }
    WalletService.prototype.saveTonWallet = function (userId, walletAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, existingUser, checkError, _b, updatedUser, updateError, error_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(model_1.WALLET_TABLES.USERS)
                                .select('id, telegram_id')
                                .eq('ton_wallet_address', walletAddress)
                                .neq('id', userId)
                                .single()];
                    case 1:
                        _a = _c.sent(), existingUser = _a.data, checkError = _a.error;
                        if (existingUser) {
                            throw new Error('Этот адрес кошелька уже привязан к другому аккаунту');
                        }
                        return [4 /*yield*/, supabase_1.supabase
                                .from(model_1.WALLET_TABLES.USERS)
                                .update({
                                ton_wallet_address: walletAddress,
                                ton_wallet_verified: true,
                                ton_wallet_linked_at: new Date().toISOString()
                            })
                                .eq('id', userId)
                                .select()
                                .single()];
                    case 2:
                        _b = _c.sent(), updatedUser = _b.data, updateError = _b.error;
                        if (updateError) {
                            logger_js_1.logger.error('[WalletService] Ошибка сохранения TON адреса', {
                                userId: userId,
                                error: updateError.message
                            });
                            throw updateError;
                        }
                        // Логируем событие подключения кошелька
                        return [4 /*yield*/, this.logWalletConnection(userId, walletAddress)];
                    case 3:
                        // Логируем событие подключения кошелька
                        _c.sent();
                        return [2 /*return*/, updatedUser];
                    case 4:
                        error_1 = _c.sent();
                        logger_js_1.logger.error('[WalletService] Ошибка подключения TON кошелька', {
                            userId: userId,
                            walletAddress: walletAddress,
                            error: error_1 instanceof Error ? error_1.message : String(error_1)
                        });
                        throw error_1;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    WalletService.prototype.logWalletConnection = function (userId, address) {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(model_1.WALLET_TABLES.TRANSACTIONS)
                                .insert({
                                user_id: userId,
                                type: 'WALLET_CONNECT',
                                amount: 0,
                                currency: 'TON',
                                status: 'completed',
                                description: "TON wallet connected: ".concat(address),
                                created_at: new Date().toISOString()
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        logger_js_1.logger.warn('[WalletService] Не удалось записать событие подключения кошелька', {
                            userId: userId,
                            address: address,
                            error: error_2 instanceof Error ? error_2.message : String(error_2)
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    WalletService.prototype.getWalletDataByTelegramId = function (telegramId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, user, userError, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(model_1.WALLET_TABLES.USERS)
                                .select('*')
                                .eq('telegram_id', telegramId)
                                .single()];
                    case 1:
                        _a = _b.sent(), user = _a.data, userError = _a.error;
                        if (userError || !user) {
                            return [2 /*return*/, {
                                    uni_balance: 0,
                                    ton_balance: 0,
                                    total_earned: 0,
                                    total_spent: 0,
                                    transactions: []
                                }];
                        }
                        // Используем баланс из пользователя, так как таблица transactions может быть пустой
                        return [2 /*return*/, {
                                uni_balance: parseFloat(user.balance_uni || "0"),
                                ton_balance: parseFloat(user.balance_ton || "0"),
                                total_earned: parseFloat(user.uni_farming_balance || "0"), // Из farming баланса
                                total_spent: 0,
                                transactions: [] // Пока пустой массив, пока не настроена схема transactions
                            }];
                    case 2:
                        error_3 = _b.sent();
                        logger_js_1.logger.error('[WalletService] Ошибка получения данных кошелька', {
                            telegramId: telegramId,
                            error: error_3 instanceof Error ? error_3.message : String(error_3)
                        });
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    WalletService.prototype.getWalletDataByUserId = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, user, userError, error_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(model_1.WALLET_TABLES.USERS)
                                .select('*')
                                .eq('id', userId)
                                .single()];
                    case 1:
                        _a = _b.sent(), user = _a.data, userError = _a.error;
                        if (userError || !user) {
                            logger_js_1.logger.warn('[WalletService] Пользователь не найден по ID', { userId: userId });
                            return [2 /*return*/, {
                                    uni_balance: 0,
                                    ton_balance: 0,
                                    total_earned: 0,
                                    total_spent: 0,
                                    transactions: []
                                }];
                        }
                        // Используем баланс из пользователя
                        return [2 /*return*/, {
                                uni_balance: parseFloat(user.balance_uni || "0"),
                                ton_balance: parseFloat(user.balance_ton || "0"),
                                total_earned: parseFloat(user.uni_farming_balance || "0"),
                                total_spent: 0,
                                transactions: []
                            }];
                    case 2:
                        error_4 = _b.sent();
                        logger_js_1.logger.error('[WalletService] Ошибка получения данных кошелька по ID', {
                            userId: userId,
                            error: error_4 instanceof Error ? error_4.message : String(error_4)
                        });
                        throw error_4;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    WalletService.prototype.addUniFarmIncome = function (userId, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, user, getUserError, balanceManager, result, error_5;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(model_1.WALLET_TABLES.USERS)
                                .select('*')
                                .eq('id', userId)
                                .single()];
                    case 1:
                        _a = _b.sent(), user = _a.data, getUserError = _a.error;
                        if (getUserError || !user) {
                            logger_js_1.logger.error('[WalletService] Пользователь не найден', { userId: userId, error: getUserError === null || getUserError === void 0 ? void 0 : getUserError.message });
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../core/BalanceManager')); })];
                    case 2:
                        balanceManager = (_b.sent()).balanceManager;
                        return [4 /*yield*/, balanceManager.addBalance(userId, parseFloat(amount), 0, 'WalletService.updateUniBalance')];
                    case 3:
                        result = _b.sent();
                        if (!result.success) {
                            logger_js_1.logger.error('[WalletService] Ошибка обновления баланса UNI', {
                                userId: userId,
                                error: result.error
                            });
                            return [2 /*return*/, false];
                        }
                        // Обновляем дату последней активности отдельно
                        return [4 /*yield*/, supabase_1.supabase
                                .from(model_1.WALLET_TABLES.USERS)
                                .update({ checkin_last_date: new Date().toISOString() })
                                .eq('id', userId)];
                    case 4:
                        // Обновляем дату последней активности отдельно
                        _b.sent();
                        logger_js_1.logger.info('[WalletService] UNI баланс обновлен', {
                            userId: userId,
                            amount: amount,
                            newBalance: newBalance
                        });
                        return [2 /*return*/, true];
                    case 5:
                        error_5 = _b.sent();
                        logger_js_1.logger.error('[WalletService] Ошибка добавления UNI дохода', {
                            userId: userId,
                            amount: amount,
                            error: error_5 instanceof Error ? error_5.message : String(error_5)
                        });
                        return [2 /*return*/, false];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    WalletService.prototype.addTonFarmIncome = function (userId, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, user, getUserError, balanceManager, result, error_6;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(model_1.WALLET_TABLES.USERS)
                                .select('*')
                                .eq('id', userId)
                                .single()];
                    case 1:
                        _a = _b.sent(), user = _a.data, getUserError = _a.error;
                        if (getUserError || !user) {
                            logger_js_1.logger.error('[WalletService] Пользователь не найден', { userId: userId, error: getUserError === null || getUserError === void 0 ? void 0 : getUserError.message });
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../core/BalanceManager')); })];
                    case 2:
                        balanceManager = (_b.sent()).balanceManager;
                        return [4 /*yield*/, balanceManager.addBalance(userId, 0, parseFloat(amount), 'WalletService.updateTonBalance')];
                    case 3:
                        result = _b.sent();
                        if (!result.success) {
                            logger_js_1.logger.error('[WalletService] Ошибка обновления баланса TON', {
                                userId: userId,
                                error: result.error
                            });
                            return [2 /*return*/, false];
                        }
                        // Обновляем дату последней активности отдельно
                        return [4 /*yield*/, supabase_1.supabase
                                .from(model_1.WALLET_TABLES.USERS)
                                .update({ checkin_last_date: new Date().toISOString() })
                                .eq('id', userId)];
                    case 4:
                        // Обновляем дату последней активности отдельно
                        _b.sent();
                        logger_js_1.logger.info('[WalletService] TON баланс обновлен', {
                            userId: userId,
                            amount: amount,
                            newBalance: newBalance
                        });
                        return [2 /*return*/, true];
                    case 5:
                        error_6 = _b.sent();
                        logger_js_1.logger.error('[WalletService] Ошибка добавления TON дохода', {
                            userId: userId,
                            amount: amount,
                            error: error_6 instanceof Error ? error_6.message : String(error_6)
                        });
                        return [2 /*return*/, false];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    WalletService.prototype.getBalance = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, user, error, error_7;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(model_1.WALLET_TABLES.USERS)
                                .select('balance_uni, balance_ton')
                                .eq('id', userId)
                                .single()];
                    case 1:
                        _a = _b.sent(), user = _a.data, error = _a.error;
                        if (error || !user) {
                            logger_js_1.logger.error('[WalletService] Пользователь не найден', { userId: userId, error: error === null || error === void 0 ? void 0 : error.message });
                            return [2 /*return*/, { uni: 0, ton: 0 }];
                        }
                        return [2 /*return*/, {
                                uni: parseFloat(user.balance_uni || "0"),
                                ton: parseFloat(user.balance_ton || "0")
                            }];
                    case 2:
                        error_7 = _b.sent();
                        logger_js_1.logger.error('[WalletService] Ошибка получения баланса', {
                            userId: userId,
                            error: error_7 instanceof Error ? error_7.message : String(error_7)
                        });
                        return [2 /*return*/, { uni: 0, ton: 0 }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    WalletService.prototype.getTransactionHistory = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, page, limit) {
            var offset, _a, transactions, error, count, formattedTransactions, error_8;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 20; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        offset = (page - 1) * limit;
                        return [4 /*yield*/, supabase_1.supabase
                                .from(model_1.WALLET_TABLES.TRANSACTIONS)
                                .select('*', { count: 'exact' })
                                .eq('user_id', userId)
                                .order('created_at', { ascending: false })
                                .range(offset, offset + limit - 1)];
                    case 1:
                        _a = _b.sent(), transactions = _a.data, error = _a.error, count = _a.count;
                        if (error) {
                            logger_js_1.logger.error('[WalletService] Ошибка получения транзакций', {
                                userId: userId,
                                error: error.message
                            });
                            return [2 /*return*/, { transactions: [], total: 0, hasMore: false }];
                        }
                        formattedTransactions = (transactions || []).map(function (tx) {
                            // Определяем валюту более точно
                            var hasUniAmount = parseFloat(tx.amount_uni || '0') > 0;
                            var hasTonAmount = parseFloat(tx.amount_ton || '0') > 0;
                            // Если есть явное поле currency, используем его
                            // Иначе определяем по наличию суммы
                            var currency = tx.currency;
                            if (!currency) {
                                currency = hasUniAmount ? 'UNI' : (hasTonAmount ? 'TON' : 'UNI');
                            }
                            return {
                                id: tx.id,
                                type: tx.type,
                                amount: currency === 'UNI' ? (tx.amount_uni || '0') : (tx.amount_ton || '0'),
                                currency: currency,
                                status: tx.status || 'completed',
                                description: tx.description || '',
                                createdAt: tx.created_at,
                                timestamp: new Date(tx.created_at).getTime()
                            };
                        });
                        return [2 /*return*/, {
                                transactions: formattedTransactions,
                                total: count || 0,
                                hasMore: (count || 0) > offset + limit
                            }];
                    case 2:
                        error_8 = _b.sent();
                        logger_js_1.logger.error('[WalletService] Ошибка получения истории транзакций', {
                            userId: userId,
                            error: error_8 instanceof Error ? error_8.message : String(error_8)
                        });
                        return [2 /*return*/, { transactions: [], total: 0, hasMore: false }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Обрабатывает TON депозит
     */
    WalletService.prototype.processTonDeposit = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var user_id, ton_tx_hash, amount, wallet_address, existingTransaction, balanceResult, transactionResult, error_9;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 6, , 7]);
                        user_id = params.user_id, ton_tx_hash = params.ton_tx_hash, amount = params.amount, wallet_address = params.wallet_address;
                        logger_js_1.logger.info('[WalletService] Обработка TON депозита', {
                            userId: user_id,
                            amount: amount,
                            txHash: ton_tx_hash,
                            walletAddress: wallet_address
                        });
                        return [4 /*yield*/, supabase_1.supabase
                                .from('transactions')
                                .select('*')
                                .eq('description', ton_tx_hash)
                                .eq('type', 'DEPOSIT')
                                .single()];
                    case 1:
                        existingTransaction = _d.sent();
                        if (existingTransaction.data) {
                            logger_js_1.logger.warn('[WalletService] Депозит уже был обработан', {
                                userId: user_id,
                                txHash: ton_tx_hash
                            });
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Этот депозит уже был обработан'
                                }];
                        }
                        return [4 /*yield*/, BalanceManager.addBalance(user_id, amount, 'TON')];
                    case 2:
                        balanceResult = _d.sent();
                        if (!balanceResult.success) {
                            throw new Error('Не удалось обновить баланс');
                        }
                        return [4 /*yield*/, UnifiedTransactionService.createTransaction({
                                user_id: user_id,
                                amount: amount,
                                type: 'DEPOSIT',
                                currency: 'TON',
                                status: 'completed',
                                description: ton_tx_hash,
                                metadata: {
                                    source: 'ton_deposit',
                                    wallet_address: wallet_address,
                                    tx_hash: ton_tx_hash
                                }
                            })];
                    case 3:
                        transactionResult = _d.sent();
                        if (!!transactionResult.success) return [3 /*break*/, 5];
                        // Откатываем баланс в случае ошибки
                        return [4 /*yield*/, BalanceManager.subtractBalance(user_id, amount, 'TON')];
                    case 4:
                        // Откатываем баланс в случае ошибки
                        _d.sent();
                        throw new Error('Не удалось создать транзакцию');
                    case 5:
                        logger_js_1.logger.info('[WalletService] TON депозит успешно обработан', {
                            userId: user_id,
                            amount: amount,
                            transactionId: (_a = transactionResult.transaction) === null || _a === void 0 ? void 0 : _a.id
                        });
                        return [2 /*return*/, {
                                success: true,
                                transaction_id: (_c = (_b = transactionResult.transaction) === null || _b === void 0 ? void 0 : _b.id) === null || _c === void 0 ? void 0 : _c.toString()
                            }];
                    case 6:
                        error_9 = _d.sent();
                        logger_js_1.logger.error('[WalletService] Ошибка при обработке TON депозита', {
                            error: error_9 instanceof Error ? error_9.message : 'Unknown error',
                            params: params
                        });
                        return [2 /*return*/, {
                                success: false,
                                error: error_9 instanceof Error ? error_9.message : 'Неизвестная ошибка'
                            }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    WalletService.prototype.processWithdrawal = function (userId, amount, type, walletAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, user, getUserError, withdrawAmount, currentBalance, balanceField, commission, tonBalance, withdrawData, _b, withdrawRequest, withdrawError, balanceManager, amount_uni, amount_ton, result, transactionError, commissionError, error_10;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 10, , 11]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(model_1.WALLET_TABLES.USERS)
                                .select('*')
                                .eq('id', userId)
                                .single()];
                    case 1:
                        _a = _d.sent(), user = _a.data, getUserError = _a.error;
                        if (getUserError || !user) {
                            logger_js_1.logger.error('[WalletService] Пользователь не найден для вывода', { userId: userId, error: getUserError === null || getUserError === void 0 ? void 0 : getUserError.message });
                            return [2 /*return*/, { success: false, error: 'Пользователь не найден' }];
                        }
                        withdrawAmount = parseFloat(amount);
                        currentBalance = 0;
                        balanceField = '';
                        if (type === 'UNI') {
                            currentBalance = parseFloat(user.balance_uni || "0");
                            balanceField = 'balance_uni';
                        }
                        else if (type === 'TON') {
                            currentBalance = parseFloat(user.balance_ton || "0");
                            balanceField = 'balance_ton';
                        }
                        // Проверка минимальной суммы
                        if (type === 'TON' && withdrawAmount < 1) {
                            logger_js_1.logger.warn('[WalletService] Сумма вывода TON меньше минимальной', {
                                userId: userId,
                                requested: withdrawAmount,
                                minimum: 1
                            });
                            return [2 /*return*/, { success: false, error: 'Минимальная сумма вывода — 1 TON' }];
                        }
                        if (type === 'UNI' && withdrawAmount < 1000) {
                            logger_js_1.logger.warn('[WalletService] Сумма вывода UNI меньше минимальной', {
                                userId: userId,
                                requested: withdrawAmount,
                                minimum: 1000
                            });
                            return [2 /*return*/, { success: false, error: 'Минимальная сумма вывода — 1000 UNI' }];
                        }
                        commission = 0;
                        if (type === 'UNI') {
                            commission = Math.ceil(withdrawAmount / 1000) * 0.1;
                            tonBalance = parseFloat(user.balance_ton || "0");
                            // Добавляем детальное логирование для отладки
                            logger_js_1.logger.info('[WalletService] Проверка комиссии для вывода UNI', {
                                userId: userId,
                                withdrawAmount: withdrawAmount,
                                commission: commission,
                                tonBalance: tonBalance,
                                userBalanceTonRaw: user.balance_ton,
                                comparisonResult: tonBalance < commission,
                                userObject: {
                                    id: user.id,
                                    balance_uni: user.balance_uni,
                                    balance_ton: user.balance_ton
                                }
                            });
                            if (tonBalance < commission) {
                                logger_js_1.logger.warn('[WalletService] Недостаточно TON для оплаты комиссии', {
                                    userId: userId,
                                    commission: commission,
                                    available: tonBalance
                                });
                                return [2 /*return*/, { success: false, error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E TON \u0434\u043B\u044F \u043E\u043F\u043B\u0430\u0442\u044B \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u0438. \u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F ".concat(commission, " TON") }];
                            }
                        }
                        // Проверяем достаточность средств
                        if (currentBalance < withdrawAmount) {
                            logger_js_1.logger.warn('[WalletService] Недостаточно средств для вывода', {
                                userId: userId,
                                requested: withdrawAmount,
                                available: currentBalance,
                                type: type
                            });
                            return [2 /*return*/, { success: false, error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E: ".concat(currentBalance, " ").concat(type) }];
                        }
                        withdrawData = {
                            user_id: parseInt(userId),
                            telegram_id: ((_c = user.telegram_id) === null || _c === void 0 ? void 0 : _c.toString()) || '',
                            username: user.username || '',
                            status: 'pending',
                            created_at: new Date().toISOString()
                        };
                        // Добавляем специфичные для валюты поля
                        if (type === 'TON') {
                            withdrawData.amount_ton = withdrawAmount;
                            withdrawData.ton_wallet = walletAddress || '';
                        }
                        else if (type === 'UNI') {
                            // Для UNI сохраняем сумму в amount_ton (универсальное поле amount)
                            withdrawData.amount_ton = withdrawAmount;
                            withdrawData.ton_wallet = walletAddress || ''; // Адрес для UNI
                        }
                        return [4 /*yield*/, supabase_1.supabase
                                .from('withdraw_requests')
                                .insert(withdrawData)
                                .select()
                                .single()];
                    case 2:
                        _b = _d.sent(), withdrawRequest = _b.data, withdrawError = _b.error;
                        if (withdrawError) {
                            logger_js_1.logger.error('[WalletService] Ошибка создания заявки на вывод', {
                                userId: userId,
                                error: withdrawError.message
                            });
                            return [2 /*return*/, { success: false, error: 'Ошибка создания заявки на вывод' }];
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../core/BalanceManager')); })];
                    case 3:
                        balanceManager = (_d.sent()).balanceManager;
                        amount_uni = type === 'UNI' ? withdrawAmount : 0;
                        amount_ton = type === 'TON' ? withdrawAmount : commission;
                        return [4 /*yield*/, balanceManager.subtractBalance(userId, amount_uni, amount_ton, 'WalletService.withdraw')];
                    case 4:
                        result = _d.sent();
                        if (!!result.success) return [3 /*break*/, 6];
                        // Если не удалось списать баланс, отменяем заявку
                        return [4 /*yield*/, supabase_1.supabase
                                .from('withdraw_requests')
                                .update({ status: 'rejected' })
                                .eq('user_id', parseInt(userId))
                                .eq('status', 'pending')
                                .order('created_at', { ascending: false })
                                .limit(1)];
                    case 5:
                        // Если не удалось списать баланс, отменяем заявку
                        _d.sent();
                        logger_js_1.logger.error('[WalletService] Ошибка обновления баланса при выводе', {
                            userId: userId,
                            error: result.error
                        });
                        return [2 /*return*/, { success: false, error: result.error || 'Ошибка обновления баланса' }];
                    case 6: return [4 /*yield*/, supabase_1.supabase
                            .from(model_1.WALLET_TABLES.TRANSACTIONS)
                            .insert({
                            user_id: parseInt(userId),
                            type: 'withdrawal',
                            amount_uni: type === 'UNI' ? withdrawAmount.toString() : '0',
                            amount_ton: type === 'TON' ? withdrawAmount.toString() : '0',
                            currency: type,
                            status: 'pending', // Изменено с 'completed' на 'pending'
                            description: "\u0412\u044B\u0432\u043E\u0434 ".concat(withdrawAmount, " ").concat(type),
                            created_at: new Date().toISOString()
                        })];
                    case 7:
                        transactionError = (_d.sent()).error;
                        if (transactionError) {
                            logger_js_1.logger.warn('[WalletService] Ошибка создания транзакции (баланс обновлен)', {
                                userId: userId,
                                error: transactionError.message
                            });
                        }
                        if (!(type === 'UNI' && commission > 0)) return [3 /*break*/, 9];
                        return [4 /*yield*/, supabase_1.supabase
                                .from(model_1.WALLET_TABLES.TRANSACTIONS)
                                .insert({
                                user_id: parseInt(userId),
                                type: 'withdrawal_fee',
                                amount_uni: '0',
                                amount_ton: commission.toString(),
                                currency: 'TON',
                                status: 'completed',
                                description: "\u041A\u043E\u043C\u0438\u0441\u0441\u0438\u044F \u0437\u0430 \u0432\u044B\u0432\u043E\u0434 ".concat(withdrawAmount, " UNI"),
                                created_at: new Date().toISOString()
                            })];
                    case 8:
                        commissionError = (_d.sent()).error;
                        if (commissionError) {
                            logger_js_1.logger.warn('[WalletService] Ошибка создания транзакции комиссии', {
                                userId: userId,
                                error: commissionError.message
                            });
                        }
                        _d.label = 9;
                    case 9:
                        logger_js_1.logger.info('[WalletService] Вывод средств обработан успешно', {
                            userId: userId,
                            amount: withdrawAmount,
                            type: type,
                            isWithdrawRequest: type === 'TON',
                            newBalance: result.newBalance
                        });
                        return [2 /*return*/, true];
                    case 10:
                        error_10 = _d.sent();
                        logger_js_1.logger.error('[WalletService] Ошибка обработки вывода средств', {
                            userId: userId,
                            amount: amount,
                            type: type,
                            error: error_10 instanceof Error ? error_10.message : String(error_10)
                        });
                        return [2 /*return*/, { success: false, error: 'Внутренняя ошибка сервера при обработке вывода' }];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    WalletService.prototype.createDeposit = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var user_id, telegram_id, amount, currency, deposit_type, wallet_address, transactionId, _a, transaction, transactionError, transactionCreateError_1, error_11;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 6, , 7]);
                        user_id = params.user_id, telegram_id = params.telegram_id, amount = params.amount, currency = params.currency, deposit_type = params.deposit_type, wallet_address = params.wallet_address;
                        transactionId = "DEP_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
                        if (!(currency === 'UNI' && deposit_type === 'manual_deposit')) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.addUniFarmIncome(user_id.toString(), amount.toString())];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(model_1.WALLET_TABLES.TRANSACTIONS)
                                .insert({
                                user_id: user_id,
                                type: currency === 'UNI' ? 'UNI_DEPOSIT' : 'TON_DEPOSIT',
                                amount_uni: currency === 'UNI' ? amount.toString() : '0',
                                amount_ton: currency === 'TON' ? amount.toString() : '0',
                                description: "\u0414\u0435\u043F\u043E\u0437\u0438\u0442 ".concat(amount, " ").concat(currency, " (").concat(deposit_type, ")"),
                                created_at: new Date().toISOString()
                            })
                                .select()
                                .single()];
                    case 3:
                        _a = _b.sent(), transaction = _a.data, transactionError = _a.error;
                        if (transactionError) {
                            logger_js_1.logger.warn('[WalletService] Не удалось создать транзакцию, но депозит зачислен', {
                                user_id: user_id,
                                error: transactionError.message
                            });
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        transactionCreateError_1 = _b.sent();
                        logger_js_1.logger.warn('[WalletService] Ошибка создания транзакции, но основная операция выполнена', {
                            user_id: user_id,
                            error: transactionCreateError_1 instanceof Error ? transactionCreateError_1.message : String(transactionCreateError_1)
                        });
                        return [3 /*break*/, 5];
                    case 5:
                        logger_js_1.logger.info('[WalletService] Депозит создан', {
                            transaction_id: transactionId,
                            user_id: user_id,
                            telegram_id: telegram_id,
                            amount: amount,
                            currency: currency,
                            deposit_type: deposit_type,
                            wallet_address: wallet_address
                        });
                        return [2 /*return*/, {
                                transaction_id: transactionId,
                                success: true
                            }];
                    case 6:
                        error_11 = _b.sent();
                        logger_js_1.logger.error('[WalletService] Ошибка создания депозита', {
                            params: params,
                            error: error_11 instanceof Error ? error_11.message : String(error_11)
                        });
                        throw error_11;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Метод для списания средств с баланса пользователя
     * Используется при покупке Boost-пакетов через внутренний баланс
     * @param userId - ID пользователя
     * @param amount - Сумма для списания
     * @param currency - Валюта (UNI или TON)
     * @returns Результат операции
     */
    WalletService.prototype.withdrawFunds = function (userId, amount, currency) {
        return __awaiter(this, void 0, void 0, function () {
            var balance, currentBalance, result, error_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        logger_js_1.logger.info('[WalletService] withdrawFunds вызван', { userId: userId, amount: amount, currency: currency });
                        return [4 /*yield*/, this.getBalance(userId)];
                    case 1:
                        balance = _a.sent();
                        currentBalance = currency === 'TON' ? balance.ton : balance.uni;
                        if (currentBalance < amount) {
                            logger_js_1.logger.warn('[WalletService] Недостаточно средств для списания', {
                                userId: userId,
                                requested: amount,
                                available: currentBalance,
                                currency: currency
                            });
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E: ".concat(currentBalance, " ").concat(currency)
                                }];
                        }
                        return [4 /*yield*/, this.processWithdrawal(userId, amount.toString(), currency)];
                    case 2:
                        result = _a.sent();
                        if (result) {
                            logger_js_1.logger.info('[WalletService] Средства успешно списаны', { userId: userId, amount: amount, currency: currency });
                            return [2 /*return*/, { success: true }];
                        }
                        else {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Ошибка при списании средств'
                                }];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_12 = _a.sent();
                        logger_js_1.logger.error('[WalletService] Ошибка в withdrawFunds', {
                            userId: userId,
                            amount: amount,
                            currency: currency,
                            error: error_12 instanceof Error ? error_12.message : String(error_12)
                        });
                        return [2 /*return*/, {
                                success: false,
                                error: error_12 instanceof Error ? error_12.message : 'Неизвестная ошибка'
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    WalletService.prototype.transferFunds = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var from_user_id, to_user_id, amount, currency, fromBalance, currentBalance, balanceManager, withdrawResult, depositResult, transactionId, error_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 9, , 10]);
                        from_user_id = params.from_user_id, to_user_id = params.to_user_id, amount = params.amount, currency = params.currency;
                        return [4 /*yield*/, this.getBalance(from_user_id.toString())];
                    case 1:
                        fromBalance = _a.sent();
                        currentBalance = currency === 'UNI' ? fromBalance.uni : fromBalance.ton;
                        if (currentBalance < amount) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E: ".concat(currentBalance, " ").concat(currency)
                                }];
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../core/BalanceManager')); })];
                    case 2:
                        balanceManager = (_a.sent()).balanceManager;
                        return [4 /*yield*/, balanceManager.subtractBalance(from_user_id, currency === 'UNI' ? amount : 0, currency === 'TON' ? amount : 0, 'Internal transfer')];
                    case 3:
                        withdrawResult = _a.sent();
                        if (!withdrawResult.success) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: withdrawResult.error || 'Ошибка списания средств'
                                }];
                        }
                        return [4 /*yield*/, balanceManager.addBalance(to_user_id, currency === 'UNI' ? amount : 0, currency === 'TON' ? amount : 0, 'Internal transfer')];
                    case 4:
                        depositResult = _a.sent();
                        if (!!depositResult.success) return [3 /*break*/, 6];
                        // Откатываем транзакцию - возвращаем средства отправителю
                        return [4 /*yield*/, balanceManager.addBalance(from_user_id, currency === 'UNI' ? amount : 0, currency === 'TON' ? amount : 0, 'Transfer rollback')];
                    case 5:
                        // Откатываем транзакцию - возвращаем средства отправителю
                        _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: depositResult.error || 'Ошибка зачисления средств'
                            }];
                    case 6:
                        transactionId = "TRANSFER_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
                        // Транзакция списания
                        return [4 /*yield*/, supabase_1.supabase.from(model_1.WALLET_TABLES.TRANSACTIONS).insert({
                                user_id: from_user_id,
                                type: 'TRANSFER_OUT',
                                amount_uni: currency === 'UNI' ? amount.toString() : '0',
                                amount_ton: currency === 'TON' ? amount.toString() : '0',
                                description: "\u041F\u0435\u0440\u0435\u0432\u043E\u0434 ".concat(amount, " ").concat(currency, " \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E ID ").concat(to_user_id),
                                created_at: new Date().toISOString()
                            })];
                    case 7:
                        // Транзакция списания
                        _a.sent();
                        // Транзакция зачисления
                        return [4 /*yield*/, supabase_1.supabase.from(model_1.WALLET_TABLES.TRANSACTIONS).insert({
                                user_id: to_user_id,
                                type: 'TRANSFER_IN',
                                amount_uni: currency === 'UNI' ? amount.toString() : '0',
                                amount_ton: currency === 'TON' ? amount.toString() : '0',
                                description: "\u041F\u043E\u043B\u0443\u0447\u0435\u043D \u043F\u0435\u0440\u0435\u0432\u043E\u0434 ".concat(amount, " ").concat(currency, " \u043E\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F ID ").concat(from_user_id),
                                created_at: new Date().toISOString()
                            })];
                    case 8:
                        // Транзакция зачисления
                        _a.sent();
                        logger_js_1.logger.info('[WalletService] Перевод выполнен успешно', {
                            transaction_id: transactionId,
                            from_user_id: from_user_id,
                            to_user_id: to_user_id,
                            amount: amount,
                            currency: currency
                        });
                        return [2 /*return*/, {
                                success: true,
                                transaction_id: transactionId,
                                from_balance: withdrawResult.newBalance ?
                                    (currency === 'UNI' ? withdrawResult.newBalance.balance_uni : withdrawResult.newBalance.balance_ton) : 0,
                                to_balance: depositResult.newBalance ?
                                    (currency === 'UNI' ? depositResult.newBalance.balance_uni : depositResult.newBalance.balance_ton) : 0
                            }];
                    case 9:
                        error_13 = _a.sent();
                        logger_js_1.logger.error('[WalletService] Ошибка перевода средств', {
                            params: params,
                            error: error_13 instanceof Error ? error_13.message : String(error_13)
                        });
                        return [2 /*return*/, {
                                success: false,
                                error: 'Внутренняя ошибка при переводе'
                            }];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    WalletService.prototype.createInternalDeposit = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var user_id, amount, currency, type, description, balanceManager, result, transactionId, transactionError_1, error_14;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        user_id = params.user_id, amount = params.amount, currency = params.currency, type = params.type, description = params.description;
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../core/BalanceManager')); })];
                    case 1:
                        balanceManager = (_a.sent()).balanceManager;
                        return [4 /*yield*/, balanceManager.addBalance(user_id, currency === 'UNI' ? amount : 0, currency === 'TON' ? amount : 0, description)];
                    case 2:
                        result = _a.sent();
                        if (!result.success) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: result.error || 'Ошибка создания внутреннего депозита'
                                }];
                        }
                        transactionId = "INTERNAL_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, supabase_1.supabase.from(model_1.WALLET_TABLES.TRANSACTIONS).insert({
                                user_id: user_id,
                                type: type || 'INTERNAL_CREDIT',
                                amount_uni: currency === 'UNI' ? amount.toString() : '0',
                                amount_ton: currency === 'TON' ? amount.toString() : '0',
                                description: description,
                                status: 'completed',
                                created_at: new Date().toISOString()
                            })];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        transactionError_1 = _a.sent();
                        logger_js_1.logger.warn('[WalletService] Не удалось создать запись транзакции для внутреннего депозита', {
                            user_id: user_id,
                            error: transactionError_1
                        });
                        return [3 /*break*/, 6];
                    case 6:
                        logger_js_1.logger.info('[WalletService] Внутренний депозит создан', {
                            transaction_id: transactionId,
                            user_id: user_id,
                            amount: amount,
                            currency: currency,
                            type: type,
                            description: description
                        });
                        return [2 /*return*/, {
                                success: true,
                                transaction_id: transactionId,
                                new_balance: result.newBalance ?
                                    (currency === 'UNI' ? result.newBalance.balance_uni : result.newBalance.balance_ton) : 0
                            }];
                    case 7:
                        error_14 = _a.sent();
                        logger_js_1.logger.error('[WalletService] Ошибка создания внутреннего депозита', {
                            params: params,
                            error: error_14 instanceof Error ? error_14.message : String(error_14)
                        });
                        return [2 /*return*/, {
                                success: false,
                                error: 'Внутренняя ошибка при создании депозита'
                            }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    WalletService.prototype.createInternalWithdrawal = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var user_id, amount, currency, type, description, balanceManager, checkResult, result, transactionId, transactionError_2, error_15;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        user_id = params.user_id, amount = params.amount, currency = params.currency, type = params.type, description = params.description;
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../core/BalanceManager')); })];
                    case 1:
                        balanceManager = (_a.sent()).balanceManager;
                        return [4 /*yield*/, balanceManager.hasSufficientBalance(user_id, currency === 'UNI' ? amount : 0, currency === 'TON' ? amount : 0)];
                    case 2:
                        checkResult = _a.sent();
                        if (!checkResult.sufficient) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E: ".concat(checkResult.current ?
                                        (currency === 'UNI' ? checkResult.current.balance_uni : checkResult.current.balance_ton) : 0, " ").concat(currency)
                                }];
                        }
                        return [4 /*yield*/, balanceManager.subtractBalance(user_id, currency === 'UNI' ? amount : 0, currency === 'TON' ? amount : 0, description)];
                    case 3:
                        result = _a.sent();
                        if (!result.success) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: result.error || 'Ошибка создания внутреннего списания'
                                }];
                        }
                        transactionId = "INTERNAL_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, supabase_1.supabase.from(model_1.WALLET_TABLES.TRANSACTIONS).insert({
                                user_id: user_id,
                                type: type || 'INTERNAL_DEBIT',
                                amount_uni: currency === 'UNI' ? "-".concat(amount) : '0',
                                amount_ton: currency === 'TON' ? "-".concat(amount) : '0',
                                description: description,
                                status: 'completed',
                                created_at: new Date().toISOString()
                            })];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        transactionError_2 = _a.sent();
                        logger_js_1.logger.warn('[WalletService] Не удалось создать запись транзакции для внутреннего списания', {
                            user_id: user_id,
                            error: transactionError_2
                        });
                        return [3 /*break*/, 7];
                    case 7:
                        logger_js_1.logger.info('[WalletService] Внутреннее списание создано', {
                            transaction_id: transactionId,
                            user_id: user_id,
                            amount: amount,
                            currency: currency,
                            type: type,
                            description: description
                        });
                        return [2 /*return*/, {
                                success: true,
                                transaction_id: transactionId,
                                new_balance: result.newBalance ?
                                    (currency === 'UNI' ? result.newBalance.balance_uni : result.newBalance.balance_ton) : 0
                            }];
                    case 8:
                        error_15 = _a.sent();
                        logger_js_1.logger.error('[WalletService] Ошибка создания внутреннего списания', {
                            params: params,
                            error: error_15 instanceof Error ? error_15.message : String(error_15)
                        });
                        return [2 /*return*/, {
                                success: false,
                                error: 'Внутренняя ошибка при создании списания'
                            }];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    return WalletService;
}());
exports.WalletService = WalletService;
