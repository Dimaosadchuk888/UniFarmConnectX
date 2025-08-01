import { correctApiRequest } from '@/lib/correctApiRequest';
import { cacheService } from './cacheService';

/**
 * Интерфейс для данных UNI фарминга
 */
export interface UniFarmingData {
  user_id: number;
  balance_uni: number;
  uni_farming_active: boolean;
  uni_deposit_amount: number;
  uni_farming_balance: number;
  uni_farming_rate: number;
  uni_farming_start_timestamp: string;
  timestamp: string;
}

/**
 * Интерфейс для данных TON фарминга
 */
export interface TonFarmingData {
  isActive: boolean;
  totalDeposit: number;
  totalIncome: number;
  dailyIncome: number;
  monthlyRate: number;
  totalRatePerSecond: number;
  userBoosts?: any[];
  timestamp?: string;
}

// Константы кеширования
const CACHE_CONFIG = {
  UNI_FARMING_KEY: (userId: number) => `uni-farming:${userId}`,
  TON_FARMING_KEY: (userId: number) => `ton-farming:${userId}`,
  FARMING_TTL: 15000 // 15 секунд, как в компонентах
};

/**
 * Получает статус UNI фарминга
 * @param userId ID пользователя
 * @param forceRefresh Принудительно обновить данные
 * @returns Промис с данными UNI фарминга
 */
export async function fetchUniFarmingStatus(userId: number, forceRefresh: boolean = false): Promise<UniFarmingData | null> {
  const cacheKey = CACHE_CONFIG.UNI_FARMING_KEY(userId);
  
  try {
    // Проверяем кеш
    if (!forceRefresh) {
      const cached = cacheService.get<UniFarmingData>(cacheKey);
      if (cached) {
        return cached;
      }
    } else {
      cacheService.invalidate(cacheKey);
    }
    
    // Запрос к API
    console.log('[farmingService] Запрос UNI фарминг статуса для userId:', userId);
    const response = await correctApiRequest(`/api/v2/uni-farming/status?user_id=${userId}`, 'GET');
    
    if (!response.success || !response.data) {
      console.error('[farmingService] Ошибка получения UNI фарминг статуса:', response.error);
      
      // Возвращаем кешированные данные при ошибке
      const cachedFallback = cacheService.get<UniFarmingData>(cacheKey);
      if (cachedFallback) {
        return cachedFallback;
      }
      
      return null;
    }
    
    // Сохраняем в кеш
    cacheService.set(cacheKey, response.data, CACHE_CONFIG.FARMING_TTL);
    
    return response.data;
  } catch (error) {
    console.error('[farmingService] Критическая ошибка в fetchUniFarmingStatus:', error);
    
    // Пытаемся вернуть кешированные данные
    const cachedError = cacheService.get<UniFarmingData>(cacheKey);
    if (cachedError) {
      return cachedError;
    }
    
    return null;
  }
}

/**
 * Получает статус TON фарминга (boost)
 * @param userId ID пользователя
 * @param forceRefresh Принудительно обновить данные
 * @returns Промис с данными TON фарминга
 */
export async function fetchTonFarmingStatus(userId: number, forceRefresh: boolean = false): Promise<TonFarmingData | null> {
  const cacheKey = CACHE_CONFIG.TON_FARMING_KEY(userId);
  
  try {
    // Проверяем кеш
    if (!forceRefresh) {
      const cached = cacheService.get<TonFarmingData>(cacheKey);
      if (cached) {
        return cached;
      }
    } else {
      cacheService.invalidate(cacheKey);
    }
    
    // Запрос к API
    console.log('[farmingService] Запрос TON фарминг статуса для userId:', userId);
    const response = await correctApiRequest(`/api/v2/boost/farming-status?user_id=${userId}`, 'GET');
    
    if (!response.success || !response.data) {
      console.error('[farmingService] Ошибка получения TON фарминг статуса:', response.error);
      
      // Возвращаем кешированные данные при ошибке
      const cachedFallback = cacheService.get<TonFarmingData>(cacheKey);
      if (cachedFallback) {
        return cachedFallback;
      }
      
      return null;
    }
    
    // Сохраняем в кеш
    cacheService.set(cacheKey, response.data, CACHE_CONFIG.FARMING_TTL);
    
    return response.data;
  } catch (error) {
    console.error('[farmingService] Критическая ошибка в fetchTonFarmingStatus:', error);
    
    // Пытаемся вернуть кешированные данные
    const cachedError = cacheService.get<TonFarmingData>(cacheKey);
    if (cachedError) {
      return cachedError;
    }
    
    return null;
  }
}

/**
 * Инвалидирует весь кеш фарминга для пользователя
 * @param userId ID пользователя
 */
export function invalidateFarmingCache(userId: number): void {
  console.log('[farmingService] Инвалидация кеша фарминга для userId:', userId);
  cacheService.invalidate(CACHE_CONFIG.UNI_FARMING_KEY(userId));
  cacheService.invalidate(CACHE_CONFIG.TON_FARMING_KEY(userId));
}

/**
 * Обновляет кеш фарминга через WebSocket
 * @param userId ID пользователя
 * @param type Тип фарминга
 * @param data Новые данные
 */
export function updateFarmingCache(userId: number, type: 'uni' | 'ton', data: UniFarmingData | TonFarmingData): void {
  const cacheKey = type === 'uni' 
    ? CACHE_CONFIG.UNI_FARMING_KEY(userId)
    : CACHE_CONFIG.TON_FARMING_KEY(userId);
  
  console.log(`[farmingService] Обновление кеша ${type} фарминга через WebSocket для userId:`, userId);
  cacheService.set(cacheKey, data, CACHE_CONFIG.FARMING_TTL);
}