/**
 * Admin Bot model constants
 */

export const ADMIN_BOT_TABLES = {
  USERS: 'users',
  WITHDRAWAL_REQUESTS: 'withdrawal_requests',
  TRANSACTIONS: 'transactions'
} as const;

export const ADMIN_BOT_CONFIG = {
  POLLING_INTERVAL: 1000,
  PAGE_LIMIT: 10,
  MAX_MESSAGE_LENGTH: 4096
} as const;

export const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PROCESSING: 'processing'
} as const;

export const ADMIN_BOT_COMMANDS = {
  START: '/start',
  ADMIN: '/admin',
  STATS: '/stats',
  USERS: '/users',
  USER: '/user',
  MISSIONS: '/missions',
  MISSION_COMPLETE: '/mission_complete',
  MISSION_REWARD: '/mission_reward',
  BAN: '/ban',
  WITHDRAWALS: '/withdrawals',
  APPROVE: '/approve',
  REJECT: '/reject'
} as const;

export const ADMIN_BOT_MESSAGES = {
  ACCESS_DENIED: '❌ Доступ запрещен. Вы не являетесь администратором.',
  UNKNOWN_COMMAND: 'Неизвестная команда. Используйте /admin для просмотра доступных команд.',
  ERROR_GENERIC: '❌ Произошла ошибка при выполнении команды',
  SUCCESS_GENERIC: '✅ Команда выполнена успешно'
} as const;