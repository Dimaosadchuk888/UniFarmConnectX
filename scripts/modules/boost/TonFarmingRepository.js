"use strict";
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
exports.tonFarmingRepository = exports.TonFarmingRepository = void 0;
var supabase_1 = require("../../core/supabase");
var logger_1 = require("../../core/logger");
var TransactionService_1 = require("../../core/TransactionService");
var TonFarmingRepository = /** @class */ (function () {
    function TonFarmingRepository() {
        this.tableName = 'ton_farming_data';
        this.useFallback = false;
        // Таблица ton_farming_data существует, fallback не нужен
        // this.checkTableExists();
        logger_1.logger.info('[TonFarmingRepository] Using ton_farming_data table directly');
    }
    TonFarmingRepository.prototype.checkTableExists = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(this.tableName)
                                .select('user_id')
                                .limit(1)];
                    case 1:
                        error = (_a.sent()).error;
                        if ((error === null || error === void 0 ? void 0 : error.code) === '42P01') {
                            this.useFallback = true;
                            logger_1.logger.info('[TonFarmingRepository] Using fallback mode - table does not exist');
                        }
                        else {
                            this.useFallback = false;
                            logger_1.logger.info('[TonFarmingRepository] Table exists, using direct mode');
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        this.useFallback = true;
                        logger_1.logger.warn('[TonFarmingRepository] Error checking table, using fallback:', error_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Получить данные TON farming для пользователя
     */
    TonFarmingRepository.prototype.getByUserId = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, newData, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, , 6]);
                        // Если используем fallback, сразу идем в users
                        if (this.useFallback) {
                            return [2 /*return*/, this.getByUserIdFallback(userId)];
                        }
                        return [4 /*yield*/, supabase_1.supabase
                                .from(this.tableName)
                                .select('*')
                                .eq('user_id', parseInt(userId))
                                .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (!error) return [3 /*break*/, 4];
                        if (error.code === '42P01') {
                            // Таблица не существует, используем fallback
                            this.useFallback = true;
                            return [2 /*return*/, this.getByUserIdFallback(userId)];
                        }
                        if (!(error.code === 'PGRST116')) return [3 /*break*/, 3];
                        newData = {
                            user_id: parseInt(userId),
                            farming_balance: '0',
                            farming_rate: '0.01',
                            farming_accumulated: '0',
                            boost_active: false,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };
                        return [4 /*yield*/, this.upsert(newData)];
                    case 2:
                        _b.sent();
                        return [2 /*return*/, this.getByUserId(userId)];
                    case 3:
                        logger_1.logger.error('[TonFarmingRepository] Error getting farming data:', error);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/, data];
                    case 5:
                        error_2 = _b.sent();
                        logger_1.logger.error('[TonFarmingRepository] Exception getting farming data:', error_2);
                        return [2 /*return*/, null];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Fallback метод для получения данных из таблицы users
     */
    TonFarmingRepository.prototype.getByUserIdFallback = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, user, error, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from('users')
                                .select('*')
                                .eq('id', userId)
                                .single()];
                    case 1:
                        _a = _b.sent(), user = _a.data, error = _a.error;
                        if (error || !user) {
                            return [2 /*return*/, null];
                        }
                        // Преобразуем данные из users в формат TonFarmingData
                        return [2 /*return*/, {
                                user_id: parseInt(userId),
                                farming_balance: user.ton_farming_balance || '0',
                                farming_rate: user.ton_farming_rate || '0.01',
                                farming_start_timestamp: user.ton_farming_start_timestamp,
                                farming_last_update: user.ton_farming_last_update,
                                farming_accumulated: user.ton_farming_accumulated || '0',
                                farming_last_claim: user.ton_farming_last_claim,
                                boost_active: user.ton_boost_active || false,
                                boost_package_id: user.ton_boost_package_id,
                                boost_expires_at: user.ton_boost_expires_at,
                                created_at: user.created_at,
                                updated_at: user.updated_at || user.created_at
                            }];
                    case 2:
                        error_3 = _b.sent();
                        logger_1.logger.error('[TonFarmingRepository] Exception in fallback:', error_3);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Создать или обновить данные TON farming
     */
    TonFarmingRepository.prototype.upsert = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var error, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        if (this.useFallback) {
                            return [2 /*return*/, this.upsertFallback(data)];
                        }
                        return [4 /*yield*/, supabase_1.supabase
                                .from(this.tableName)
                                .upsert(__assign(__assign({}, data), { updated_at: new Date().toISOString() }))];
                    case 1:
                        error = (_a.sent()).error;
                        if (error) {
                            if (error.code === '42P01') {
                                // Таблица не существует, используем fallback
                                this.useFallback = true;
                                return [2 /*return*/, this.upsertFallback(data)];
                            }
                            logger_1.logger.error('[TonFarmingRepository] Error upserting farming data:', error);
                            return [2 /*return*/, false];
                        }
                        // Синхронизируем с таблицей users
                        return [4 /*yield*/, this.syncToUsers(data)];
                    case 2:
                        // Синхронизируем с таблицей users
                        _a.sent();
                        return [2 /*return*/, true];
                    case 3:
                        error_4 = _a.sent();
                        logger_1.logger.error('[TonFarmingRepository] Exception upserting farming data:', error_4);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Синхронизирует данные из ton_farming_data в users
     */
    TonFarmingRepository.prototype.syncToUsers = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var updates, error, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!data.user_id)
                            return [2 /*return*/];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        updates = {};
                        if (data.farming_balance !== undefined)
                            updates.ton_farming_balance = data.farming_balance;
                        if (data.farming_rate !== undefined)
                            updates.ton_farming_rate = data.farming_rate;
                        if (data.farming_start_timestamp !== undefined)
                            updates.ton_farming_start_timestamp = data.farming_start_timestamp;
                        if (data.farming_last_update !== undefined)
                            updates.ton_farming_last_update = data.farming_last_update;
                        if (data.farming_accumulated !== undefined)
                            updates.ton_farming_accumulated = data.farming_accumulated;
                        if (data.farming_last_claim !== undefined)
                            updates.ton_farming_last_claim = data.farming_last_claim;
                        if (data.boost_active !== undefined)
                            updates.ton_boost_active = data.boost_active;
                        if (data.boost_package_id !== undefined)
                            updates.ton_boost_package_id = data.boost_package_id;
                        if (data.boost_expires_at !== undefined)
                            updates.ton_boost_expires_at = data.boost_expires_at;
                        if (Object.keys(updates).length === 0)
                            return [2 /*return*/];
                        return [4 /*yield*/, supabase_1.supabase
                                .from('users')
                                .update(updates)
                                .eq('id', data.user_id)];
                    case 2:
                        error = (_a.sent()).error;
                        if (error) {
                            logger_1.logger.warn('[TonFarmingRepository] Failed to sync to users:', error);
                        }
                        else {
                            logger_1.logger.info('[TonFarmingRepository] Synced to users table');
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_5 = _a.sent();
                        logger_1.logger.warn('[TonFarmingRepository] Exception syncing to users:', error_5);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Fallback метод для обновления данных в таблице users
     */
    TonFarmingRepository.prototype.upsertFallback = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var updates, error, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        updates = {};
                        if (data.farming_balance !== undefined)
                            updates.ton_farming_balance = data.farming_balance;
                        if (data.farming_rate !== undefined)
                            updates.ton_farming_rate = data.farming_rate;
                        if (data.farming_start_timestamp !== undefined)
                            updates.ton_farming_start_timestamp = data.farming_start_timestamp;
                        if (data.farming_last_update !== undefined)
                            updates.ton_farming_last_update = data.farming_last_update;
                        if (data.farming_accumulated !== undefined)
                            updates.ton_farming_accumulated = data.farming_accumulated;
                        if (data.farming_last_claim !== undefined)
                            updates.ton_farming_last_claim = data.farming_last_claim;
                        if (data.boost_active !== undefined)
                            updates.ton_boost_active = data.boost_active;
                        if (data.boost_package_id !== undefined)
                            updates.ton_boost_package_id = data.boost_package_id;
                        if (data.boost_expires_at !== undefined)
                            updates.ton_boost_expires_at = data.boost_expires_at;
                        return [4 /*yield*/, supabase_1.supabase
                                .from('users')
                                .update(updates)
                                .eq('id', data.user_id)];
                    case 1:
                        error = (_a.sent()).error;
                        if (error) {
                            logger_1.logger.error('[TonFarmingRepository] Error updating users table:', error);
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, true];
                    case 2:
                        error_6 = _a.sent();
                        logger_1.logger.error('[TonFarmingRepository] Exception in fallback upsert:', error_6);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Активировать boost пакет
     */
    TonFarmingRepository.prototype.activateBoost = function (userId, packageId, rate, expiresAt, depositAmount) {
        return __awaiter(this, void 0, void 0, function () {
            var existingRecord, newFarmingBalance, currentBalance, depositToAdd, upsertData, _a, upsertResult, error, _b, userData, userError, newFallbackBalance, currentBalance, depositToAdd, fallbackError, transactionService, transactionService, error_7;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 11, , 12]);
                        return [4 /*yield*/, this.getByUserId(parseInt(userId))];
                    case 1:
                        existingRecord = _c.sent();
                        newFarmingBalance = void 0;
                        if (existingRecord && existingRecord.farming_balance) {
                            currentBalance = parseFloat(existingRecord.farming_balance) || 0;
                            depositToAdd = depositAmount || 0;
                            newFarmingBalance = (currentBalance + depositToAdd).toString();
                            logger_1.logger.info('[TonFarmingRepository] Накопление депозита:', {
                                userId: userId,
                                currentBalance: currentBalance,
                                depositToAdd: depositToAdd,
                                newFarmingBalance: newFarmingBalance
                            });
                        }
                        else {
                            // Первый депозит
                            newFarmingBalance = depositAmount ? depositAmount.toString() : '0';
                            logger_1.logger.info('[TonFarmingRepository] Первый депозит:', {
                                userId: userId,
                                depositAmount: depositAmount,
                                newFarmingBalance: newFarmingBalance
                            });
                        }
                        upsertData = {
                            user_id: parseInt(userId),
                            boost_active: true,
                            boost_package_id: packageId,
                            farming_rate: rate.toString(),
                            farming_balance: newFarmingBalance, // Используем накопленный баланс
                            boost_expires_at: expiresAt || null,
                            farming_start_timestamp: new Date().toISOString(),
                            farming_last_update: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };
                        logger_1.logger.info('[TonFarmingRepository] Выполняем upsert с данными:', {
                            userId: userId,
                            upsertData: upsertData,
                            existingBalance: existingRecord === null || existingRecord === void 0 ? void 0 : existingRecord.farming_balance,
                            depositAmount: depositAmount
                        });
                        return [4 /*yield*/, supabase_1.supabase
                                .from(this.tableName)
                                .upsert(upsertData, {
                                onConflict: 'user_id'
                            })
                                .select()];
                    case 2:
                        _a = _c.sent(), upsertResult = _a.data, error = _a.error;
                        if (!error) return [3 /*break*/, 8];
                        logger_1.logger.error('[TonFarmingRepository] Ошибка upsert операции:', {
                            error: error,
                            errorCode: error.code,
                            errorMessage: error.message,
                            userId: userId,
                            packageId: packageId,
                            newFarmingBalance: newFarmingBalance
                        });
                        if (!(error.code === '42P01')) return [3 /*break*/, 7];
                        // Таблица не существует, используем fallback
                        this.useFallback = true;
                        return [4 /*yield*/, supabase_1.supabase
                                .from('users')
                                .select('ton_farming_balance')
                                .eq('id', userId)
                                .single()];
                    case 3:
                        _b = _c.sent(), userData = _b.data, userError = _b.error;
                        newFallbackBalance = void 0;
                        if (userData && userData.ton_farming_balance) {
                            currentBalance = parseFloat(userData.ton_farming_balance) || 0;
                            depositToAdd = depositAmount || 0;
                            newFallbackBalance = (currentBalance + depositToAdd).toString();
                        }
                        else {
                            // Первый депозит
                            newFallbackBalance = depositAmount ? depositAmount.toString() : '0';
                        }
                        return [4 /*yield*/, supabase_1.supabase
                                .from('users')
                                .update({
                                ton_boost_active: true,
                                ton_boost_package_id: packageId,
                                ton_farming_rate: rate.toString(),
                                ton_farming_balance: newFallbackBalance, // Используем накопленный баланс
                                ton_boost_expires_at: expiresAt || null,
                                ton_farming_start_timestamp: new Date().toISOString(),
                                ton_farming_last_update: new Date().toISOString()
                            })
                                .eq('id', userId)];
                    case 4:
                        fallbackError = (_c.sent()).error;
                        if (fallbackError) {
                            logger_1.logger.error('[TonFarmingRepository] Error activating boost in users table:', fallbackError);
                            return [2 /*return*/, false];
                        }
                        if (!(depositAmount && depositAmount > 0)) return [3 /*break*/, 6];
                        transactionService = new TransactionService_1.UnifiedTransactionService();
                        return [4 /*yield*/, transactionService.createTransaction({
                                user_id: parseInt(userId),
                                type: 'BOOST_PURCHASE', // Используем существующий тип
                                amount_ton: depositAmount,
                                currency: 'TON',
                                status: 'completed',
                                description: "TON Boost deposit (Package ".concat(packageId, ")"),
                                metadata: {
                                    original_type: 'TON_BOOST_DEPOSIT',
                                    boost_package_id: packageId,
                                    transaction_source: 'ton_farming_repository'
                                }
                            })];
                    case 5:
                        _c.sent();
                        logger_1.logger.info('[TonFarmingRepository] TON deposit transaction created (fallback)', {
                            userId: userId,
                            amount: depositAmount,
                            packageId: packageId
                        });
                        _c.label = 6;
                    case 6: return [2 /*return*/, true];
                    case 7:
                        logger_1.logger.error('[TonFarmingRepository] Error activating boost:', error);
                        return [2 /*return*/, false];
                    case 8:
                        // Логируем успешный upsert
                        logger_1.logger.info('[TonFarmingRepository] Upsert успешно выполнен:', {
                            userId: userId,
                            packageId: packageId,
                            newFarmingBalance: newFarmingBalance,
                            farming_rate: rate,
                            upsertResult: upsertResult
                        });
                        if (!(depositAmount && depositAmount > 0)) return [3 /*break*/, 10];
                        transactionService = new TransactionService_1.UnifiedTransactionService();
                        return [4 /*yield*/, transactionService.createTransaction({
                                user_id: parseInt(userId),
                                type: 'BOOST_PURCHASE', // Используем существующий тип
                                amount_ton: depositAmount,
                                currency: 'TON',
                                status: 'completed',
                                description: "TON Boost deposit (Package ".concat(packageId, ")"),
                                metadata: {
                                    original_type: 'TON_BOOST_DEPOSIT',
                                    boost_package_id: packageId,
                                    transaction_source: 'ton_farming_repository'
                                }
                            })];
                    case 9:
                        _c.sent();
                        logger_1.logger.info('[TonFarmingRepository] TON deposit transaction created', {
                            userId: userId,
                            amount: depositAmount,
                            packageId: packageId
                        });
                        _c.label = 10;
                    case 10: return [2 /*return*/, true];
                    case 11:
                        error_7 = _c.sent();
                        logger_1.logger.error('[TonFarmingRepository] Exception activating boost:', error_7);
                        return [2 /*return*/, false];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Деактивировать boost
     */
    TonFarmingRepository.prototype.deactivateBoost = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var error, fallbackError, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(this.tableName)
                                .update({
                                boost_active: false,
                                boost_package_id: null,
                                boost_expires_at: null,
                                updated_at: new Date().toISOString()
                            })
                                .eq('user_id', userId)];
                    case 1:
                        error = (_a.sent()).error;
                        if (!error) return [3 /*break*/, 4];
                        if (!(error.code === '42P01')) return [3 /*break*/, 3];
                        // Таблица не существует, используем fallback
                        this.useFallback = true;
                        return [4 /*yield*/, supabase_1.supabase
                                .from('users')
                                .update({
                                ton_boost_active: false,
                                ton_boost_package_id: null,
                                ton_boost_expires_at: null
                            })
                                .eq('id', userId)];
                    case 2:
                        fallbackError = (_a.sent()).error;
                        if (fallbackError) {
                            logger_1.logger.error('[TonFarmingRepository] Error deactivating boost in users table:', fallbackError);
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, true];
                    case 3:
                        logger_1.logger.error('[TonFarmingRepository] Error deactivating boost:', error);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/, true];
                    case 5:
                        error_8 = _a.sent();
                        logger_1.logger.error('[TonFarmingRepository] Exception deactivating boost:', error_8);
                        return [2 /*return*/, false];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Обновить накопленный доход
     */
    TonFarmingRepository.prototype.updateAccumulated = function (userId, accumulated, lastUpdate) {
        return __awaiter(this, void 0, void 0, function () {
            var error, fallbackError, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(this.tableName)
                                .update({
                                farming_accumulated: accumulated,
                                farming_last_update: lastUpdate,
                                updated_at: new Date().toISOString()
                            })
                                .eq('user_id', userId)];
                    case 1:
                        error = (_a.sent()).error;
                        if (!error) return [3 /*break*/, 4];
                        if (!(error.code === '42P01')) return [3 /*break*/, 3];
                        // Таблица не существует, используем fallback
                        this.useFallback = true;
                        return [4 /*yield*/, supabase_1.supabase
                                .from('users')
                                .update({
                                ton_farming_accumulated: accumulated,
                                ton_farming_last_update: lastUpdate
                            })
                                .eq('id', userId)];
                    case 2:
                        fallbackError = (_a.sent()).error;
                        if (fallbackError) {
                            logger_1.logger.error('[TonFarmingRepository] Error updating accumulated in users table:', fallbackError);
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, true];
                    case 3:
                        logger_1.logger.error('[TonFarmingRepository] Error updating accumulated:', error);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/, true];
                    case 5:
                        error_9 = _a.sent();
                        logger_1.logger.error('[TonFarmingRepository] Exception updating accumulated:', error_9);
                        return [2 /*return*/, false];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Получить всех активных boost пользователей
     */
    TonFarmingRepository.prototype.getActiveBoostUsers = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, error_10;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(this.tableName)
                                .select('*')
                                .eq('boost_active', true)];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            if (error.code === '42P01') {
                                // Таблица не существует, используем fallback
                                this.useFallback = true;
                                return [2 /*return*/, this.getActiveBoostUsersFallback()];
                            }
                            logger_1.logger.error('[TonFarmingRepository] Error getting active boost users:', error);
                            return [2 /*return*/, []];
                        }
                        return [2 /*return*/, data || []];
                    case 2:
                        error_10 = _b.sent();
                        logger_1.logger.error('[TonFarmingRepository] Exception getting active boost users:', error_10);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Fallback метод для получения активных boost пользователей из таблицы users
     */
    TonFarmingRepository.prototype.getActiveBoostUsersFallback = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, users, error, error_11;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from('users')
                                .select('*')
                                .eq('ton_boost_active', true)];
                    case 1:
                        _a = _b.sent(), users = _a.data, error = _a.error;
                        if (error || !users) {
                            return [2 /*return*/, []];
                        }
                        // Преобразуем данные из users в формат TonFarmingData
                        return [2 /*return*/, users.map(function (user) { return ({
                                user_id: user.id,
                                farming_balance: user.ton_farming_balance || '0',
                                farming_rate: user.ton_farming_rate || '0.01',
                                farming_start_timestamp: user.ton_farming_start_timestamp,
                                farming_last_update: user.ton_farming_last_update,
                                farming_accumulated: user.ton_farming_accumulated || '0',
                                farming_last_claim: user.ton_farming_last_claim,
                                boost_active: user.ton_boost_active || false,
                                boost_package_id: user.ton_boost_package_id,
                                boost_expires_at: user.ton_boost_expires_at,
                                created_at: user.created_at,
                                updated_at: user.updated_at || user.created_at
                            }); })];
                    case 2:
                        error_11 = _b.sent();
                        logger_1.logger.error('[TonFarmingRepository] Exception in fallback getActiveBoostUsers:', error_11);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Забрать накопленный доход
     */
    TonFarmingRepository.prototype.claimAccumulated = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var data, accumulated, error, error_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getByUserId(userId)];
                    case 1:
                        data = _a.sent();
                        if (!data)
                            return [2 /*return*/, '0'];
                        accumulated = data.farming_accumulated || '0';
                        return [4 /*yield*/, supabase_1.supabase
                                .from(this.tableName)
                                .update({
                                farming_accumulated: '0',
                                farming_last_claim: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                                .eq('user_id', userId)];
                    case 2:
                        error = (_a.sent()).error;
                        if (error) {
                            logger_1.logger.error('[TonFarmingRepository] Error claiming accumulated:', error);
                            return [2 /*return*/, '0'];
                        }
                        return [2 /*return*/, accumulated];
                    case 3:
                        error_12 = _a.sent();
                        logger_1.logger.error('[TonFarmingRepository] Exception claiming accumulated:', error_12);
                        return [2 /*return*/, '0'];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return TonFarmingRepository;
}());
exports.TonFarmingRepository = TonFarmingRepository;
exports.tonFarmingRepository = new TonFarmingRepository();
