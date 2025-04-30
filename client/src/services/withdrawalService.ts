import { apiRequest } from '@/lib/queryClient';
import { WithdrawalFormData } from '@/schemas/withdrawalSchema';

/**
 * Структура успешного ответа API при отправке запроса на вывод средств
 */
interface WithdrawalResponse {
  success: boolean;
  message: string;
  data?: {
    transaction_id: number;
    status: string;
  };
  error?: string;
}

/**
 * Интерфейс ошибки вывода средств
 */
export interface WithdrawalError {
  message: string;
  field?: string;
}

/**
 * Отправляет запрос на вывод средств
 * @param userId ID пользователя
 * @param data Данные формы вывода средств
 * @returns Промис с результатом запроса - идентификатор транзакции при успехе или объект ошибки при неудаче
 */
export async function submitWithdrawal(
  userId: number, 
  data: WithdrawalFormData
): Promise<number | WithdrawalError> {
  try {
    // Формируем данные для запроса
    const requestData = {
      user_id: userId,
      amount: data.amount,
      currency: data.currency, 
      wallet_address: data.wallet_address
    };
    
    // Отправляем запрос на сервер
    const response = await apiRequest('/api/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
    
    // Возвращаем ID транзакции при успехе
    if (response.success && response.data?.transaction_id) {
      return response.data.transaction_id;
    }
    
    // Обрабатываем ошибки от сервера
    throw new Error(response.error || response.message || 'Произошла ошибка при обработке запроса');
  } catch (error) {
    // Возвращаем объект ошибки
    return {
      message: error instanceof Error ? error.message : 'Неизвестная ошибка',
    };
  }
}

/**
 * Проверяет, является ли ответ сервера ошибкой
 * @param result Результат запроса на вывод средств
 * @returns true, если результат является ошибкой
 */
export function isWithdrawalError(result: number | WithdrawalError): result is WithdrawalError {
  return typeof result !== 'number' && 'message' in result;
}