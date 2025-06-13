import { apiRequest } from '@/lib/queryClient';
import { correctApiRequest } from '@/lib/correctApiRequest';

/**
 * Типы транзакций
 */
export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  BONUS = 'bonus',
  FARMING_DEPOSIT = 'farming_deposit',
  FARMING_REWARD = 'farming_reward',
  FARMING_HARVEST = 'farming_harvest',
  REFERRAL_REWARD = 'referral_reward',
  DAILY_BONUS = 'daily_bonus',
  SIGNUP_BONUS = 'signup_bonus',
  AIRDROP = 'airdrop',
  TON_BOOST = 'ton_boost',
  BOOST = 'boost',
  TON_FARMING_REWARD = 'ton_farming_reward',
  UNKNOWN = 'unknown'
}

/**
 * Статусы транзакций
 */
export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Интерфейс для транзакции
 */
export interface Transaction {
  id: string | number;
  type: string;
  amount: number;
  tokenType: string;
  timestamp: Date;
  status: string;
  source?: string;
  category?: string;
  title?: string;
  description?: string;
}

/**
 * Получает список всех транзакций пользователя
 * @param userId ID пользователя
 * @param limit Ограничение по количеству транзакций
 * @param offset Смещение для пагинации
 * @returns Промис со списком транзакций
 */
export async function fetchTransactions(
  userId: number,
  limit: number = 10,
  offset: number = 0
): Promise<Transaction[]> {
  try {if (!userId) {throw new Error('userId is required to fetch transactions');
    }
    
    // Используем улучшенный метод correctApiRequest с обработкой ошибок// Добавляем поддержку как старого, так и нового пути API
    const response = await correctApiRequest(`/api/transactions?user_id=${userId}&limit=${limit}&offset=${offset}`, 'GET', null, {
      additionalLogging: true,
      errorHandling: {
        report404: true,
        detailed: true,
        traceId: `transactions-${Date.now()}`
      }
    });
    
    // Для отладки: вывести полный ответ// correctApiRequest сам обрабатывает основные ошибки запроса,
    // но мы все равно проверяем структуру данных для более надежной работы
    if (!response.success || !response.data) {throw new Error('Некорректная структура ответа при получении транзакций');
    }// Проверяем структуру ответа
    if (!response.data || !response.data.transactions) {return [];
    }
    
    // Преобразуем данные в нужный формат
    return response.data.transactions.map((tx: any) => formatTransaction(tx));
  } catch (error) {throw error;
  }
}

/**
 * Получает список TON транзакций пользователя (с увеличенным лимитом)
 * @param userId ID пользователя
 * @param limit Ограничение по количеству транзакций (увеличенное по умолчанию для TON)
 * @param offset Смещение для пагинации
 * @returns Промис со списком TON транзакций
 */
