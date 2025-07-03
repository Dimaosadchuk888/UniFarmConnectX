import { correctApiRequest } from '@/lib/correctApiRequest';

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

// Создаем кэш для хранения последних полученных данных баланса
let balanceCache: {
  userId?: number;
  timestamp?: number;
  data?: Balance;
} = {};

/**
 * Получает информацию о балансе пользователя
 * @param userId ID пользователя
 * @param forceRefresh Принудительно обновить данные, игнорируя кэш
 * @returns Промис с данными баланса
 */
export async function fetchBalance(userId: number, forceRefresh: boolean = false): Promise<Balance> {
  try {
    // Получаем user_id из JWT токена в localStorage
    const jwtToken = localStorage.getItem('telegramJWT');
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
    
    // Проверяем кэш, если не требуется принудительное обновление
    const now = Date.now();
    if (!forceRefresh && 
        balanceCache.userId === userId && 
        balanceCache.data && 
        balanceCache.timestamp && 
        (now - balanceCache.timestamp) < 60000) { // Кэш действителен 60 секунд
      console.log('[balanceService] Использование кэшированных данных баланса');
      return balanceCache.data;
    }
    
    // Выполняем запрос к API
    console.log('[balanceService] Запрос новых данных баланса из API');
    const response = await correctApiRequest(`/api/v2/wallet/balance?user_id=${targetUserId}`, 'GET');
    
    if (!response.success || !response.data) {
      console.error('[balanceService] Ошибка получения баланса:', response.error || 'Unknown error');
      
      // Если у нас есть кэшированные данные для этого пользователя, возвращаем их как запасной вариант
      if (balanceCache.userId === userId && balanceCache.data) {
        console.log('[balanceService] Возвращаем кэшированные данные после ошибки API');
        return balanceCache.data;
      }
      
      throw new Error(response.error || 'Failed to fetch balance');
    }
    
    const data = response.data;
    console.log('[balanceService] Получены данные баланса:', data);
    
    // Преобразуем данные в нужный формат
    const balance = {
      uniBalance: parseFloat(data.uni_balance) || 0,
      tonBalance: parseFloat(data.ton_balance) || 0,
      uniFarmingActive: !!data.uni_farming_active,
      uniDepositAmount: parseFloat(data.uni_deposit_amount) || 0,
      uniFarmingBalance: parseFloat(data.uni_farming_balance) || 0
    };
    
    // Обновляем кэш
    balanceCache = {
      userId,
      timestamp: now,
      data: balance
    };
    
    return balance;
  } catch (error) {
    console.error('[balanceService] Ошибка в fetchBalance:', error);
    
    // В случае ошибки проверяем, есть ли кэшированные данные
    if (balanceCache.userId === userId && balanceCache.data) {
      console.log('[balanceService] Возвращаем кэшированные данные после исключения');
      return balanceCache.data;
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