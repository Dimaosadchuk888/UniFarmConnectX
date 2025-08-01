import { correctApiRequest } from '@/lib/correctApiRequest';
import { cacheService } from './cacheService';

/**
 * Интерфейс для данных баланса пользователя
 */
export interface Balance {
  uniBalance: number;
  tonBalance: number;
  uniFarmingActive: boolean;
  uniDepositAmount: number;
  uniFarmingBalance: number;
}

// Константы кеширования
const CACHE_CONFIG = {
  BALANCE_KEY: (userId: number) => `balance:${userId}`,
  BALANCE_TTL: 30000 // 30 секунд вместо 10
};

/**
 * Получает информацию о балансе пользователя
 * @param userId ID пользователя
 * @param forceRefresh Принудительно обновить данные, игнорируя кэш
 * @returns Промис с данными баланса
 */
export async function fetchBalance(userId: number, forceRefresh: boolean = false): Promise<Balance> {
  // Получаем user_id из JWT токена в localStorage
  const jwtToken = localStorage.getItem('unifarm_jwt_token');
  let targetUserId = userId;
  
  // Если userId не передан, получаем из JWT
  if (!targetUserId && jwtToken) {
    try {
      const payload = JSON.parse(atob(jwtToken.split('.')[1]));
      targetUserId = payload.userId || payload.user_id;
      console.log('[balanceService] User ID получен из JWT:', targetUserId);
    } catch (error) {
      console.error('[balanceService] Ошибка декодирования JWT:', error);
      targetUserId = userId || 1; // fallback
    }
  }
  
  console.log('[balanceService] Запрос баланса для userId:', targetUserId, 'forceRefresh:', forceRefresh);
  
  // Ключ кеша для данного пользователя
  const cacheKey = CACHE_CONFIG.BALANCE_KEY(targetUserId);
  
  try {
    
    // Проверяем кэш, если не требуется принудительное обновление
    if (!forceRefresh) {
      const cachedBalance = cacheService.get<Balance>(cacheKey);
      if (cachedBalance) {
        return cachedBalance;
      }
    } else {
      // Если forceRefresh=true, очищаем кэш принудительно
      console.log('[balanceService] Принудительная очистка кэша баланса');
      cacheService.invalidate(cacheKey);
    }
    
    // Выполняем запрос к API
    console.log('[balanceService] Запрос новых данных баланса из API');
    const response = await correctApiRequest(`/api/v2/wallet/balance?user_id=${targetUserId}`, 'GET');
    
    if (!response.success || !response.data) {
      console.error('[balanceService] Ошибка получения баланса:', response.error || 'Unknown error');
      
      // Если у нас есть кэшированные данные для этого пользователя, возвращаем их как запасной вариант
      const cachedFallback = cacheService.get<Balance>(cacheKey);
      if (cachedFallback) {
        console.log('[balanceService] Возвращаем кэшированные данные после ошибки API');
        return cachedFallback;
      }
      
      throw new Error(response.error || 'Failed to fetch balance');
    }
    
    const data = response.data;
    console.log('[balanceService] Получены данные баланса:', data);
    
    // Преобразуем данные в нужный формат (поддерживаем оба формата API ответов)
    const balance = {
      uniBalance: parseFloat(data.uniBalance || data.uni_balance) || 0,
      tonBalance: parseFloat(data.tonBalance || data.ton_balance) || 0,
      uniFarmingActive: !!(data.uniFarmingActive || data.uni_farming_active),
      uniDepositAmount: parseFloat(data.uniDepositAmount || data.uni_deposit_amount) || 0,
      uniFarmingBalance: parseFloat(data.uniFarmingBalance || data.uni_farming_balance) || 0
    };
    
    // Сохраняем в кеш
    cacheService.set(cacheKey, balance, CACHE_CONFIG.BALANCE_TTL);
    
    return balance;
  } catch (error) {
    console.error('[balanceService] Ошибка в fetchBalance:', error);
    
    // В случае ошибки проверяем, есть ли кэшированные данные
    const cachedError = cacheService.get<Balance>(cacheKey);
    if (cachedError) {
      console.log('[balanceService] Возвращаем кэшированные данные после исключения');
      return cachedError;
    }
    
    // Если кэша нет, создаем пустой объект баланса
    return {
      uniBalance: 0,
      tonBalance: 0,
      uniFarmingActive: false,
      uniDepositAmount: 0,
      uniFarmingBalance: 0
    };
  }
}

/**
 * Запрос на вывод средств
 * @param userId ID пользователя
 * @param amount Сумма для вывода
 * @param address Адрес TON кошелька
 * @returns Промис с результатом операции
 */
export async function requestWithdrawal(userId: number, amount: string, address: string) {
  try {
    if (!userId || !amount || !address) {
      throw new Error('userId, amount и address обязательны для запроса на вывод');
    }
    
    const response = await correctApiRequest('/api/v2/wallet/withdraw', 'POST', {
      user_id: userId,
      amount,
      wallet_address: address
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Ошибка при запросе на вывод средств');
    }
    
    return response.data;
  } catch (error) {
    console.error('[balanceService] Ошибка в requestWithdrawal:', error);
    throw error;
  }
}