export async function fetchTonTransactions(
  userId: number,
  limit: number = 50,  // Увеличенный лимит для TON транзакций
  offset: number = 0
): Promise<Transaction[]> {
  try {if (!userId) {throw new Error('userId is required to fetch TON transactions');
    }
    
    // Делаем прямой запрос на API для получения всех транзакций
    const response = await correctApiRequest(`/api/transactions?user_id=${userId}&limit=${limit}&offset=${offset}`, 'GET', null, {
      additionalLogging: true,
      errorHandling: {
        report404: true,
        detailed: true,
        traceId: `ton-transactions-${Date.now()}`
      }
    });if (!response.success || !response.data || !response.data.transactions) {return [];
    }
    
    // Логируем все типы транзакций для отладки
    const allTypes = response.data.transactions.map((tx: any) => 
      `${tx.type}:${tx.currency || tx.token_type || 'unknown'}`
    );// Фильтруем TON транзакции, учитывая разные возможные имена полей
    const tonTransactions = response.data.transactions.filter((tx: any) => {
      const currency = (tx.currency || tx.token_type || '').toUpperCase();
      const type = (tx.type || '').toLowerCase();
      const source = (tx.source || '').toLowerCase();
      const category = (tx.category || '').toLowerCase();
      
      // Дополнительное логирование всех TON-связанных транзакций
      if (currency === 'TON' || type.includes('ton') || source.includes('ton') || 
          type === 'boost_purchase' || (category === 'boost' && currency === 'TON')) {}
      
      // Ищем начисления от TON Boost
      if (source.includes('ton boost') || source.match(/ton\s+boost/i)) {}
      
      // Проверяем по различным признакам TON-транзакций:
      // 1. Валюта TON
      // 2. Тип транзакции связан с TON (boost_purchase, ton_boost, ton_farming_reward)
      // 3. Источник транзакции содержит TON
      // 4. Категория связана с farming или boost
      // 5. Проверяем начисления TON Boost через специальные проверки
      
      // Проверка на начисления TON Boost
      // Многие начисления от TON Boost могут быть в UNI и TON
      const isTonBoostReward = 
        (source.includes('ton boost') || source.includes('ton farming')) ||
        (type === 'boost_bonus' && (
          source.toLowerCase().includes('ton') || 
          // Проверяем любые бонусы от TON Boost включая UNI-награды
          (tx.description && tx.description.toLowerCase().includes('ton'))
        )) ||
        (type === 'ton_farming_reward') ||
        // Ищем начисления UNI, которые связаны с TON Boost
        (currency === 'UNI' && source.toLowerCase().includes('ton'));
        
      if (isTonBoostReward) {}
        
      return currency === 'TON' || 
             type.includes('ton') ||
             type === 'boost_purchase' ||  // Покупка TON Boost пакетов
             type === 'ton_boost' ||       // TON Boost операции
             source.includes('ton') ||
             type === 'ton_farming_reward' || // TON Farming награды
             (category === 'boost' && currency === 'TON') ||
             isTonBoostReward;  // Начисления от TON Boost
    });// Логирование для отладки
    if (tonTransactions.length > 0) {} else {}
    
    // Преобразуем данные в нужный формат
    return tonTransactions.map((tx: any) => formatTransaction(tx));
  } catch (error) {return []; // Возвращаем пустой массив вместо выброса ошибки для устойчивости
  }
}

/**
 * Форматирует сырые данные транзакции в удобный формат
 * @param rawTransaction Сырые данные транзакции с сервера
 * @returns Отформатированная транзакция
 */
function formatTransaction(rawTransaction: any): Transaction {
  // Проверяем наличие полей в сыром объекте
  if (!rawTransaction || typeof rawTransaction !== 'object') {// Возвращаем объект с дефолтными значениями для безопасности
    return {
      id: 0,
      type: TransactionType.UNKNOWN,
      title: 'Неизвестная транзакция',
      amount: 0,
      tokenType: 'UNI',
      timestamp: new Date(),
      status: TransactionStatus.PENDING,
      source: '',
      category: 'other',
      description: 'Данные транзакции недоступны'
    };
  }
  
  // Выводим все поля транзакции для отладки// Определяем тип токена из currency или token_type
  let tokenType = 'UNI';
  if (rawTransaction.currency) {
    tokenType = rawTransaction.currency.toUpperCase();
  } else if (rawTransaction.token_type) {
    tokenType = rawTransaction.token_type.toUpperCase();
  }
  
  // Проверка и логирование для TON транзакций
  if (tokenType === 'TON') {}
  
  // Определяем тип транзакции
  const type = formatTransactionType(rawTransaction.type || 'unknown');
  const title = getTransactionTitle(type);
  const category = getTransactionCategory(type) || rawTransaction.category || 'other';
  
  // Определяем timestamp из created_at или timestamp
  let timestamp = new Date();
  if (rawTransaction.created_at) {
    timestamp = new Date(rawTransaction.created_at);
  } else if (rawTransaction.timestamp) {
    timestamp = new Date(rawTransaction.timestamp);
  }
  
  // Определяем статус транзакции  
  const status = formatTransactionStatus(rawTransaction.status || 'pending');
  
  // Создаем форматированный объект Transaction
  const formattedTransaction: Transaction = {
    id: rawTransaction.id || 0,
    type: type,
    title: rawTransaction.title || title,
    amount: typeof rawTransaction.amount === 'string' ? parseFloat(rawTransaction.amount) : (rawTransaction.amount || 0),
    tokenType: tokenType,
    timestamp: timestamp,
    status: status,
    source: rawTransaction.source || '',
    category: category,
    description: rawTransaction.description || ''
  };
  
  return formattedTransaction;
}

