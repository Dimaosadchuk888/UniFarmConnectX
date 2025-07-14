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
exports.uniFarmingRepository = exports.UniFarmingRepository = void 0;
var supabase_1 = require("../../core/supabase");
var logger_1 = require("../../core/logger");
var UniFarmingRepository = /** @class */ (function () {
    function UniFarmingRepository() {
        this.tableName = 'uni_farming_data';
        this.useFallback = false;
    }
    /**
     * Получить данные UNI farming для пользователя
     */
    UniFarmingRepository.prototype.getByUserId = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(this.tableName)
                                .select('*')
                                .eq('user_id', userId)
                                .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            if (error.code === '42P01') {
                                // Таблица не существует, используем fallback
                                this.useFallback = true;
                                return [2 /*return*/, this.getByUserIdFallback(userId)];
                            }
                            if (error.code !== 'PGRST116') {
                                logger_1.logger.error('[UniFarmingRepository] Error getting farming data:', error);
                            }
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, data];
                    case 2:
                        error_1 = _b.sent();
                        logger_1.logger.error('[UniFarmingRepository] Exception getting farming data:', error_1);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Fallback метод для получения данных из таблицы users
     */
    UniFarmingRepository.prototype.getByUserIdFallback = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, user, error, error_2;
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
                        // Преобразуем данные из users в формат UniFarmingData
                        return [2 /*return*/, {
                                user_id: parseInt(userId),
                                deposit_amount: user.uni_deposit_amount || '0',
                                farming_balance: user.uni_farming_balance || '0',
                                farming_rate: user.uni_farming_rate || '0.01',
                                farming_start_timestamp: user.uni_farming_start_timestamp,
                                farming_last_update: user.uni_farming_last_update,
                                farming_deposit: user.uni_farming_deposit || '0',
                                is_active: user.uni_farming_active || false,
                                created_at: user.created_at,
                                updated_at: user.updated_at || user.created_at
                            }];
                    case 2:
                        error_2 = _b.sent();
                        logger_1.logger.error('[UniFarmingRepository] Exception in fallback:', error_2);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Создать или обновить данные UNI farming
     */
    UniFarmingRepository.prototype.upsert = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var error, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
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
                            logger_1.logger.error('[UniFarmingRepository] Error upserting farming data:', error);
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, true];
                    case 2:
                        error_3 = _a.sent();
                        logger_1.logger.error('[UniFarmingRepository] Exception upserting farming data:', error_3);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Fallback метод для обновления данных в таблице users
     */
    UniFarmingRepository.prototype.upsertFallback = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var updates, error, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        updates = {};
                        if (data.deposit_amount !== undefined)
                            updates.uni_deposit_amount = data.deposit_amount;
                        if (data.farming_balance !== undefined)
                            updates.uni_farming_balance = data.farming_balance;
                        if (data.farming_rate !== undefined)
                            updates.uni_farming_rate = data.farming_rate;
                        if (data.farming_start_timestamp !== undefined)
                            updates.uni_farming_start_timestamp = data.farming_start_timestamp;
                        if (data.farming_last_update !== undefined)
                            updates.uni_farming_last_update = data.farming_last_update;
                        if (data.farming_deposit !== undefined)
                            updates.uni_farming_deposit = data.farming_deposit;
                        if (data.is_active !== undefined)
                            updates.uni_farming_active = data.is_active;
                        return [4 /*yield*/, supabase_1.supabase
                                .from('users')
                                .update(updates)
                                .eq('id', data.user_id)];
                    case 1:
                        error = (_a.sent()).error;
                        if (error) {
                            logger_1.logger.error('[UniFarmingRepository] Error updating users table:', error);
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, true];
                    case 2:
                        error_4 = _a.sent();
                        logger_1.logger.error('[UniFarmingRepository] Exception in fallback upsert:', error_4);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Обновить активность farming
     */
    UniFarmingRepository.prototype.updateActivity = function (userId, isActive) {
        return __awaiter(this, void 0, void 0, function () {
            var error, fallbackError, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(this.tableName)
                                .update({
                                is_active: isActive,
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
                                .update({ uni_farming_active: isActive })
                                .eq('id', userId)];
                    case 2:
                        fallbackError = (_a.sent()).error;
                        if (fallbackError) {
                            logger_1.logger.error('[UniFarmingRepository] Error updating activity in users table:', fallbackError);
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, true];
                    case 3:
                        logger_1.logger.error('[UniFarmingRepository] Error updating activity:', error);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/, true];
                    case 5:
                        error_5 = _a.sent();
                        logger_1.logger.error('[UniFarmingRepository] Exception updating activity:', error_5);
                        return [2 /*return*/, false];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Обновить баланс farming
     */
    UniFarmingRepository.prototype.updateBalance = function (userId, balance, lastUpdate) {
        return __awaiter(this, void 0, void 0, function () {
            var error, fallbackError, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(this.tableName)
                                .update({
                                farming_balance: balance,
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
                                uni_farming_balance: balance,
                                uni_farming_last_update: lastUpdate
                            })
                                .eq('id', userId)];
                    case 2:
                        fallbackError = (_a.sent()).error;
                        if (fallbackError) {
                            logger_1.logger.error('[UniFarmingRepository] Error updating balance in users table:', fallbackError);
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, true];
                    case 3:
                        logger_1.logger.error('[UniFarmingRepository] Error updating balance:', error);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/, true];
                    case 5:
                        error_6 = _a.sent();
                        logger_1.logger.error('[UniFarmingRepository] Exception updating balance:', error_6);
                        return [2 /*return*/, false];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Получить всех активных фармеров
     */
    UniFarmingRepository.prototype.getActiveFarmers = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, error_7;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from(this.tableName)
                                .select('*')
                                .eq('is_active', true)];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            if (error.code === '42P01') {
                                // Таблица не существует, используем fallback
                                this.useFallback = true;
                                return [2 /*return*/, this.getActiveFarmersFallback()];
                            }
                            logger_1.logger.error('[UniFarmingRepository] Error getting active farmers:', error);
                            return [2 /*return*/, []];
                        }
                        return [2 /*return*/, data || []];
                    case 2:
                        error_7 = _b.sent();
                        logger_1.logger.error('[UniFarmingRepository] Exception getting active farmers:', error_7);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Fallback метод для получения активных фармеров из таблицы users
     */
    UniFarmingRepository.prototype.getActiveFarmersFallback = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, users, error, error_8;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from('users')
                                .select('*')
                                .eq('uni_farming_active', true)];
                    case 1:
                        _a = _b.sent(), users = _a.data, error = _a.error;
                        if (error || !users) {
                            return [2 /*return*/, []];
                        }
                        // Преобразуем данные из users в формат UniFarmingData
                        return [2 /*return*/, users.map(function (user) { return ({
                                user_id: user.id,
                                deposit_amount: user.uni_deposit_amount || '0',
                                farming_balance: user.uni_farming_balance || '0',
                                farming_rate: user.uni_farming_rate || '0.01',
                                farming_start_timestamp: user.uni_farming_start_timestamp,
                                farming_last_update: user.uni_farming_last_update,
                                farming_deposit: user.uni_farming_deposit || '0',
                                is_active: user.uni_farming_active || false,
                                created_at: user.created_at,
                                updated_at: user.updated_at || user.created_at
                            }); })];
                    case 2:
                        error_8 = _b.sent();
                        logger_1.logger.error('[UniFarmingRepository] Exception in fallback getActiveFarmers:', error_8);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Добавить депозит
     */
    UniFarmingRepository.prototype.addDeposit = function (userId, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, currentDeposit, newDeposit, _a, existingData, checkError, error, updateError, syncError, insertError, updateData, fallbackError, error_9;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 12, , 13]);
                        logger_1.logger.info('[UniFarmingRepository] addDeposit вызван', { userId: userId, amount: amount });
                        return [4 /*yield*/, this.getByUserId(userId)];
                    case 1:
                        existing = _b.sent();
                        currentDeposit = existing ? parseFloat(existing.deposit_amount) : 0;
                        newDeposit = (currentDeposit + parseFloat(amount)).toString();
                        logger_1.logger.info('[UniFarmingRepository] Текущий депозит', {
                            currentDeposit: currentDeposit,
                            newDeposit: newDeposit,
                            existing: !!existing
                        });
                        return [4 /*yield*/, supabase_1.supabase
                                .from(this.tableName)
                                .select('user_id')
                                .eq('user_id', parseInt(userId))
                                .single()];
                    case 2:
                        _a = _b.sent(), existingData = _a.data, checkError = _a.error;
                        error = void 0;
                        if (!existingData) return [3 /*break*/, 6];
                        // Запись существует - используем UPDATE
                        logger_1.logger.info('[UniFarmingRepository] Запись существует, используем UPDATE');
                        return [4 /*yield*/, supabase_1.supabase
                                .from(this.tableName)
                                .update({
                                deposit_amount: newDeposit,
                                farming_deposit: newDeposit,
                                is_active: true,
                                farming_last_update: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                                .eq('user_id', parseInt(userId))];
                    case 3:
                        updateError = (_b.sent()).error;
                        error = updateError;
                        if (!!error) return [3 /*break*/, 5];
                        logger_1.logger.info('[UniFarmingRepository] Синхронизируем с таблицей users');
                        return [4 /*yield*/, supabase_1.supabase
                                .from('users')
                                .update({
                                uni_deposit_amount: newDeposit,
                                uni_farming_deposit: newDeposit,
                                uni_farming_active: true,
                                uni_farming_last_update: new Date().toISOString()
                            })
                                .eq('id', userId)];
                    case 4:
                        syncError = (_b.sent()).error;
                        if (syncError) {
                            logger_1.logger.error('[UniFarmingRepository] Ошибка синхронизации с users:', syncError);
                        }
                        _b.label = 5;
                    case 5: return [3 /*break*/, 8];
                    case 6:
                        // Записи нет - используем INSERT
                        logger_1.logger.info('[UniFarmingRepository] Записи нет, используем INSERT');
                        return [4 /*yield*/, supabase_1.supabase
                                .from(this.tableName)
                                .insert({
                                user_id: parseInt(userId),
                                deposit_amount: newDeposit,
                                farming_deposit: newDeposit,
                                is_active: true,
                                farming_start_timestamp: new Date().toISOString(),
                                farming_last_update: new Date().toISOString(),
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })];
                    case 7:
                        insertError = (_b.sent()).error;
                        error = insertError;
                        _b.label = 8;
                    case 8:
                        if (!error) return [3 /*break*/, 11];
                        logger_1.logger.warn('[UniFarmingRepository] Ошибка при upsert в uni_farming_data', {
                            code: error.code,
                            message: error.message,
                            details: error.details
                        });
                        if (!(error.code === '42P01')) return [3 /*break*/, 10];
                        // Таблица не существует, используем fallback
                        logger_1.logger.info('[UniFarmingRepository] Таблица uni_farming_data не существует, используем fallback на users');
                        this.useFallback = true;
                        updateData = {
                            uni_deposit_amount: newDeposit,
                            uni_farming_deposit: newDeposit,
                            uni_farming_active: true,
                            uni_farming_start_timestamp: new Date().toISOString(),
                            uni_farming_last_update: new Date().toISOString()
                        };
                        logger_1.logger.info('[UniFarmingRepository] Обновляем users таблицу', { userId: userId, updateData: updateData });
                        return [4 /*yield*/, supabase_1.supabase
                                .from('users')
                                .update(updateData)
                                .eq('id', userId)];
                    case 9:
                        fallbackError = (_b.sent()).error;
                        if (fallbackError) {
                            logger_1.logger.error('[UniFarmingRepository] Error adding deposit in users table:', {
                                error: fallbackError,
                                userId: userId,
                                updateData: updateData
                            });
                            return [2 /*return*/, false];
                        }
                        logger_1.logger.info('[UniFarmingRepository] Успешно обновлено в users таблице');
                        return [2 /*return*/, true];
                    case 10:
                        logger_1.logger.error('[UniFarmingRepository] Error adding deposit:', error);
                        return [2 /*return*/, false];
                    case 11:
                        logger_1.logger.info('[UniFarmingRepository] Успешно добавлен депозит в uni_farming_data');
                        return [2 /*return*/, true];
                    case 12:
                        error_9 = _b.sent();
                        logger_1.logger.error('[UniFarmingRepository] Exception adding deposit:', error_9);
                        return [2 /*return*/, false];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    return UniFarmingRepository;
}());
exports.UniFarmingRepository = UniFarmingRepository;
exports.uniFarmingRepository = new UniFarmingRepository();
