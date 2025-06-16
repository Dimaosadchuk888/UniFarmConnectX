/**
 * Модель данных для модуля Airdrop UniFarm
 * Константы и схема для работы с Supabase
 */

export const AIRDROP_TABLE = 'airdrop_participants';

export const AIRDROP_FIELDS = [
  'id',
  'telegram_id', 
  'user_id',
  'status',
  'reward_amount',
  'created_at',
  'updated_at'
];

export const AIRDROP_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive', 
  COMPLETED: 'completed'
} as const;

export const DEFAULT_AIRDROP_STATUS = AIRDROP_STATUS.ACTIVE;