/**
 * Форматирует тип транзакции в стандартный формат
 * @param type Тип транзакции из API
 * @returns Стандартизированный тип транзакции
 */
function formatTransactionType(type: string): string {
  const typeMap: { [key: string]: string } = {
    'deposit': TransactionType.DEPOSIT,
    'withdrawal': TransactionType.WITHDRAWAL,
    'bonus': TransactionType.BONUS,
    'farming_deposit': TransactionType.FARMING_DEPOSIT,
    'farming_reward': TransactionType.FARMING_REWARD,
    'farming_harvest': TransactionType.FARMING_HARVEST,
    'referral_reward': TransactionType.REFERRAL_REWARD,
    'daily_bonus': TransactionType.DAILY_BONUS,
    'signup_bonus': TransactionType.SIGNUP_BONUS,
    'airdrop': TransactionType.AIRDROP,
    'ton_boost': TransactionType.TON_BOOST,
    'boost': TransactionType.BOOST,
    'boost_purchase': TransactionType.TON_BOOST, // Новый тип транзакции для boost_purchase
    'ton_farming_reward': TransactionType.TON_FARMING_REWARD
  };
  
  return typeMap[type.toLowerCase()] || TransactionType.UNKNOWN;
}

/**
 * Форматирует статус транзакции в стандартный формат
 * @param status Статус транзакции из API
 * @returns Стандартизированный статус транзакции
 */
function formatTransactionStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    'pending': TransactionStatus.PENDING,
    'completed': TransactionStatus.COMPLETED,
    'failed': TransactionStatus.FAILED
  };
  
  return statusMap[status.toLowerCase()] || TransactionStatus.PENDING;
}

/**
 * Получает категорию транзакции на основе типа
 * @param type Тип транзакции
 * @returns Категория транзакции
 */
function getTransactionCategory(type: string): string {
  const categoryMap: { [key: string]: string } = {
    [TransactionType.DEPOSIT]: 'deposit',
    [TransactionType.WITHDRAWAL]: 'withdrawal',
    [TransactionType.FARMING_DEPOSIT]: 'farming',
    [TransactionType.FARMING_REWARD]: 'farming',
    [TransactionType.FARMING_HARVEST]: 'farming',
    [TransactionType.BONUS]: 'bonus',
    [TransactionType.REFERRAL_REWARD]: 'referral',
    [TransactionType.DAILY_BONUS]: 'bonus',
    [TransactionType.SIGNUP_BONUS]: 'bonus',
    [TransactionType.AIRDROP]: 'airdrop',
    [TransactionType.TON_BOOST]: 'boost',
    [TransactionType.BOOST]: 'boost',
    [TransactionType.TON_FARMING_REWARD]: 'farming'
  };
  
  return categoryMap[type] || 'other';
}

/**
 * Получает заголовок транзакции на основе типа
 * @param type Тип транзакции
 * @returns Заголовок транзакции
 */
function getTransactionTitle(type: string): string {
  const titleMap: { [key: string]: string } = {
    [TransactionType.DEPOSIT]: 'Пополнение',
    [TransactionType.WITHDRAWAL]: 'Вывод средств',
    [TransactionType.FARMING_DEPOSIT]: 'Депозит в фарминг',
    [TransactionType.FARMING_REWARD]: 'Доход фарминга',
    [TransactionType.FARMING_HARVEST]: 'Сбор фарминга',
    [TransactionType.BONUS]: 'Бонус',
    [TransactionType.REFERRAL_REWARD]: 'Реферальное вознаграждение',
    [TransactionType.DAILY_BONUS]: 'Ежедневный бонус',
    [TransactionType.SIGNUP_BONUS]: 'Бонус регистрации',
    [TransactionType.AIRDROP]: 'Airdrop',
    [TransactionType.TON_BOOST]: 'Покупка TON Boost',
    [TransactionType.BOOST]: 'Boost пакет',
    [TransactionType.TON_FARMING_REWARD]: 'Начисление TON фарминга',
    'boost_purchase': 'Покупка TON Boost'
  };
  
  return titleMap[type] || 'Другая операция';
}