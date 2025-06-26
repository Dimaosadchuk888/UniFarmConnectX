/**
 * NEW UserService with FIXED data structure handling
 * Resolves the critical caching issue by using fresh implementation
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

export interface ApiError {
  hasError: boolean;
  message: string;
  code?: string;
  details?: any;
}

const USER_CACHE_KEY = 'unifarm_user_data_v2';
const CACHE_DURATION = 60 * 60 * 1000; // 1 час

class UserServiceNew {
  /**
   * Gets current user with FIXED data structure handling
   */
  async getCurrentUser(forceReload: boolean = false): Promise<User> {
    console.log('[UserServiceNew] Getting current user, forceReload:', forceReload);

    if (!forceReload) {
      const cached = this.getCachedUserData();
      if (cached && this.isValidCachedData(cached)) {
        console.log('[UserServiceNew] Using cached user data:', cached.user);
        return cached.user;
      }
    }

    return await this.fetchUserFromApi();
  }

  /**
   * FIXED: Properly extracts user data from API response structure
   */
  private async fetchUserFromApi(): Promise<User> {
    console.log('[UserServiceNew] Fetching user data from API');
    
    const guestId = localStorage.getItem('unifarm_guest_id') || 
      `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    if (!localStorage.getItem('unifarm_guest_id')) {
      localStorage.setItem('unifarm_guest_id', guestId);
    }

    try {
      const response = await fetch('/api/v2/users/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Guest-ID': guestId
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[UserServiceNew] Raw API response:', data);

      // FIXED: Correctly handle API response structure {data: {user: {...}}}
      if (!data.success || !data.data || !data.data.user) {
        throw new Error('Invalid API response structure');
      }

      const userInfo = data.data.user;
      console.log('[UserServiceNew] Extracted user info:', userInfo);
      
      // FIXED: Create userData directly from API user object
      const userData: User = {
        id: Number(userInfo.id),
        telegram_id: userInfo.telegram_id ? Number(userInfo.telegram_id) : null,
        username: String(userInfo.username || ""),
        balance_uni: String(userInfo.balance_uni || userInfo.uni_balance || "0"),
        balance_ton: String(userInfo.balance_ton || userInfo.ton_balance || "0"),
        ref_code: String(userInfo.ref_code || ""),
        guest_id: String(userInfo.guest_id || guestId),
        created_at: String(userInfo.created_at || "")
      };

      console.log('[UserServiceNew] FIXED: Created userData structure:', userData);

      if (this.isValidUserData(userData)) {
        this.cacheUserData(userData);
        console.log('[UserServiceNew] SUCCESS: User data validated and cached');
        return userData;
      } else {
        throw new Error('User data validation failed');
      }

    } catch (error) {
      console.error('[UserServiceNew] Error fetching user:', error);
      throw new Error(`Failed to get user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates user data structure
   */
  private isValidUserData(data: any): data is User {
    return data && 
           typeof data.id === 'number' && 
           data.id > 0 &&
           typeof data.username === 'string' &&
           typeof data.balance_uni === 'string' &&
           typeof data.balance_ton === 'string' &&
           typeof data.ref_code === 'string' &&
           data.ref_code.length > 0;
  }

  /**
   * Cache user data
   */
  cacheUserData(userData: User): void {
    const cacheData = {
      user: userData,
      timestamp: Date.now()
    };
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(cacheData));
    console.log('[UserServiceNew] User data cached successfully');
  }

  /**
   * Get cached user data
   */
  private getCachedUserData(): { user: User; timestamp: number } | null {
    try {
      const cached = localStorage.getItem(USER_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        return data;
      }
    } catch (error) {
      console.warn('[UserServiceNew] Failed to parse cached data:', error);
    }
    return null;
  }

  /**
   * Check if cached data is valid
   */
  private isValidCachedData(data: any): boolean {
    return data && 
           data.timestamp && 
           (Date.now() - data.timestamp) < CACHE_DURATION &&
           this.isValidUserData(data.user);
  }

  /**
   * Clear user cache
   */
  clearUserCache(): void {
    localStorage.removeItem(USER_CACHE_KEY);
    console.log('[UserServiceNew] User cache cleared');
  }
}

export const userServiceNew = new UserServiceNew();