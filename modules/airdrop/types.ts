/**
 * Типы для модуля Airdrop UniFarm
 * Обработка участников airdrop программы
 */

export interface AirdropParticipant {
  id: number;
  telegram_id: number;
  user_id: number;
  status: 'active' | 'inactive' | 'completed';
  reward_amount?: string;
  created_at: string;
  updated_at?: string;
}

export interface RegisterAirdropPayload {
  telegram_id: number;
}

export interface AirdropResponse {
  success: boolean;
  message: string;
  code?: number;
  data?: AirdropParticipant;
}

export interface AirdropStatus {
  registered: boolean;
  status?: 'active' | 'inactive' | 'completed';
  reward_amount?: string;
  registration_date?: string;
}

export interface AirdropListResponse {
  success: boolean;
  participants: AirdropParticipant[];
  total: number;
}

export type AirdropServiceResponse = {
  success: boolean;
  message: string;
  code?: number;
};