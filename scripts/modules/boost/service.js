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
exports.boostService = exports.BoostService = void 0;
var logger_js_1 = require("../../core/logger.js");
var model_1 = require("./model");
var supabase_js_1 = require("../../core/supabase.js");
var BoostService = /** @class */ (function () {
    function BoostService() {
    }
    BoostService.prototype.getAvailableBoosts = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    return [2 /*return*/, [
                            {
                                id: 1,
                                name: model_1.BOOST_PACKAGES.STARTER.name,
                                description: "1% в день на 365 дней + 10,000 UNI бонус",
                                daily_rate: parseFloat(model_1.BOOST_PACKAGES.STARTER.daily_rate),
                                duration_days: model_1.BOOST_PACKAGES.STARTER.duration_days,
                                min_amount: parseFloat(model_1.BOOST_PACKAGES.STARTER.min_amount),
                                max_amount: parseFloat(model_1.BOOST_PACKAGES.STARTER.max_amount),
                                uni_bonus: parseFloat(model_1.BOOST_PACKAGES.STARTER.uni_bonus),
                                is_active: true
                            },
                            {
                                id: 2,
                                name: model_1.BOOST_PACKAGES.STANDARD.name,
                                description: "1.5% в день на 365 дней + 50,000 UNI бонус",
                                daily_rate: parseFloat(model_1.BOOST_PACKAGES.STANDARD.daily_rate),
                                duration_days: model_1.BOOST_PACKAGES.STANDARD.duration_days,
                                min_amount: parseFloat(model_1.BOOST_PACKAGES.STANDARD.min_amount),
                                max_amount: parseFloat(model_1.BOOST_PACKAGES.STANDARD.max_amount),
                                uni_bonus: parseFloat(model_1.BOOST_PACKAGES.STANDARD.uni_bonus),
                                is_active: true
                            },
                            {
                                id: 3,
                                name: model_1.BOOST_PACKAGES.ADVANCED.name,
                                description: "2% в день на 365 дней + 100,000 UNI бонус",
                                daily_rate: parseFloat(model_1.BOOST_PACKAGES.ADVANCED.daily_rate),
                                duration_days: model_1.BOOST_PACKAGES.ADVANCED.duration_days,
                                min_amount: parseFloat(model_1.BOOST_PACKAGES.ADVANCED.min_amount),
                                max_amount: parseFloat(model_1.BOOST_PACKAGES.ADVANCED.max_amount),
                                uni_bonus: parseFloat(model_1.BOOST_PACKAGES.ADVANCED.uni_bonus),
                                is_active: true
                            },
                            {
                                id: 4,
                                name: model_1.BOOST_PACKAGES.PREMIUM.name,
                                description: "2.5% в день на 365 дней + 500,000 UNI бонус",
                                daily_rate: parseFloat(model_1.BOOST_PACKAGES.PREMIUM.daily_rate),
                                duration_days: model_1.BOOST_PACKAGES.PREMIUM.duration_days,
                                min_amount: parseFloat(model_1.BOOST_PACKAGES.PREMIUM.min_amount),
                                max_amount: parseFloat(model_1.BOOST_PACKAGES.PREMIUM.max_amount),
                                uni_bonus: parseFloat(model_1.BOOST_PACKAGES.PREMIUM.uni_bonus),
                                is_active: true
                            },
                            {
                                id: 5,
                                name: model_1.BOOST_PACKAGES.ELITE.name,
                                description: "3% в день на 365 дней + 1,000,000 UNI бонус",
                                daily_rate: parseFloat(model_1.BOOST_PACKAGES.ELITE.daily_rate),
                                duration_days: model_1.BOOST_PACKAGES.ELITE.duration_days,
                                min_amount: parseFloat(model_1.BOOST_PACKAGES.ELITE.min_amount),
                                max_amount: parseFloat(model_1.BOOST_PACKAGES.ELITE.max_amount),
                                uni_bonus: parseFloat(model_1.BOOST_PACKAGES.ELITE.uni_bonus),
                                is_active: true
                            }
                        ]];
                }
                catch (error) {
                    logger_js_1.logger.error('[BoostService] Ошибка получения доступных бустов:', error);
                    return [2 /*return*/, []];
                }
                return [2 /*return*/];
            });
        });
    };
    BoostService.prototype.getBoostPackages = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.getAvailableBoosts()];
            });
        });
    };
    BoostService.prototype.getUserActiveBoosts = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    logger_js_1.logger.info("[BoostService] \u041F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0435 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u0431\u0443\u0441\u0442\u043E\u0432 \u0434\u043B\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F ".concat(userId));
                    return [2 /*return*/, [
                            {
                                id: 1,
                                package_id: 1,
                                start_date: new Date(),
                                end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                                is_active: true
                            }
                        ]];
                }
                catch (error) {
                    logger_js_1.logger.error('[BoostService] Ошибка получения активных бустов:', error);
                    return [2 /*return*/, []];
                }
                return [2 /*return*/];
            });
        });
    };
    BoostService.prototype.purchaseBoost = function (userId, boostId, paymentMethod, txHash) {
        return __awaiter(this, void 0, void 0, function () {
            var boostPackage, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        logger_js_1.logger.info('[BoostService] Начало процесса покупки Boost', {
                            userId: userId,
                            boostId: boostId,
                            paymentMethod: paymentMethod,
                            hasTxHash: !!txHash
                        });
                        return [4 /*yield*/, this.getBoostPackageById(boostId)];
                    case 1:
                        boostPackage = _a.sent();
                        if (!boostPackage) {
                            logger_js_1.logger.error('[BoostService] Boost-пакет не найден', { boostId: boostId });
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'Boost-пакет не найден'
                                }];
                        }
                        if (!(paymentMethod === 'wallet')) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.purchaseWithInternalWallet(userId, boostPackage)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        if (!(paymentMethod === 'ton')) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.purchaseWithExternalTon(userId, boostPackage, txHash)];
                    case 4: return [2 /*return*/, _a.sent()];
                    case 5: return [2 /*return*/, {
                            success: false,
                            message: 'Неподдерживаемый метод оплаты'
                        }];
                    case 6:
                        error_1 = _a.sent();
                        logger_js_1.logger.error('[BoostService] Ошибка покупки Boost-пакета:', error_1);
                        return [2 /*return*/, {
                                success: false,
                                message: 'Внутренняя ошибка сервера при покупке Boost'
                            }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Начисляет UNI бонус пользователю при покупке boost пакета
     */
    BoostService.prototype.awardUniBonus = function (userId, boostPackage) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, user, getUserError, balanceManager, result, transactionError, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, , 6]);
                        logger_js_1.logger.info('[BoostService] Начисление UNI бонуса', {
                            userId: userId,
                            packageName: boostPackage.name,
                            uniBonus: boostPackage.uni_bonus
                        });
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from(model_1.BOOST_TABLES.USERS)
                                .select('balance_uni')
                                .eq('id', userId)
                                .single()];
                    case 1:
                        _a = _b.sent(), user = _a.data, getUserError = _a.error;
                        if (getUserError) {
                            logger_js_1.logger.error('[BoostService] Ошибка получения пользователя для UNI бонуса:', getUserError);
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../core/BalanceManager')); })];
                    case 2:
                        balanceManager = (_b.sent()).balanceManager;
                        return [4 /*yield*/, balanceManager.addBalance(userId, boostPackage.uni_bonus, 0, 'BoostService.uni_bonus')];
                    case 3:
                        result = _b.sent();
                        if (!result.success) {
                            logger_js_1.logger.error('[BoostService] Ошибка обновления баланса UNI:', result.error);
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from(model_1.BOOST_TABLES.TRANSACTIONS)
                                .insert({
                                user_id: parseInt(userId),
                                type: 'DAILY_BONUS', // Используем существующий тип из схемы базы данных
                                amount: boostPackage.uni_bonus.toString(),
                                currency: 'UNI',
                                status: 'completed',
                                description: "UNI \u0431\u043E\u043D\u0443\u0441 \u0437\u0430 \u043F\u043E\u043A\u0443\u043F\u043A\u0443 TON Boost \"".concat(boostPackage.name, "\" (+").concat(boostPackage.uni_bonus, " UNI)"),
                                created_at: new Date().toISOString()
                            })];
                    case 4:
                        transactionError = (_b.sent()).error;
                        if (transactionError) {
                            logger_js_1.logger.error('[BoostService] Ошибка создания транзакции UNI бонуса:', transactionError);
                            // Не возвращаем false, так как баланс уже обновлен
                        }
                        logger_js_1.logger.info('[BoostService] UNI бонус успешно начислен', {
                            userId: userId,
                            oldBalance: currentBalance,
                            newBalance: newBalance,
                            bonusAmount: boostPackage.uni_bonus
                        });
                        return [2 /*return*/, true];
                    case 5:
                        error_2 = _b.sent();
                        logger_js_1.logger.error('[BoostService] Ошибка начисления UNI бонуса:', error_2);
                        return [2 /*return*/, false];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    BoostService.prototype.getBoostPackageById = function (boostId) {
        return __awaiter(this, void 0, void 0, function () {
            var packages, packageFound, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getBoostPackages()];
                    case 1:
                        packages = _a.sent();
                        packageFound = packages.find(function (pkg) { return pkg.id.toString() === boostId; });
                        if (packageFound) {
                            logger_js_1.logger.info('[BoostService] Найден Boost-пакет', {
                                boostId: boostId,
                                packageName: packageFound.name
                            });
                            return [2 /*return*/, packageFound];
                        }
                        return [2 /*return*/, null];
                    case 2:
                        error_3 = _a.sent();
                        logger_js_1.logger.error('[BoostService] Ошибка поиска Boost-пакета:', error_3);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    BoostService.prototype.purchaseWithInternalWallet = function (userId, boostPackage) {
        return __awaiter(this, void 0, void 0, function () {
            var WalletService, walletService, walletData, requiredAmount, withdrawSuccess, TonFarmingRepository, tonFarmingRepo, immediateActivation, purchase, supabase_1, transactionError, error_4, uniBonusAwarded, updatedWalletData, finalActivation, responseData, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 15, , 16]);
                        logger_js_1.logger.info('[BoostService] Покупка через внутренний кошелек', {
                            userId: userId,
                            boostPackageId: boostPackage.id,
                            packageName: boostPackage.name
                        });
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../wallet/service')); })];
                    case 1:
                        WalletService = (_a.sent()).WalletService;
                        walletService = new WalletService();
                        return [4 /*yield*/, walletService.getWalletDataByUserId(userId)];
                    case 2:
                        walletData = _a.sent();
                        requiredAmount = boostPackage.min_amount || 0;
                        logger_js_1.logger.info('[BoostService] Данные кошелька получены', {
                            userId: userId,
                            userIdType: typeof userId,
                            walletData: walletData,
                            requiredAmount: requiredAmount,
                            packageInfo: {
                                id: boostPackage.id,
                                name: boostPackage.name,
                                minAmount: boostPackage.min_amount
                            }
                        });
                        // Проверяем достаточность средств
                        if (walletData.ton_balance < requiredAmount) {
                            logger_js_1.logger.warn('[BoostService] Недостаточно средств для покупки', {
                                userId: userId,
                                required: requiredAmount,
                                available: walletData.ton_balance
                            });
                            return [2 /*return*/, {
                                    success: false,
                                    message: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432. \u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F: ".concat(requiredAmount, " TON, \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E: ").concat(walletData.ton_balance, " TON")
                                }];
                        }
                        return [4 /*yield*/, walletService.processWithdrawal(userId, requiredAmount.toString(), 'TON')];
                    case 3:
                        withdrawSuccess = _a.sent();
                        if (!withdrawSuccess) {
                            logger_js_1.logger.error('[BoostService] Не удалось списать средства', { userId: userId, amount: requiredAmount });
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'Ошибка списания средств с внутреннего баланса'
                                }];
                        }
                        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Активация TON Boost СРАЗУ после списания средств
                        // Это гарантирует активацию планировщика независимо от проблем с createBoostPurchase
                        logger_js_1.logger.info('[BoostService] НЕМЕДЛЕННАЯ активация TON Boost планировщика', {
                            userId: userId,
                            boostId: boostPackage.id,
                            reason: 'Активация сразу после успешного списания средств'
                        });
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('./TonFarmingRepository')); })];
                    case 4:
                        TonFarmingRepository = (_a.sent()).TonFarmingRepository;
                        tonFarmingRepo = new TonFarmingRepository();
                        return [4 /*yield*/, tonFarmingRepo.activateBoost(userId, boostPackage.id, boostPackage.daily_rate / 100, // Конвертируем процент в десятичное число
                            undefined, // expiresAt - необязательный параметр
                            requiredAmount // Передаем сумму депозита для обновления farming_balance
                            )];
                    case 5:
                        immediateActivation = _a.sent();
                        if (!immediateActivation) {
                            logger_js_1.logger.error('[BoostService] КРИТИЧЕСКАЯ ОШИБКА немедленной активации');
                        }
                        else {
                            logger_js_1.logger.info('[BoostService] Немедленная активация УСПЕШНА - планировщик активирован');
                        }
                        // Создаем запись о покупке
                        logger_js_1.logger.info('[BoostService] Вызов createBoostPurchase', {
                            userId: userId,
                            boostPackageId: boostPackage.id,
                            boostPackageIdStr: boostPackage.id.toString()
                        });
                        return [4 /*yield*/, this.createBoostPurchase(userId, boostPackage.id.toString(), 'wallet', null, 'confirmed')];
                    case 6:
                        purchase = _a.sent();
                        logger_js_1.logger.info('[BoostService] Результат createBoostPurchase', {
                            purchase: purchase,
                            purchaseSuccess: !!purchase
                        });
                        _a.label = 7;
                    case 7:
                        _a.trys.push([7, 10, , 11]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../core/supabase')); })];
                    case 8:
                        supabase_1 = (_a.sent()).supabase;
                        return [4 /*yield*/, supabase_1
                                .from('transactions')
                                .insert({
                                user_id: parseInt(userId),
                                type: 'BOOST_PURCHASE', // Новый тип для покупок TON Boost
                                amount: requiredAmount.toString(),
                                currency: 'TON',
                                status: 'completed',
                                description: "\u041F\u043E\u043A\u0443\u043F\u043A\u0430 TON Boost \"".concat(boostPackage.name, "\" (-").concat(requiredAmount, " TON)"),
                                created_at: new Date().toISOString(),
                                metadata: {
                                    original_type: 'TON_BOOST_PURCHASE',
                                    boost_package_id: boostPackage.id,
                                    package_name: boostPackage.name,
                                    daily_rate: boostPackage.daily_rate
                                }
                            })];
                    case 9:
                        transactionError = (_a.sent()).error;
                        if (transactionError) {
                            logger_js_1.logger.error('[BoostService] Ошибка создания транзакции покупки буста:', transactionError);
                        }
                        else {
                            logger_js_1.logger.info('[BoostService] Транзакция покупки буста успешно создана', {
                                userId: userId,
                                amount: requiredAmount,
                                packageName: boostPackage.name
                            });
                        }
                        return [3 /*break*/, 11];
                    case 10:
                        error_4 = _a.sent();
                        logger_js_1.logger.error('[BoostService] Ошибка создания транзакции покупки:', error_4);
                        return [3 /*break*/, 11];
                    case 11: return [4 /*yield*/, this.awardUniBonus(userId, boostPackage)];
                    case 12:
                        uniBonusAwarded = _a.sent();
                        if (!uniBonusAwarded) {
                            logger_js_1.logger.warn('[BoostService] Не удалось начислить UNI бонус', {
                                userId: userId,
                                boostPackageId: boostPackage.id,
                                uniBonus: boostPackage.uni_bonus
                            });
                        }
                        // Реферальные награды теперь начисляются планировщиком от фактического дохода
                        logger_js_1.logger.warn('[BoostService] Referral reward отключён: перенесено в Boost-планировщик', {
                            userId: userId,
                            boostPackageId: boostPackage.id,
                            amount: requiredAmount,
                            reason: 'Партнёрские начисления теперь происходят только от дохода, не от покупки'
                        });
                        return [4 /*yield*/, walletService.getWalletDataByUserId(userId)];
                    case 13:
                        updatedWalletData = _a.sent();
                        logger_js_1.logger.info('[BoostService] Успешная покупка через внутренний кошелек', {
                            userId: userId,
                            boostPackageId: boostPackage.id,
                            amount: requiredAmount,
                            purchaseId: purchase === null || purchase === void 0 ? void 0 : purchase.id,
                            oldBalance: walletData.ton_balance,
                            newBalance: updatedWalletData.ton_balance
                        });
                        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Принудительная активация TON Boost планировщика
                        // Выполняется в самом конце для гарантированного обновления ton_boost_package
                        logger_js_1.logger.info('[BoostService] ФИНАЛЬНАЯ активация TON Boost планировщика', {
                            userId: userId,
                            boostId: boostPackage.id,
                            reason: 'Гарантированная активация после успешной покупки'
                        });
                        return [4 /*yield*/, tonFarmingRepo.activateBoost(userId, // Передаем как строку, метод сам конвертирует
                            boostPackage.id, boostPackage.daily_rate / 100, // Конвертируем процент в десятичное число
                            undefined, // expiresAt - будет рассчитано автоматически
                            requiredAmount // КРИТИЧНО: передаем сумму депозита для farming_balance
                            )];
                    case 14:
                        finalActivation = _a.sent();
                        if (!finalActivation) {
                            logger_js_1.logger.error('[BoostService] КРИТИЧЕСКАЯ ОШИБКА финальной активации');
                        }
                        else {
                            logger_js_1.logger.info('[BoostService] Финальная активация УСПЕШНА - планировщик активирован');
                        }
                        responseData = {
                            success: true,
                            message: "Boost \"".concat(boostPackage.name, "\" \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0430\u043A\u0442\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u043D"),
                            purchase: purchase,
                            // Добавляем обновленные балансы для мгновенного обновления UI
                            balanceUpdate: {
                                tonBalance: updatedWalletData.ton_balance,
                                uniBalance: updatedWalletData.uni_balance,
                                previousTonBalance: walletData.ton_balance,
                                deductedAmount: requiredAmount
                            }
                        };
                        logger_js_1.logger.info('[BoostService] Формируется ответ с balanceUpdate:', {
                            responseData: responseData,
                            hasBalanceUpdate: !!responseData.balanceUpdate,
                            balanceUpdateData: responseData.balanceUpdate
                        });
                        return [2 /*return*/, responseData];
                    case 15:
                        error_5 = _a.sent();
                        logger_js_1.logger.error('[BoostService] Ошибка покупки через внутренний кошелек:', error_5);
                        return [2 /*return*/, {
                                success: false,
                                message: 'Ошибка обработки платежа через внутренний кошелек'
                            }];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    BoostService.prototype.purchaseWithExternalTon = function (userId, boostPackage, txHash) {
        return __awaiter(this, void 0, void 0, function () {
            var purchase, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        logger_js_1.logger.info('[BoostService] Покупка через внешний TON кошелек', {
                            userId: userId,
                            boostPackageId: boostPackage.id,
                            txHash: txHash
                        });
                        return [4 /*yield*/, this.createBoostPurchase(userId, boostPackage.id, 'ton', txHash, 'pending')];
                    case 1:
                        purchase = _a.sent();
                        // Создаем транзакцию со статусом pending
                        return [4 /*yield*/, this.createPendingTransaction(userId, boostPackage, txHash)];
                    case 2:
                        // Создаем транзакцию со статусом pending
                        _a.sent();
                        logger_js_1.logger.info('[BoostService] Создана pending покупка через внешний TON', {
                            userId: userId,
                            boostPackageId: boostPackage.id,
                            txHash: txHash,
                            purchaseId: purchase === null || purchase === void 0 ? void 0 : purchase.id
                        });
                        return [2 /*return*/, {
                                success: true,
                                message: 'Платеж принят. Boost будет активирован после подтверждения транзакции в блокчейне',
                                purchase: purchase
                            }];
                    case 3:
                        error_6 = _a.sent();
                        logger_js_1.logger.error('[BoostService] Ошибка покупки через внешний TON:', error_6);
                        return [2 /*return*/, {
                                success: false,
                                message: 'Ошибка обработки платежа через внешний TON кошелек'
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    BoostService.prototype.createBoostPurchase = function (userId, boostId, source, txHash, status) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase_2, boostPackage, _a, updateResult, userUpdateError, error_7;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../core/supabase')); })];
                    case 1:
                        supabase_2 = (_b.sent()).supabase;
                        return [4 /*yield*/, this.getBoostPackageById(boostId)];
                    case 2:
                        boostPackage = _b.sent();
                        if (!boostPackage) {
                            logger_js_1.logger.error('[BoostService] Пакет не найден для создания покупки', { boostId: boostId });
                            return [2 /*return*/, null];
                        }
                        logger_js_1.logger.info('[BoostService] Активация TON Boost пакета через users таблицу', {
                            userId: userId,
                            boostId: boostId,
                            boostPackage: boostPackage.name,
                            rate: boostPackage.daily_rate
                        });
                        return [4 /*yield*/, supabase_2
                                .from(model_1.BOOST_TABLES.USERS)
                                .update({
                                ton_boost_package: parseInt(boostId),
                                ton_boost_rate: boostPackage.daily_rate
                            })
                                .eq('id', userId)
                                .select('id, ton_boost_package, ton_boost_rate')];
                    case 3:
                        _a = _b.sent(), updateResult = _a.data, userUpdateError = _a.error;
                        if (userUpdateError) {
                            logger_js_1.logger.error('[BoostService] Ошибка активации TON Boost пакета:', userUpdateError);
                            return [2 /*return*/, null];
                        }
                        else {
                            logger_js_1.logger.info('[BoostService] TON Boost пакет успешно активирован', {
                                userId: userId,
                                updateResult: updateResult,
                                boostPackage: parseInt(boostId),
                                rate: boostPackage.daily_rate
                            });
                        }
                        // Возвращаем симулированный объект покупки для совместимости
                        return [2 /*return*/, {
                                id: "virtual_".concat(Date.now()),
                                user_id: parseInt(userId),
                                package_id: parseInt(boostId),
                                amount: boostPackage.min_amount.toString(),
                                status: status,
                                payment_method: source,
                                created_at: new Date().toISOString()
                            }];
                    case 4:
                        error_7 = _b.sent();
                        logger_js_1.logger.error('[BoostService] Ошибка в createBoostPurchase:', error_7);
                        return [2 /*return*/, null];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    BoostService.prototype.createPendingTransaction = function (userId, boostPackage, txHash) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase_3, _a, data, error, error_8;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../core/supabase')); })];
                    case 1:
                        supabase_3 = (_b.sent()).supabase;
                        return [4 /*yield*/, supabase_3
                                .from('transactions')
                                .insert({
                                user_id: parseInt(userId),
                                type: 'boost_purchase',
                                amount_uni: '0',
                                amount_ton: boostPackage.min_amount.toString(),
                                currency: 'TON',
                                status: 'pending',
                                tx_hash: txHash,
                                description: "\u041F\u043E\u043A\u0443\u043F\u043A\u0430 Boost \"".concat(boostPackage.name, "\""),
                                created_at: new Date().toISOString()
                            })];
                    case 2:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            logger_js_1.logger.error('[BoostService] Ошибка создания pending транзакции:', error);
                            return [2 /*return*/, false];
                        }
                        logger_js_1.logger.info('[BoostService] Создана pending транзакция', {
                            userId: userId,
                            txHash: txHash,
                            amount: boostPackage.min_amount
                        });
                        return [2 /*return*/, true];
                    case 3:
                        error_8 = _b.sent();
                        logger_js_1.logger.error('[BoostService] Ошибка в createPendingTransaction:', error_8);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    BoostService.prototype.verifyTonPayment = function (txHash, userId, boostId) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase_4, _a, existingConfirmed, duplicateError, _b, purchase, purchaseError, checkTonTransaction, tonResult, updateError, boostPackage, uniBonusAwarded, boostActivated, error_9;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 12, , 13]);
                        logger_js_1.logger.info('[BoostService] Начало проверки TON платежа', {
                            txHash: txHash,
                            userId: userId,
                            boostId: boostId
                        });
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../core/supabase')); })];
                    case 1:
                        supabase_4 = (_c.sent()).supabase;
                        return [4 /*yield*/, supabase_4
                                .from('boost_purchases')
                                .select('*')
                                .eq('tx_hash', txHash)
                                .eq('status', 'confirmed')
                                .single()];
                    case 2:
                        _a = _c.sent(), existingConfirmed = _a.data, duplicateError = _a.error;
                        if (existingConfirmed) {
                            logger_js_1.logger.warn('[BoostService] Попытка повторного использования tx_hash', {
                                txHash: txHash,
                                existingPurchaseId: existingConfirmed.id,
                                existingUserId: existingConfirmed.user_id
                            });
                            return [2 /*return*/, {
                                    success: false,
                                    status: 'error',
                                    message: 'Эта транзакция уже была использована для активации Boost'
                                }];
                        }
                        return [4 /*yield*/, supabase_4
                                .from('boost_purchases')
                                .select('*')
                                .eq('user_id', userId)
                                .eq('boost_id', boostId)
                                .eq('tx_hash', txHash)
                                .eq('status', 'pending')
                                .single()];
                    case 3:
                        _b = _c.sent(), purchase = _b.data, purchaseError = _b.error;
                        if (purchaseError || !purchase) {
                            logger_js_1.logger.warn('[BoostService] Pending покупка не найдена', {
                                txHash: txHash,
                                userId: userId,
                                boostId: boostId,
                                error: purchaseError === null || purchaseError === void 0 ? void 0 : purchaseError.message
                            });
                            return [2 /*return*/, {
                                    success: true,
                                    status: 'not_found',
                                    message: 'Pending покупка с указанным tx_hash не найдена'
                                }];
                        }
                        logger_js_1.logger.info('[BoostService] Найдена pending покупка', {
                            purchaseId: purchase.id,
                            txHash: txHash
                        });
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../utils/checkTonTransaction')); })];
                    case 4:
                        checkTonTransaction = (_c.sent()).checkTonTransaction;
                        return [4 /*yield*/, checkTonTransaction(txHash)];
                    case 5:
                        tonResult = _c.sent();
                        if (!tonResult.success) {
                            logger_js_1.logger.error('[BoostService] Ошибка проверки TON транзакции', {
                                txHash: txHash,
                                error: tonResult.error
                            });
                            return [2 /*return*/, {
                                    success: false,
                                    status: 'error',
                                    message: tonResult.error || 'Ошибка проверки блокчейн транзакции'
                                }];
                        }
                        if (!tonResult.confirmed) {
                            logger_js_1.logger.info('[BoostService] Транзакция еще не подтверждена', {
                                txHash: txHash,
                                tonError: tonResult.error
                            });
                            return [2 /*return*/, {
                                    success: true,
                                    status: 'waiting',
                                    message: 'Транзакция еще не подтверждена в блокчейне. Попробуйте позже.'
                                }];
                        }
                        // Транзакция подтверждена - активируем Boost
                        logger_js_1.logger.info('[BoostService] Транзакция подтверждена, активируем Boost', {
                            txHash: txHash,
                            amount: tonResult.amount,
                            purchaseId: purchase.id
                        });
                        return [4 /*yield*/, supabase_4
                                .from('boost_purchases')
                                .update({
                                status: 'confirmed',
                                updated_at: new Date().toISOString()
                            })
                                .eq('id', purchase.id)];
                    case 6:
                        updateError = (_c.sent()).error;
                        if (updateError) {
                            logger_js_1.logger.error('[BoostService] Ошибка обновления статуса покупки', {
                                purchaseId: purchase.id,
                                error: updateError.message
                            });
                            return [2 /*return*/, {
                                    success: false,
                                    status: 'error',
                                    message: 'Ошибка обновления статуса покупки'
                                }];
                        }
                        // Создаем confirmed транзакцию
                        return [4 /*yield*/, this.createConfirmedTransaction(userId, boostId, txHash, tonResult.amount)];
                    case 7:
                        // Создаем confirmed транзакцию
                        _c.sent();
                        return [4 /*yield*/, this.getBoostPackageById(boostId)];
                    case 8:
                        boostPackage = _c.sent();
                        if (!boostPackage) return [3 /*break*/, 10];
                        return [4 /*yield*/, this.awardUniBonus(userId, boostPackage)];
                    case 9:
                        uniBonusAwarded = _c.sent();
                        if (!uniBonusAwarded) {
                            logger_js_1.logger.warn('[BoostService] Не удалось начислить UNI бонус при подтверждении TON транзакции', {
                                userId: userId,
                                boostId: boostPackage.id,
                                uniBonus: boostPackage.uni_bonus
                            });
                        }
                        _c.label = 10;
                    case 10: return [4 /*yield*/, this.activateBoost(userId, boostId)];
                    case 11:
                        boostActivated = _c.sent();
                        logger_js_1.logger.info('[BoostService] TON платеж успешно подтвержден и Boost активирован', {
                            txHash: txHash,
                            userId: userId,
                            boostId: boostId,
                            amount: tonResult.amount,
                            boostActivated: boostActivated
                        });
                        return [2 /*return*/, {
                                success: true,
                                status: 'confirmed',
                                message: 'Платеж подтвержден, Boost успешно активирован',
                                transaction_amount: tonResult.amount,
                                boost_activated: boostActivated
                            }];
                    case 12:
                        error_9 = _c.sent();
                        logger_js_1.logger.error('[BoostService] Критическая ошибка проверки TON платежа', {
                            txHash: txHash,
                            userId: userId,
                            boostId: boostId,
                            error: error_9 instanceof Error ? error_9.message : String(error_9)
                        });
                        return [2 /*return*/, {
                                success: false,
                                status: 'error',
                                message: 'Внутренняя ошибка при проверке платежа'
                            }];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    BoostService.prototype.createConfirmedTransaction = function (userId, boostId, txHash, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase_5, boostPackage, description, error, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../core/supabase')); })];
                    case 1:
                        supabase_5 = (_a.sent()).supabase;
                        return [4 /*yield*/, this.getBoostPackageById(boostId)];
                    case 2:
                        boostPackage = _a.sent();
                        description = boostPackage ?
                            "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043D\u0430\u044F \u043F\u043E\u043A\u0443\u043F\u043A\u0430 Boost \"".concat(boostPackage.name, "\"") :
                            "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043D\u0430\u044F \u043F\u043E\u043A\u0443\u043F\u043A\u0430 Boost ID: ".concat(boostId);
                        return [4 /*yield*/, supabase_5
                                .from('transactions')
                                .insert({
                                user_id: parseInt(userId),
                                type: 'boost_purchase',
                                amount_uni: '0',
                                amount_ton: amount || '0',
                                currency: 'TON',
                                status: 'completed',
                                tx_hash: txHash,
                                description: description,
                                created_at: new Date().toISOString()
                            })];
                    case 3:
                        error = (_a.sent()).error;
                        if (error) {
                            logger_js_1.logger.error('[BoostService] Ошибка создания confirmed транзакции', {
                                userId: userId,
                                txHash: txHash,
                                error: error.message
                            });
                            return [2 /*return*/, false];
                        }
                        logger_js_1.logger.info('[BoostService] Создана confirmed транзакция', {
                            userId: userId,
                            txHash: txHash,
                            amount: amount
                        });
                        return [2 /*return*/, true];
                    case 4:
                        error_10 = _a.sent();
                        logger_js_1.logger.error('[BoostService] Ошибка в createConfirmedTransaction', {
                            userId: userId,
                            txHash: txHash,
                            error: error_10 instanceof Error ? error_10.message : String(error_10)
                        });
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    BoostService.prototype.activateBoost = function (userId, boostId) {
        return __awaiter(this, void 0, void 0, function () {
            var boostPackage, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getBoostPackageById(boostId)];
                    case 1:
                        boostPackage = _a.sent();
                        if (!boostPackage) {
                            logger_js_1.logger.error('[BoostService] Boost пакет не найден для активации', { boostId: boostId });
                            return [2 /*return*/, false];
                        }
                        logger_js_1.logger.info('[BoostService] Активация Boost пакета', {
                            userId: userId,
                            boostId: boostId,
                            packageName: boostPackage.name,
                            durationDays: boostPackage.duration_days
                        });
                        // Здесь будет логика активации Boost:
                        // - Обновление пользовательских множителей
                        // - Установка времени окончания действия
                        // - Применение эффектов к farming
                        // Реферальные награды теперь начисляются планировщиком от фактического дохода
                        logger_js_1.logger.warn('[BoostService] Referral reward отключён: перенесено в Boost-планировщик', {
                            userId: userId,
                            boostId: boostId,
                            packageName: boostPackage.name,
                            reason: 'Партнёрские начисления теперь происходят только от дохода Boost, не от активации'
                        });
                        logger_js_1.logger.info('[BoostService] Boost успешно активирован', {
                            userId: userId,
                            boostId: boostId,
                            packageName: boostPackage.name
                        });
                        return [2 /*return*/, true];
                    case 2:
                        error_11 = _a.sent();
                        logger_js_1.logger.error('[BoostService] Ошибка активации Boost', {
                            userId: userId,
                            boostId: boostId,
                            error: error_11 instanceof Error ? error_11.message : String(error_11)
                        });
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Получить статус TON Boost фарминга для дашборда
     * Возвращает расчётные данные на основе активных Boost пакетов пользователя
     */
    BoostService.prototype.getTonBoostFarmingStatus = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, user, error, activeBoostId, tonBalance, boostPackage, dailyRate, ratePerSecond, dailyIncome, error_12;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from('users')
                                .select('*')
                                .eq('id', parseInt(userId))
                                .single()];
                    case 1:
                        _a = _b.sent(), user = _a.data, error = _a.error;
                        if (error || !user) {
                            logger_js_1.logger.info('[BoostService] Пользователь не найден для TON Boost статуса', { userId: userId });
                            return [2 /*return*/, {
                                    totalTonRatePerSecond: '0',
                                    totalUniRatePerSecond: '0',
                                    dailyIncomeTon: '0',
                                    dailyIncomeUni: '0',
                                    deposits: []
                                }];
                        }
                        activeBoostId = user.ton_boost_package;
                        tonBalance = parseFloat(user.balance_ton || '0');
                        logger_js_1.logger.info('[BoostService] Анализ пользователя для TON Boost', {
                            userId: userId,
                            activeBoostId: activeBoostId,
                            tonBalance: tonBalance,
                            hasActiveBoost: !!activeBoostId,
                            hasEnoughBalance: tonBalance >= 10
                        });
                        if (!activeBoostId || tonBalance < 10) {
                            logger_js_1.logger.info('[BoostService] TON Boost неактивен - нет пакета или недостаточно баланса', {
                                activeBoostId: activeBoostId,
                                tonBalance: tonBalance,
                                required: 10
                            });
                            return [2 /*return*/, {
                                    totalTonRatePerSecond: '0',
                                    totalUniRatePerSecond: '0',
                                    dailyIncomeTon: '0',
                                    dailyIncomeUni: '0',
                                    deposits: []
                                }];
                        }
                        return [4 /*yield*/, this.getBoostPackageById(activeBoostId.toString())];
                    case 2:
                        boostPackage = _b.sent();
                        logger_js_1.logger.info('[BoostService] Результат поиска Boost пакета', {
                            activeBoostId: activeBoostId,
                            packageFound: !!boostPackage,
                            packageData: boostPackage
                        });
                        if (!boostPackage) {
                            logger_js_1.logger.warn('[BoostService] Boost пакет не найден', { activeBoostId: activeBoostId });
                            return [2 /*return*/, {
                                    totalTonRatePerSecond: '0',
                                    totalUniRatePerSecond: '0',
                                    dailyIncomeTon: '0',
                                    dailyIncomeUni: '0',
                                    deposits: []
                                }];
                        }
                        dailyRate = parseFloat(boostPackage.daily_rate) * 100;
                        ratePerSecond = (dailyRate / 100) / 86400;
                        dailyIncome = (tonBalance * dailyRate) / 100;
                        logger_js_1.logger.info('[BoostService] Рассчитан статус TON Boost фарминга', {
                            userId: userId,
                            activeBoostId: activeBoostId,
                            tonBalance: tonBalance,
                            dailyRate: dailyRate,
                            dailyIncome: dailyIncome
                        });
                        return [2 /*return*/, {
                                totalTonRatePerSecond: ratePerSecond.toFixed(8),
                                totalUniRatePerSecond: '0', // TON Boost не генерирует UNI
                                dailyIncomeTon: dailyIncome.toFixed(6),
                                dailyIncomeUni: '0',
                                deposits: [{
                                        id: activeBoostId,
                                        package_name: boostPackage.name,
                                        amount: tonBalance.toString(),
                                        rate: dailyRate.toString(),
                                        status: 'active'
                                    }]
                            }];
                    case 3:
                        error_12 = _b.sent();
                        logger_js_1.logger.error('[BoostService] Ошибка получения статуса TON Boost фарминга:', error_12);
                        return [2 /*return*/, {
                                totalTonRatePerSecond: '0',
                                totalUniRatePerSecond: '0',
                                dailyIncomeTon: '0',
                                dailyIncomeUni: '0',
                                deposits: []
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    BoostService.prototype.activatePackage = function (userId, packageId) {
        return __awaiter(this, void 0, void 0, function () {
            var boostPackage, _a, user, userError, updateError, error_13;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        logger_js_1.logger.info('[BoostService] Активация TON Boost пакета', { userId: userId, packageId: packageId });
                        boostPackage = this.tonBoostPackages.find(function (pkg) { return pkg.id.toString() === packageId; });
                        if (!boostPackage) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'Пакет не найден'
                                }];
                        }
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from('users')
                                .select('id, ton_boost_package')
                                .eq('id', userId)
                                .single()];
                    case 1:
                        _a = _b.sent(), user = _a.data, userError = _a.error;
                        if (userError || !user) {
                            logger_js_1.logger.error('[BoostService] Ошибка получения пользователя:', userError);
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'Пользователь не найден'
                                }];
                        }
                        // Проверяем, не активирован ли уже пакет
                        if (user.ton_boost_package === parseInt(packageId)) {
                            return [2 /*return*/, {
                                    success: true,
                                    message: 'Пакет уже активирован',
                                    activated: false
                                }];
                        }
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from('users')
                                .update({
                                ton_boost_package: boostPackage.id,
                                ton_boost_rate: boostPackage.daily_rate
                            })
                                .eq('id', userId)];
                    case 2:
                        updateError = (_b.sent()).error;
                        if (updateError) {
                            logger_js_1.logger.error('[BoostService] Ошибка активации пакета:', updateError);
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'Ошибка активации пакета'
                                }];
                        }
                        logger_js_1.logger.info('[BoostService] Пакет успешно активирован', {
                            userId: userId,
                            packageId: packageId,
                            packageName: boostPackage.name,
                            dailyRate: boostPackage.daily_rate
                        });
                        return [2 /*return*/, {
                                success: true,
                                message: "\u041F\u0430\u043A\u0435\u0442 \"".concat(boostPackage.name, "\" \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0430\u043A\u0442\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u043D"),
                                activated: true
                            }];
                    case 3:
                        error_13 = _b.sent();
                        logger_js_1.logger.error('[BoostService] Ошибка активации пакета:', error_13);
                        return [2 /*return*/, {
                                success: false,
                                message: 'Внутренняя ошибка сервера'
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Получить активные boost пакеты пользователя
     */
    BoostService.prototype.getActiveBoosts = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, user_1, error, activeBoosts, tonPackage, error_14;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        logger_js_1.logger.info('[BoostService] Получение активных boost пакетов', { userId: userId });
                        return [4 /*yield*/, supabase_js_1.supabase
                                .from('users')
                                .select('ton_boost_package, ton_boost_rate, uni_farming_active, uni_deposit_amount')
                                .eq('id', userId)
                                .single()];
                    case 1:
                        _a = _b.sent(), user_1 = _a.data, error = _a.error;
                        if (error || !user_1) {
                            logger_js_1.logger.error('[BoostService] Ошибка получения пользователя:', error);
                            return [2 /*return*/, []];
                        }
                        activeBoosts = [];
                        // Проверяем активный TON Boost пакет
                        if (user_1.ton_boost_package) {
                            tonPackage = this.tonBoostPackages.find(function (pkg) { return pkg.id === user_1.ton_boost_package; });
                            if (tonPackage) {
                                activeBoosts.push({
                                    type: 'ton_boost',
                                    package_id: tonPackage.id,
                                    name: tonPackage.name,
                                    daily_rate: tonPackage.daily_rate,
                                    status: 'active'
                                });
                            }
                        }
                        // Проверяем активный UNI Farming
                        if (user_1.uni_farming_active && user_1.uni_deposit_amount > 0) {
                            activeBoosts.push({
                                type: 'uni_farming',
                                deposit_amount: user_1.uni_deposit_amount,
                                daily_rate: 0.01, // 1% в день
                                status: 'active'
                            });
                        }
                        logger_js_1.logger.info('[BoostService] Найдены активные boost пакеты', {
                            userId: userId,
                            activeBoostsCount: activeBoosts.length
                        });
                        return [2 /*return*/, activeBoosts];
                    case 2:
                        error_14 = _b.sent();
                        logger_js_1.logger.error('[BoostService] Ошибка получения активных boost пакетов:', error_14);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return BoostService;
}());
exports.BoostService = BoostService;
exports.boostService = new BoostService();
