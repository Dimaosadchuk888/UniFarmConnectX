import { apiRequest } from '@/lib/queryClient';

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
 * Получает список транзакций пользователя
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
  try {
    console.log('[transactionService] Запрос транзакций для userId:', userId);
    
    if (!userId) {
      console.error('[transactionService] Ошибка: userId не предоставлен для запроса транзакций');
      throw new Error('userId is required to fetch transactions');
    }
    
    const response = await apiRequest(`/api/wallet/transactions?user_id=${userId}&limit=${limit}&offset=${offset}`);
    
    if (!response.success || !response.data) {
      console.error('[transactionService] Ошибка получения транзакций:', response.error || 'Unknown error');
      throw new Error(response.error || 'Failed to fetch transactions');
    }
    
    console.log('[transactionService] Получены транзакции:', response.data);
    
    // Преобразуем данные в нужный формат
    return response.data.map((tx: any) => formatTransaction(tx));
  } catch (error) {
    console.error('[transactionService] Ошибка в fetchTransactions:', error);
    throw error;
  }
}

/**
 * Форматирует сырые данные транзакции в удобный формат
 * @param rawTransaction Сырые данные транзакции с сервера
 * @returns Отформатированная транзакция
 */
function formatTransaction(rawTransaction: any): Transaction {
  const type = formatTransactionType(rawTransaction.type);
  const title = getTransactionTitle(type);
  const category = getTransactionCategory(type);
  
  return {
    id: rawTransaction.id,
    type: type,
    title: title,
    amount: parseFloat(rawTransaction.amount) || 0,
    tokenType: rawTransaction.token_type || 'UNI',
    timestamp: new Date(rawTransaction.created_at),
    status: formatTransactionStatus(rawTransaction.status),
    source: rawTransaction.source || '',
    category: category,
    description: rawTransaction.description || ''
  };
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
    'airdrop': TransactionType.AIRDROP
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
    [TransactionType.AIRDROP]: 'airdrop'
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
    [TransactionType.AIRDROP]: 'Airdrop'
  };
  
  return titleMap[type] || 'Другая операция';
}