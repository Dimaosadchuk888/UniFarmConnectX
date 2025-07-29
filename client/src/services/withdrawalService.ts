import { apiRequest } from '@/lib/queryClient';
import { correctApiRequest } from '@/lib/correctApiRequest';
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
  error_type?: 'authentication_required' | 'validation_error' | 'server_error' | 'network_error' | 'business_logic_error' | 'unknown_error';
}

/**
 * Отправляет запрос на вывод средств с расширенной обработкой ошибок и логированием
 * @param userId ID пользователя
 * @param data Данные формы вывода средств
 * @returns Промис с результатом запроса - идентификатор транзакции при успехе или объект ошибки при неудаче
 */
export async function submitWithdrawal(
  userId: number, 
  data: WithdrawalFormData
): Promise<number | WithdrawalError> {
  // Создаем уникальный идентификатор операции для логирования
  const requestId = `withdraw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  
  try {
    // Входная валидация с защитой от ошибок
    if (userId === undefined || userId === null) {
      console.error(`[submitWithdrawal] [${requestId}] Не указан идентификатор пользователя`);
      return {
        message: 'Не указан идентификатор пользователя. Пожалуйста, авторизуйтесь заново',
        field: 'user_id'
      };
    }
    
    if (!data) {
      console.error(`[submitWithdrawal] [${requestId}] Отсутствуют данные формы`);
      return {
        message: 'Не предоставлены данные для вывода средств',
      };
    }
    
    // Валидация суммы
    let amount: number | string = data.amount;
    try {
      // Обрабатываем случаи, когда amount может прийти как строка
      if (typeof amount === 'string') {
        amount = parseFloat(amount);
        if (isNaN(amount)) {
          console.error(`[submitWithdrawal] [${requestId}] Некорректная сумма: "${data.amount}"`);
          return {
            message: 'Указана некорректная сумма вывода',
            field: 'amount'
          };
        }
      }
      
      if (amount <= 0) {
        console.error(`[submitWithdrawal] [${requestId}] Сумма должна быть положительной: ${amount}`);
        return {
          message: 'Сумма вывода должна быть больше нуля',
          field: 'amount'
        };
      }
    } catch (amountError) {
      console.error(`[submitWithdrawal] [${requestId}] Ошибка при обработке суммы:`, amountError);
      return {
        message: 'Ошибка при обработке суммы вывода',
        field: 'amount'
      };
    }
    
    // Валидация адреса для TON
    if (data.currency === 'TON' && (!data.wallet_address || data.wallet_address.trim().length < 10)) {
      console.error(`[submitWithdrawal] [${requestId}] Отсутствует или неверный адрес кошелька: "${data.wallet_address}"`);
      return {
        message: 'Необходимо указать корректный адрес TON кошелька',
        field: 'wallet_address'
      };
    }
    
    // Формируем данные для запроса с безопасным преобразованием типов
    const requestData = {
      user_id: Number(userId),
      amount: String(amount), // Преобразуем в строку, как ожидает сервер
      currency: data.currency as string, 
      wallet_address: data.wallet_address || ''
    };
    
    console.log(`[submitWithdrawal] [${requestId}] Отправка запроса на вывод: ${requestData.amount} ${requestData.currency}`);
    
    // Отправляем запрос на сервер с улучшенной обработкой ошибок через correctApiRequest
    let response;
    try {
      console.log(`[submitWithdrawal] [${requestId}] Используем correctApiRequest для запроса`);
      
      // correctApiRequest автоматически обрабатывает сетевые ошибки и стандартизирует ответ
      response = await correctApiRequest('/api/v2/wallet/withdraw', 'POST', requestData);
      
      console.log(`[submitWithdrawal] [${requestId}] Получен ответ от сервера:`, 
                   typeof response === 'object' ? JSON.stringify(response).slice(0, 100) + '...' : response);
    } catch (error) {
      console.error(`[submitWithdrawal] [${requestId}] Ошибка при выполнении запроса:`, error);
      
      // Проверяем тип ошибки для правильной обработки
      if ((error as any).status === 401 || (error as any).needAuth) {
        console.log(`[submitWithdrawal] [${requestId}] Authentication error detected`);
        return {
          message: 'Требуется повторная авторизация. Войдите в приложение заново',
          error_type: 'authentication_required'
        };
      }
      
      // Проверяем валидационные ошибки
      if ((error as any).status === 400) {
        console.log(`[submitWithdrawal] [${requestId}] Validation error detected`);
        return {
          message: (error as any).message || 'Ошибка валидации данных',
          error_type: 'validation_error'
        };
      }
      
      // Проверяем серверные ошибки
      if ((error as any).status >= 500) {
        console.log(`[submitWithdrawal] [${requestId}] Server error detected`);
        return {
          message: 'Временные проблемы с сервером. Попробуйте позже',
          error_type: 'server_error'
        };
      }
      
      // ИСПРАВЛЕНИЕ: Обработка business logic errors (API возвращает содержательные сообщения)
      if ((error as any).error && typeof (error as any).error === 'string') {
        console.log(`[submitWithdrawal] [${requestId}] Business logic error detected:`, (error as any).error);
        return {
          message: (error as any).error, // Показываем точное сообщение от API ("Недостаточно средств. Доступно: X TON")
          error_type: 'business_logic_error'
        };
      }
      
      // Только для реальных network errors (TypeError from fetch)
      if (error instanceof Error && error.name === 'TypeError' && error.message.includes('fetch')) {
        console.log(`[submitWithdrawal] [${requestId}] Network error detected`);
        return {
          message: 'Ошибка сети при отправке запроса. Пожалуйста, проверьте подключение к интернету',
          error_type: 'network_error'
        };
      }
      
      // Общая обработка для неизвестных ошибок
      console.log(`[submitWithdrawal] [${requestId}] Unknown error type detected`);
      return {
        message: (error as any).message || 'Произошла неожиданная ошибка. Попробуйте еще раз',
        error_type: 'unknown_error'
      };
    }
    
    // Проверка на валидность ответа с защитой от null/undefined
    if (!response) {
      console.error(`[submitWithdrawal] [${requestId}] Получен пустой ответ от сервера`);
      return {
        message: 'Получен пустой ответ от сервера',
      };
    }
    
    // Обработка успешного ответа
    try {
      if (response.success === true && response.data?.transaction_id) {
        // Дополнительная проверка ID транзакции
        const transactionId = Number(response.data.transaction_id);
        if (isNaN(transactionId) || transactionId <= 0) {
          console.error(`[submitWithdrawal] [${requestId}] Некорректный ID транзакции: ${response.data.transaction_id}`);
          return {
            message: 'Получен некорректный ID транзакции от сервера',
          };
        }
        
        console.log(`[submitWithdrawal] [${requestId}] Запрос на вывод успешно создан. ID транзакции: ${transactionId}`);
        return transactionId;
      }
    } catch (parseError) {
      console.error(`[submitWithdrawal] [${requestId}] Ошибка при обработке успешного ответа:`, parseError);
      return {
        message: 'Ошибка при обработке ответа сервера',
      };
    }
    
    // Если дошли сюда, значит в ответе нет success или transaction_id
    // Извлекаем сообщение об ошибке из ответа
    const errorMessage = extractErrorMessage(response);
    console.error(`[submitWithdrawal] [${requestId}] Ошибка от сервера:`, errorMessage);
    
    return {
      message: errorMessage,
    };
  } catch (error) {
    // Обрабатываем непредвиденные исключения
    console.error(`[submitWithdrawal] [${requestId}] Критическая ошибка:`, error);
    
    // Возвращаем объект ошибки с дополнительной информацией
    return {
      message: error instanceof Error 
        ? error.message 
        : typeof error === 'string'
          ? error
          : 'Произошла непредвиденная ошибка при выводе средств',
    };
  }
}

/**
 * Вспомогательная функция для извлечения сообщения об ошибке из разных форматов ответа сервера
 */
function extractErrorMessage(response: any): string {
  try {
    // Проверяем разные варианты расположения сообщения об ошибке
    if (typeof response === 'object' && response !== null) {
      // Приоритет по порядку: error, message, errors[], data.message
      if (typeof response.error === 'string' && response.error) {
        return response.error;
      }
      
      if (typeof response.message === 'string' && response.message) {
        return response.message;
      }
      
      if (Array.isArray(response.errors) && response.errors.length > 0) {
        const firstError = response.errors[0];
        if (typeof firstError === 'string') return firstError;
        if (typeof firstError === 'object' && firstError?.message) return firstError.message;
      }
      
      if (response.data && typeof response.data.message === 'string') {
        return response.data.message;
      }
      
      // Если ничего не нашли, но объект не пустой
      if (Object.keys(response).length > 0) {
        return `Неизвестная ошибка: ${JSON.stringify(response).slice(0, 100)}...`;
      }
    }
    
    // Для непредвиденных форматов
    return 'Произошла ошибка при обработке запроса на вывод средств';
  } catch (extractError) {
    console.error('[extractErrorMessage] Ошибка при извлечении сообщения:', extractError);
    return 'Не удалось определить причину ошибки';
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