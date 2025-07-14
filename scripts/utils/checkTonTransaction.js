"use strict";
/**
 * TON Blockchain Transaction Checker
 * Проверка статуса транзакций через TON API
 */
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
exports.checkTonTransaction = checkTonTransaction;
exports.checkMultipleTonTransactions = checkMultipleTonTransactions;
var logger_1 = require("../core/logger");
var tonBoost_1 = require("../config/tonBoost");
/**
 * Проверяет статус TON транзакции через tonapi.io
 * @param txHash Хеш транзакции в TON blockchain
 * @returns Результат проверки транзакции
 */
function checkTonTransaction(txHash) {
    return __awaiter(this, void 0, void 0, function () {
        var apiUrl, response, transactionData, isConfirmed, amount, nanotons, expectedWalletAddress, receiverAddress, result, error_1;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 3, , 4]);
                    logger_1.logger.info('[TON Checker] Начало проверки транзакции', { txHash: txHash });
                    if (!txHash || txHash.length < 10) {
                        logger_1.logger.error('[TON Checker] Невалидный tx_hash', { txHash: txHash });
                        return [2 /*return*/, {
                                success: false,
                                confirmed: false,
                                error: 'Невалидный хеш транзакции'
                            }];
                    }
                    apiUrl = "https://tonapi.io/v2/blockchain/transactions/".concat(txHash);
                    logger_1.logger.info('[TON Checker] Запрос к TON API', { apiUrl: apiUrl });
                    return [4 /*yield*/, fetch(apiUrl, {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json',
                                'User-Agent': 'UniFarm-Bot/1.0'
                            }
                        })];
                case 1:
                    response = _e.sent();
                    if (!response.ok) {
                        if (response.status === 404) {
                            logger_1.logger.warn('[TON Checker] Транзакция не найдена в блокчейне', {
                                txHash: txHash,
                                status: response.status
                            });
                            return [2 /*return*/, {
                                    success: true,
                                    confirmed: false,
                                    error: 'Транзакция не найдена в блокчейне'
                                }];
                        }
                        logger_1.logger.error('[TON Checker] Ошибка TON API', {
                            txHash: txHash,
                            status: response.status,
                            statusText: response.statusText
                        });
                        return [2 /*return*/, {
                                success: false,
                                confirmed: false,
                                error: "TON API error: ".concat(response.status)
                            }];
                    }
                    return [4 /*yield*/, response.json()];
                case 2:
                    transactionData = _e.sent();
                    logger_1.logger.info('[TON Checker] Получены данные транзакции', {
                        txHash: txHash,
                        hasData: !!transactionData,
                        success: transactionData === null || transactionData === void 0 ? void 0 : transactionData.success
                    });
                    isConfirmed = transactionData &&
                        transactionData.success === true &&
                        ((_a = transactionData.compute_phase) === null || _a === void 0 ? void 0 : _a.exit_code) === 0;
                    amount = void 0;
                    if ((_b = transactionData === null || transactionData === void 0 ? void 0 : transactionData.in_msg) === null || _b === void 0 ? void 0 : _b.value) {
                        nanotons = parseInt(transactionData.in_msg.value);
                        amount = (nanotons / 1e9).toString();
                    }
                    expectedWalletAddress = (0, tonBoost_1.getTonBoostWalletAddress)();
                    receiverAddress = (_d = (_c = transactionData === null || transactionData === void 0 ? void 0 : transactionData.in_msg) === null || _c === void 0 ? void 0 : _c.destination) === null || _d === void 0 ? void 0 : _d.address;
                    if (isConfirmed && receiverAddress && receiverAddress !== expectedWalletAddress) {
                        logger_1.logger.warn('[TON Checker] Транзакция отправлена на неправильный адрес', {
                            txHash: txHash,
                            expected: expectedWalletAddress,
                            actual: receiverAddress
                        });
                        return [2 /*return*/, {
                                success: false,
                                confirmed: false,
                                error: 'Транзакция отправлена на неправильный адрес кошелька'
                            }];
                    }
                    result = {
                        success: true,
                        confirmed: isConfirmed,
                        amount: amount
                    };
                    logger_1.logger.info('[TON Checker] Результат проверки транзакции', {
                        txHash: txHash,
                        confirmed: result.confirmed,
                        amount: result.amount
                    });
                    return [2 /*return*/, result];
                case 3:
                    error_1 = _e.sent();
                    logger_1.logger.error('[TON Checker] Критическая ошибка проверки транзакции', {
                        txHash: txHash,
                        error: error_1 instanceof Error ? error_1.message : String(error_1)
                    });
                    return [2 /*return*/, {
                            success: false,
                            confirmed: false,
                            error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438: ".concat(error_1 instanceof Error ? error_1.message : 'Неизвестная ошибка')
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Проверяет статус множественных транзакций
 * @param txHashes Массив хешей транзакций
 * @returns Результаты проверки для каждой транзакции
 */
function checkMultipleTonTransactions(txHashes) {
    return __awaiter(this, void 0, void 0, function () {
        var results, _i, txHashes_1, txHash, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    logger_1.logger.info('[TON Checker] Проверка множественных транзакций', {
                        count: txHashes.length
                    });
                    results = {};
                    _i = 0, txHashes_1 = txHashes;
                    _c.label = 1;
                case 1:
                    if (!(_i < txHashes_1.length)) return [3 /*break*/, 5];
                    txHash = txHashes_1[_i];
                    _a = results;
                    _b = txHash;
                    return [4 /*yield*/, checkTonTransaction(txHash)];
                case 2:
                    _a[_b] = _c.sent();
                    if (!(txHashes.length > 1)) return [3 /*break*/, 4];
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                case 3:
                    _c.sent();
                    _c.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5:
                    logger_1.logger.info('[TON Checker] Завершена проверка множественных транзакций', {
                        total: txHashes.length,
                        confirmed: Object.values(results).filter(function (r) { return r.confirmed; }).length
                    });
                    return [2 /*return*/, results];
            }
        });
    });
}
