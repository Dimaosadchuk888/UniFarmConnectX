"use strict";
/**
 * Boost Model - Supabase Integration
 * Константы и типы для системы ускорений
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOOST_PACKAGES = exports.BOOST_TRANSACTION_TYPES = exports.BOOST_CONFIG = exports.BOOST_STATUS = exports.BOOST_TYPES = exports.BOOST_TABLES = void 0;
// Supabase table constants
exports.BOOST_TABLES = {
    USERS: 'users',
    TRANSACTIONS: 'transactions'
};
// Boost package types
exports.BOOST_TYPES = {
    FARMING_SPEED: 'farming_speed',
    DAILY_BONUS: 'daily_bonus',
    REFERRAL_BONUS: 'referral_bonus'
};
// Boost status
exports.BOOST_STATUS = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    PENDING: 'pending'
};
// Boost configuration
exports.BOOST_CONFIG = {
    DEFAULT_RATE: 0.01,
    MIN_AMOUNT: '10.0',
    MAX_AMOUNT: '100000.0',
    DEFAULT_DURATION_DAYS: 365, // Изменено на 365 дней
    RATE_PRECISION: 4
};
// Transaction types for boost operations
exports.BOOST_TRANSACTION_TYPES = {
    TON_BOOST_INCOME: 'FARMING_REWARD', // Исправлено для совместимости с БД
    BOOST_UNI_BONUS: 'boost_uni_bonus',
    BOOST_PURCHASE: 'boost_purchase'
};
// Boost package definitions - оригинальная модель с 365 днями и бонусами UNI
exports.BOOST_PACKAGES = {
    STARTER: {
        name: 'Starter Boost',
        daily_rate: '0.01', // 1% в день
        min_amount: '1.0',
        max_amount: '1000.0',
        duration_days: 365,
        uni_bonus: '10000' // 10,000 UNI бонус
    },
    STANDARD: {
        name: 'Standard Boost',
        daily_rate: '0.015', // 1.5% в день
        min_amount: '5.0',
        max_amount: '5000.0',
        duration_days: 365,
        uni_bonus: '50000' // 50,000 UNI бонус
    },
    ADVANCED: {
        name: 'Advanced Boost',
        daily_rate: '0.02', // 2% в день
        min_amount: '10.0',
        max_amount: '10000.0',
        duration_days: 365,
        uni_bonus: '100000' // 100,000 UNI бонус
    },
    PREMIUM: {
        name: 'Premium Boost',
        daily_rate: '0.025', // 2.5% в день
        min_amount: '25.0',
        max_amount: '25000.0',
        duration_days: 365,
        uni_bonus: '500000' // 500,000 UNI бонус
    },
    ELITE: {
        name: 'Elite Boost',
        daily_rate: '0.03', // 3% в день
        min_amount: '50.0',
        max_amount: '100000.0',
        duration_days: 365,
        uni_bonus: '1000000' // 1,000,000 UNI бонус
    }
};
