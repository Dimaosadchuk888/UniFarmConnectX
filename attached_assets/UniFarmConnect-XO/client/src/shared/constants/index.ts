/**
 * Общие константы приложения
 */

export const APP_NAME = 'UniFarm';

export const CURRENCY_SYMBOLS = {
  UNI: 'UNI',
  TON: 'TON',
  USD: 'USD',
} as const;

export const USER_TYPES = {
  GUEST: 'guest',
  REGISTERED: 'registered',
} as const;

export const API_ENDPOINTS = {
  ME: '/api/me',
  USERS: '/api/users',
  MISSIONS: '/api/missions',
  TRANSACTIONS: '/api/transactions',
  REFERRALS: '/api/referrals',
} as const;

export const QUERY_KEYS = {
  USER: ['/api/me'],
  MISSIONS: ['/api/missions'],
  USER_MISSIONS: ['/api/user-missions'],
  TRANSACTIONS: ['/api/transactions'],
  REFERRALS: ['/api/referrals'],
} as const;