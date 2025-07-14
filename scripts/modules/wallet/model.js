"use strict";
/**
 * Модели кошелька - описывают структуры таблиц wallet и transactions в базе данных
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionStatus = exports.TransactionType = exports.WALLET_CONFIG = exports.WALLET_TABLES = void 0;
// Supabase table constants
exports.WALLET_TABLES = {
    USERS: 'users',
    TRANSACTIONS: 'transactions'
};
// Wallet configuration constants
exports.WALLET_CONFIG = {
    DEFAULT_BALANCE: '0',
    PRECISION_DECIMALS: 6,
    MAX_TRANSACTION_AMOUNT: '1000000'
};
// Define wallet-specific enums
var TransactionType;
(function (TransactionType) {
    TransactionType["DEPOSIT"] = "deposit";
    TransactionType["WITHDRAWAL"] = "withdrawal";
    TransactionType["FARMING_REWARD"] = "farming_reward";
    TransactionType["REFERRAL_BONUS"] = "referral_bonus";
    TransactionType["DAILY_BONUS"] = "daily_bonus";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["CONFIRMED"] = "confirmed";
    TransactionStatus["FAILED"] = "failed";
    TransactionStatus["CANCELLED"] = "cancelled";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
