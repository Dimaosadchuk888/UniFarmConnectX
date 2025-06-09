import APP_CONFIG from '@/config/app';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = APP_CONFIG.API.BASE_URL;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Auth methods
  async getUserByGuestId(guestId: string) {
    return this.request(`${APP_CONFIG.API.ENDPOINTS.USER}/by-guest-id?guest_id=${guestId}`);
  }

  async createUser(data: { guestId: string; refCode?: string }) {
    return this.request(APP_CONFIG.API.ENDPOINTS.USER, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Wallet methods
  async getBalance(userId: number) {
    return this.request(`${APP_CONFIG.API.ENDPOINTS.WALLET}/balance?user_id=${userId}`);
  }

  async withdraw(userId: number, data: any) {
    return this.request(`${APP_CONFIG.API.ENDPOINTS.WALLET}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, ...data }),
    });
  }

  // Farming methods
  async getFarmingInfo(userId: number) {
    return this.request(`${APP_CONFIG.API.ENDPOINTS.FARMING}/info?user_id=${userId}`);
  }

  async startFarming(userId: number, amount: string) {
    return this.request(`${APP_CONFIG.API.ENDPOINTS.FARMING}/start`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, amount }),
    });
  }

  async harvestFarming(userId: number) {
    return this.request(`${APP_CONFIG.API.ENDPOINTS.FARMING}/harvest`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  // TON Boost methods
  async getTonBoostPackages() {
    return this.request(`${APP_CONFIG.API.ENDPOINTS.TON_BOOST}/packages`);
  }

  async getActiveTonBoosts(userId: number) {
    return this.request(`${APP_CONFIG.API.ENDPOINTS.TON_BOOST}/active?user_id=${userId}`);
  }

  async purchaseTonBoost(userId: number, data: any) {
    return this.request(`${APP_CONFIG.API.ENDPOINTS.TON_BOOST}/purchase`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, ...data }),
    });
  }

  // Missions methods
  async getMissions(userId: number) {
    return this.request(`${APP_CONFIG.API.ENDPOINTS.MISSIONS}?user_id=${userId}`);
  }

  async completeMission(userId: number, missionId: number) {
    return this.request(`${APP_CONFIG.API.ENDPOINTS.MISSIONS}/complete`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, mission_id: missionId }),
    });
  }

  // Referral methods
  async getReferralInfo(userId: number) {
    return this.request(`${APP_CONFIG.API.ENDPOINTS.REFERRAL}/info?user_id=${userId}`);
  }

  async getReferralList(userId: number) {
    return this.request(`${APP_CONFIG.API.ENDPOINTS.REFERRAL}/list?user_id=${userId}`);
  }
}

export const apiClient = new ApiClient();
export default apiClient;