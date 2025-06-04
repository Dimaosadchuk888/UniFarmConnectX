/**
 * Интегрированный сервис кошелька
 * Связывает фронтенд модуль с бекенд API
 */
import { apiClient } from '../../core/api';
import type { User } from '../../core/types';

export interface WalletBalance {
  balance_uni: string;
  balance_ton: string;
  uni_farming_balance?: string;
  total_uni: string;
  total_ton: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  type: 'deposit' | 'withdrawal' | 'farming_reward' | 'referral_bonus' | 'mission_reward';
  token_type: 'UNI' | 'TON';
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  hash?: string;
  created_at: string;
  updated_at: string;
}

export interface WalletResponse {
  success: boolean;
  data?: any;
  message?: string;
}

export class WalletService {
  /**
   * Получить баланс пользователя
   */
  static async getBalance(userId: number): Promise<WalletResponse> {
    try {
      const response = await apiClient.get<WalletResponse>(`/api/v2/wallet/balance/${userId}`);
      return response;
    } catch (error) {
      console.error('[WalletService] Get balance error:', error);
      return {
        success: false,
        message: 'Ошибка получения баланса'
      };
    }
  }

  /**
   * Подключить TON кошелек
   */
  static async connectTonWallet(userId: number, walletAddress: string): Promise<WalletResponse> {
    try {
      const response = await apiClient.post<WalletResponse>('/api/v2/wallet/connect/ton', {
        user_id: userId,
        wallet_address: walletAddress
      });
      return response;
    } catch (error) {
      console.error('[WalletService] Connect TON wallet error:', error);
      return {
        success: false,
        message: 'Ошибка подключения TON кошелька'
      };
    }
  }

  /**
   * Отключить TON кошелек
   */
  static async disconnectTonWallet(userId: number): Promise<WalletResponse> {
    try {
      const response = await apiClient.post<WalletResponse>('/api/v2/wallet/disconnect/ton', {
        user_id: userId
      });
      return response;
    } catch (error) {
      console.error('[WalletService] Disconnect TON wallet error:', error);
      return {
        success: false,
        message: 'Ошибка отключения TON кошелька'
      };
    }
  }

  /**
   * Создать депозит
   */
  static async createDeposit(userId: number, amount: string, tokenType: 'UNI' | 'TON'): Promise<WalletResponse> {
    try {
      const response = await apiClient.post<WalletResponse>('/api/v2/wallet/deposit', {
        user_id: userId,
        amount,
        token_type: tokenType
      });
      return response;
    } catch (error) {
      console.error('[WalletService] Create deposit error:', error);
      return {
        success: false,
        message: 'Ошибка создания депозита'
      };
    }
  }

  /**
   * Создать вывод средств
   */
  static async createWithdrawal(userId: number, amount: string, tokenType: 'UNI' | 'TON', toAddress: string): Promise<WalletResponse> {
    try {
      const response = await apiClient.post<WalletResponse>('/api/v2/wallet/withdrawal', {
        user_id: userId,
        amount,
        token_type: tokenType,
        to_address: toAddress
      });
      return response;
    } catch (error) {
      console.error('[WalletService] Create withdrawal error:', error);
      return {
        success: false,
        message: 'Ошибка создания вывода'
      };
    }
  }

  /**
   * Получить историю транзакций
   */
  static async getTransactionHistory(userId: number, limit: number = 50, offset: number = 0): Promise<{
    success: boolean;
    data?: Transaction[];
    total?: number;
    message?: string;
  }> {
    try {
      const response = await apiClient.get(`/api/v2/wallet/transactions/${userId}?limit=${limit}&offset=${offset}`);
      return response;
    } catch (error) {
      console.error('[WalletService] Get transaction history error:', error);
      return {
        success: false,
        message: 'Ошибка получения истории транзакций'
      };
    }
  }

  /**
   * Получить статус транзакции
   */
  static async getTransactionStatus(transactionId: number): Promise<WalletResponse> {
    try {
      const response = await apiClient.get<WalletResponse>(`/api/v2/wallet/transaction/${transactionId}/status`);
      return response;
    } catch (error) {
      console.error('[WalletService] Get transaction status error:', error);
      return {
        success: false,
        message: 'Ошибка получения статуса транзакции'
      };
    }
  }

  /**
   * Валидация адреса кошелька
   */
  static async validateWalletAddress(address: string, type: 'TON'): Promise<{
    success: boolean;
    isValid?: boolean;
    message?: string;
  }> {
    try {
      const response = await apiClient.post('/api/v2/wallet/validate', {
        address,
        type
      });
      return response;
    } catch (error) {
      console.error('[WalletService] Validate wallet address error:', error);
      return {
        success: false,
        message: 'Ошибка валидации адреса'
      };
    }
  }

  /**
   * Получить комиссии за транзакции
   */
  static async getTransactionFees(tokenType: 'UNI' | 'TON', amount: string): Promise<{
    success: boolean;
    data?: {
      networkFee: string;
      serviceFee: string;
      totalFee: string;
    };
    message?: string;
  }> {
    try {
      const response = await apiClient.post('/api/v2/wallet/fees', {
        token_type: tokenType,
        amount
      });
      return response;
    } catch (error) {
      console.error('[WalletService] Get transaction fees error:', error);
      return {
        success: false,
        message: 'Ошибка получения комиссий'
      };
    }
  }
}