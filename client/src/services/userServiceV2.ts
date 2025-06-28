/**
 * UserService V2 - Fixed version to bypass browser cache issues
 */

export interface User {
  id: number;
  telegram_id: number | null;
  username: string;
  balance_uni: string;
  balance_ton: string;
  ref_code: string;
  guest_id: string;
  created_at?: string;
  parent_ref_code?: string | null;
}

const USER_CACHE_KEY = 'unifarm_user_cache_v2';

class UserServiceV2 {
  async getCurrentUser(forceReload: boolean = false): Promise<User> {
    console.log('[UserServiceV2] Getting current user, forceReload:', forceReload);
    console.log('[UserServiceV2] Version: 2025.01.26.11.45');
    
    try {
      const guestId = localStorage.getItem('unifarm_guest_id') || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (!localStorage.getItem('unifarm_guest_id')) {
        localStorage.setItem('unifarm_guest_id', guestId);
      }
      
      console.log('[UserServiceV2] Making API request with guest_id:', guestId);

      const response = await fetch('/api/v2/users/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Guest-ID': guestId,
          'Authorization': `Bearer ${localStorage.getItem('unifarm_jwt_token') || ''}`
        }
      });

      const data = await response.json();
      console.log('[UserServiceV2] API response:', data);

      if (!data || !data.success || !data.data || !data.data.user) {
        throw new Error('Invalid API response');
      }

      // Extract user data directly from the correct location
      const userInfo = data.data.user;
      console.log('[UserServiceV2] User info extracted:', userInfo);
      console.log('[UserServiceV2] ref_code from API:', userInfo.ref_code);

      // Create clean user object
      const userData: User = {
        id: Number(userInfo.id) || 0,
        telegram_id: userInfo.telegram_id ? Number(userInfo.telegram_id) : null,
        username: String(userInfo.username || ""),
        balance_uni: String(userInfo.balance_uni || userInfo.uni_balance || "0"),
        balance_ton: String(userInfo.balance_ton || userInfo.ton_balance || "0"),
        ref_code: String(userInfo.ref_code || ""),
        guest_id: String(userInfo.guest_id || guestId),
        created_at: userInfo.created_at
      };

      console.log('[UserServiceV2] Final userData:', userData);
      console.log('[UserServiceV2] Final ref_code:', userData.ref_code);

      // Cache the data
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify({
        userData,
        timestamp: Date.now()
      }));

      return userData;
    } catch (error) {
      console.error('[UserServiceV2] Error getting user:', error);
      throw error;
    }
  }

  clearUserCache(): void {
    localStorage.removeItem(USER_CACHE_KEY);
    console.log('[UserServiceV2] Cache cleared');
  }

  async hasRealUserId(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user.telegram_id !== null && user.telegram_id !== 43;
    } catch (error) {
      return false;
    }
  }
}

export const userService = new UserServiceV2();

export async function getUserByGuestId(guestId: string): Promise<any> {
  try {
    const response = await fetch(`/api/v2/users/guest/${guestId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.success && data.data) {
      return data.data;
    } else {
      throw new Error(data.message || 'Failed to get user data');
    }
  } catch (error) {
    console.error('[UserServiceV2] Error getting user by guest ID:', error);
    throw error;
  }
}