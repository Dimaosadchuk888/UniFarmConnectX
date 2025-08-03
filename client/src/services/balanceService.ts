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
  BALANCE_TTL: 60000, // 60 секунд - увеличено для стабильности
  FALLBACK_MAX_AGE: 120000, // 2 минуты - максимальный возраст для fallback кеша
  STALE_WHILE_REVALIDATE: 30000, // 30 секунд - время для stale-while-revalidate
  MIN_CACHE_AGE: 3000 // 3 секунды - минимальный возраст кеша для сохранения при forceRefresh
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
    
    // УМНОЕ КЕШИРОВАНИЕ: проверяем кэш с учетом stale-while-revalidate
    const cachedItem = cacheService.cacheMap?.get(cacheKey);
    if (cachedItem && !forceRefresh) {
      const cacheAge = Date.now() - cachedItem.timestamp;
      if (cacheAge <= CACHE_CONFIG.BALANCE_TTL) {
        console.log(`[balanceService] ✅ Возвращаем свежий кеш (возраст: ${Math.round(cacheAge / 1000)}с)`);
        return cachedItem.data;
      }
    }
    
    // SMART FORCE REFRESH: не удаляем кеш полностью если он свежий
    if (forceRefresh && cachedItem) {
      const cacheAge = Date.now() - cachedItem.timestamp;
      if (cacheAge < CACHE_CONFIG.MIN_CACHE_AGE) {
        console.log(`[balanceService] 🛡️ Сохраняем свежий кеш при forceRefresh (возраст: ${Math.round(cacheAge / 1000)}с < ${CACHE_CONFIG.MIN_CACHE_AGE / 1000}с)`);
        return cachedItem.data;
      } else {
        console.log(`[balanceService] 🔄 Обновляем кеш при forceRefresh (возраст: ${Math.round(cacheAge / 1000)}с)`);
      }
    }
    
    // Выполняем запрос к API
    console.log('[balanceService] Запрос новых данных баланса из API');
    const response = await correctApiRequest(`/api/v2/wallet/balance?user_id=${targetUserId}`, 'GET');
    
    if (!response.success || !response.data) {
      console.error('[balanceService] Ошибка получения баланса:', response.error || 'Unknown error');
      
      // УМНЫЙ FALLBACK: Проверяем возраст кеша перед возвратом старых данных
      const cachedItem = cacheService.cacheMap?.get(cacheKey);
      if (cachedItem) {
        const cacheAge = Date.now() - cachedItem.timestamp;
        const isStale = cacheAge > CACHE_CONFIG.FALLBACK_MAX_AGE;
        
        console.log(`[balanceService] FALLBACK АНАЛИЗ:`, {
          cacheAge: `${Math.round(cacheAge / 1000)}с`,
          maxAge: `${CACHE_CONFIG.FALLBACK_MAX_AGE / 1000}с`,
          isStale,
          userId: targetUserId,
          reason: response.error || 'API_FAIL'
        });
        
        if (!isStale) {
          console.log('[balanceService] ✅ Возвращаем СВЕЖИЙ кэш после ошибки API');
          cacheService.recordFallbackUsed();
          return cachedItem.data;
        } else {
          console.warn('[balanceService] 🚨 КЕШ УСТАРЕЛ, не возвращаем старые данные', {
            cacheAgeMinutes: Math.round(cacheAge / 60000),
            action: 'throw_error_instead'
          });
          cacheService.recordStaleFallbackRejected();
        }
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
    
    // Сохраняем в кеш с увеличенным TTL для стабильности
    console.log('[balanceService] 💾 Сохраняем свежие данные в кеш', {
      userId: targetUserId,
      ttl: `${CACHE_CONFIG.BALANCE_TTL / 1000}с`,
      uniBalance: balance.uniBalance,
      tonBalance: balance.tonBalance,
      cacheStrategy: 'smart_caching_v2'
    });
    cacheService.set(cacheKey, balance, CACHE_CONFIG.BALANCE_TTL);
    
    return balance;
  } catch (error) {
    console.error('[balanceService] Ошибка в fetchBalance:', error);
    
    // УМНЫЙ FALLBACK: В случае ошибки проверяем возраст кэшированных данных
    const cachedErrorItem = cacheService.cacheMap?.get(cacheKey);
    if (cachedErrorItem) {
      const cacheAge = Date.now() - cachedErrorItem.timestamp;
      const isStale = cacheAge > CACHE_CONFIG.FALLBACK_MAX_AGE;
      
      console.log(`[balanceService] EXCEPTION FALLBACK АНАЛИЗ:`, {
        cacheAge: `${Math.round(cacheAge / 1000)}с`,
        maxAge: `${CACHE_CONFIG.FALLBACK_MAX_AGE / 1000}с`,
        isStale,
        userId: targetUserId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (!isStale) {
        console.log('[balanceService] ✅ Возвращаем СВЕЖИЙ кэш после исключения');
        cacheService.recordFallbackUsed();
        return cachedErrorItem.data;
      } else {
        console.warn('[balanceService] 🚨 КЕШ УСТАРЕЛ при исключении, возвращаем пустой баланс');
        cacheService.recordStaleFallbackRejected();
      }
    }
    
    console.log('[balanceService] 📊 FALLBACK СТАТИСТИКА:', cacheService.getStats());
    
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