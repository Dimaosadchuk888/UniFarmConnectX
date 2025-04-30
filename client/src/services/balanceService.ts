import { apiRequest } from '@/lib/queryClient';

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

/**
 * Получает информацию о балансе пользователя
 * @param userId ID пользователя
 * @returns Промис с данными баланса
 */
export async function fetchBalance(userId: number): Promise<Balance> {
  try {
    console.log('[balanceService] Запрос баланса для userId:', userId);
    
    if (!userId) {
      console.error('[balanceService] Ошибка: userId не предоставлен для запроса баланса');
      throw new Error('userId is required to fetch balance');
    }
    
    const response = await apiRequest(`/api/wallet/balance?user_id=${userId}`);
    
    if (!response.success || !response.data) {
      console.error('[balanceService] Ошибка получения баланса:', response.error || 'Unknown error');
      throw new Error(response.error || 'Failed to fetch balance');
    }
    
    const data = response.data;
    console.log('[balanceService] Получены данные баланса:', data);
    
    // Преобразуем данные в нужный формат
    return {
      uniBalance: parseFloat(data.balance_uni) || 0,
      tonBalance: parseFloat(data.balance_ton) || 0,
      uniFarmingActive: !!data.uni_farming_active,
      uniDepositAmount: parseFloat(data.uni_deposit_amount) || 0,
      uniFarmingBalance: parseFloat(data.uni_farming_balance) || 0
    };
  } catch (error) {
    console.error('[balanceService] Ошибка в fetchBalance:', error);
    throw error;
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
    
    const response = await apiRequest('/api/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        amount,
        wallet_address: address
      })
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