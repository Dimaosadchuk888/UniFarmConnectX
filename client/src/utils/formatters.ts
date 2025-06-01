/**
 * Утилиты форматирования для UniFarm клиентской части
 */

/**
 * Форматирует сумму с учетом типа токена
 */
export function formatAmount(amount: number | string, tokenType: string = 'UNI'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return '0';
  
  if (tokenType === 'TON') {
    return numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 5
    });
  }
  
  return numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

/**
 * Форматирует дату в понятный формат
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Форматирует дату и время
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Форматирует процент
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Форматирует реферальный уровень
 */
export function formatReferralLevel(level: number): string {
  return `Уровень ${level}`;
}

/**
 * Форматирует награду за реферала
 */
export function formatReferralReward(level: number): string {
  if (level === 1) return '100%';
  if (level === 2) return '2%';
  return `${level}%`;
}

/**
 * Форматирует сумму транзакции с знаком
 */
export function formatTransactionAmount(amount: number, type: 'deposit' | 'withdrawal' | 'reward'): string {
  const sign = type === 'withdrawal' ? '-' : '+';
  return `${sign}${formatAmount(amount)}`;
}

/**
 * Форматирует статус
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    active: 'Активен',
    inactive: 'Неактивен',
    pending: 'В ожидании',
    completed: 'Завершен',
    failed: 'Ошибка'
  };
  
  return statusMap[status] || status;
}

/**
 * Сокращает длинный адрес кошелька
 */
export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Форматирует большие числа с сокращениями
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}