/**
 * UniFarm Security Configuration
 * Централизованные настройки безопасности для production
 */

// Валидационные константы
export const SECURITY_LIMITS = {
  // Финансовые операции
  MIN_UNI_AMOUNT: 0.1,
  MAX_UNI_AMOUNT: 1000000,
  MIN_TON_AMOUNT: 0.01,
  MAX_TON_AMOUNT: 100000,
  
  // Пользовательские данные
  MAX_USERNAME_LENGTH: 50,
  MAX_REF_CODE_LENGTH: 20,
  MAX_WALLET_ADDRESS_LENGTH: 100,
  MIN_WALLET_ADDRESS_LENGTH: 10,
  
  // Миссии и задания
  MAX_MISSION_PROOF_LENGTH: 500,
  MAX_MISSIONS_PER_USER: 50,
  
  // Общие лимиты
  MAX_STRING_INPUT: 1000,
  MAX_DESCRIPTION_LENGTH: 2000
} as const;

// Rate limiting конфигурации
export const RATE_LIMITS = {
  // Чтение данных - 200 запросов в 15 минут
  READ_OPERATIONS: {
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Слишком много запросов на чтение. Попробуйте через 15 минут'
  },
  
  // Стандартные операции - 100 запросов в 15 минут
  STANDARD_OPERATIONS: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Слишком много запросов. Попробуйте через 15 минут'
  },
  
  // Критические финансовые операции - 10 запросов в 1 минуту
  FINANCIAL_OPERATIONS: {
    windowMs: 60 * 1000,
    max: 10,
    message: 'Превышен лимит для финансовых операций. Попробуйте через минуту'
  },
  
  // Административные операции - 50 запросов в 5 минут
  ADMIN_OPERATIONS: {
    windowMs: 5 * 60 * 1000,
    max: 50,
    message: 'Превышен лимит для административных операций'
  }
} as const;

// Regex паттерны для валидации
export const VALIDATION_PATTERNS = {
  NUMERIC_ID: /^\d+$/,
  DECIMAL_AMOUNT: /^\d+(\.\d{1,6})?$/,
  TON_AMOUNT: /^\d+(\.\d{1,9})?$/,
  TON_HASH: /^[a-fA-F0-9]{64}$/,
  REF_CODE: /^[A-Z0-9_]{3,20}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,50}$/,
  WALLET_ADDRESS: /^[a-zA-Z0-9]{10,100}$/
} as const;

// Сообщения об ошибках валидации
export const VALIDATION_MESSAGES = {
  INVALID_AMOUNT: 'Неверный формат суммы',
  AMOUNT_TOO_LOW: 'Сумма слишком мала',
  AMOUNT_TOO_HIGH: 'Сумма слишком велика',
  INVALID_USER_ID: 'ID пользователя должен быть числом',
  INVALID_WALLET: 'Неверный адрес кошелька',
  INVALID_CURRENCY: 'Валюта должна быть UNI или TON',
  INVALID_MISSION_ID: 'ID миссии должен быть положительным числом',
  INVALID_PACKAGE_ID: 'ID пакета должен быть положительным числом',
  INVALID_TON_HASH: 'Неверный хэш TON транзакции',
  MISSING_REQUIRED_FIELD: 'Обязательное поле отсутствует',
  STRING_TOO_LONG: 'Строка слишком длинная'
} as const;

// Конфигурация CORS для безопасности
export const CORS_CONFIG = {
  origin: [
    'https://uni-farm-connect-x-ab245275.replit.app',
    'https://t.me',
    /^https:\/\/.*\.replit\.app$/,
    /^https:\/\/.*\.replit\.dev$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Telegram-Init-Data',
    'X-User-Agent',
    'Accept',
    'Origin'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400 // 24 часа
} as const;

// JWT конфигурация
export const JWT_CONFIG = {
  expiresIn: '7d',
  algorithm: 'HS256' as const,
  issuer: 'unifarm-api',
  audience: 'unifarm-client'
} as const;