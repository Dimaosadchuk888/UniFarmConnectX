/**
 * Сервис управления пользователями
 */
import { apiClient } from '../../core/api';
import type { User } from '../../core/types';

class UserService {
  private validateUserData(userData: any): boolean {
    if (!userData || typeof userData !== 'object') {
      console.error('[UserService] Invalid user data: not an object');
      return false;
    }

    const required = ['id', 'balance_uni', 'balance_ton'];
    for (const field of required) {
      if (userData[field] === undefined || userData[field] === null) {
        console.error(`[UserService] Missing required field: ${field}`);
        return false;
      }
    }

    if (typeof userData.id !== 'number' || userData.id <= 0) {
      console.error('[UserService] Invalid user ID');
      return false;
    }

    return true;
  }

  private normalizeUserData(userData: any): User {
    return {
      id: userData.id,
      telegram_id: userData.telegram_id || null,
      username: userData.username || undefined,
      guest_id: userData.guest_id || undefined,
      ref_code: userData.ref_code || '',
      parent_ref_code: userData.parent_ref_code || null,
      balance_uni: String(userData.balance_uni || '0'),
      balance_ton: String(userData.balance_ton || '0'),
      wallet: userData.wallet || undefined,
      ton_wallet_address: userData.ton_wallet_address || undefined,
      uni_deposit_amount: String(userData.uni_deposit_amount || '0'),
      uni_farming_start_timestamp: userData.uni_farming_start_timestamp || null,
      uni_farming_balance: String(userData.uni_farming_balance || '0'),
      uni_farming_rate: String(userData.uni_farming_rate || '0'),
      uni_farming_last_update: userData.uni_farming_last_update || null,
      uni_farming_deposit: String(userData.uni_farming_deposit || '0'),
      uni_farming_activated_at: userData.uni_farming_activated_at || undefined,
      created_at: userData.created_at || undefined,
      checkin_last_date: userData.checkin_last_date || undefined,
      checkin_streak: userData.checkin_streak || 0,
    };
  }

  async getCurrentUser(): Promise<User> {
    try {
      const userData = await apiClient.getCurrentUser();
      
      if (!this.validateUserData(userData)) {
        throw new Error('Invalid user data structure received from API');
      }

      return this.normalizeUserData(userData);
    } catch (error) {
      console.error('[UserService] Error fetching current user:', error);
      throw new Error('Failed to get user data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async createUser(userData: Partial<User>): Promise<User> {
    try {
      const newUser = await apiClient.createUser(userData);
      
      if (!this.validateUserData(newUser)) {
        throw new Error('Invalid user data returned from create API');
      }

      return this.normalizeUserData(newUser);
    } catch (error) {
      console.error('[UserService] Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    try {
      const updatedUser = await apiClient.updateUser(id, userData);
      
      if (!this.validateUserData(updatedUser)) {
        throw new Error('Invalid user data returned from update API');
      }

      return this.normalizeUserData(updatedUser);
    } catch (error) {
      console.error('[UserService] Error updating user:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
export default userService;