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

/**
 * Форматирует UNI числа
 */
export function formatUniNumber(amount: number | string, decimals: number = 2): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return '0';
  
  return numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
}

/**
 * Форматирует TON числа
 */
export function formatTonNumber(amount: number | string, decimals: number = 5): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return '0';
  
  return numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals
  });
}

/**
 * Безопасное форматирование суммы
 */
export function safeFormatAmount(amount: number | string, decimals: number = 2, currency: string = ''): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return '0';
  
  const formatted = numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
  
  return currency ? `${formatted} ${currency}` : formatted;
}

/**
 * Возвращает эквивалент в USD для указанной суммы токена
 * @param amount Количество токена
 * @param tokenType Тип токена ('UNI' или 'TON')
 * @returns Строка с USD эквивалентом
 */
export function getUSDEquivalent(amount: number, tokenType: 'UNI' | 'TON'): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '$0.00';
  }
  
  // Динамические курсы токенов к USD
  const exchangeRates = {
    'TON': 5.57, // Актуальный курс TON/USD
    'UNI': 0.12  // Актуальный курс UNI/USD
  };
  
  const rate = exchangeRates[tokenType];
  const usdValue = amount * rate;
  
  // Форматируем с двумя знаками после запятой и символом доллара
  return `$${usdValue.toFixed(2)}`;
}

/**
 * Получает оптимальное количество десятичных знаков
 */
export function getOptimalDecimals(amount: number | string, currency: string): number {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (currency === 'TON') {
    return numAmount > 1 ? 3 : 6;
  }
  
  return numAmount > 1000 ? 0 : 2;
}

/**
 * Получает цветовой класс для транзакции
 */
export function getTransactionColorClass(type: string): string {
  const colorMap: Record<string, string> = {
    deposit: 'text-green-400',
    withdrawal: 'text-red-400',
    reward: 'text-blue-400',
    referral: 'text-purple-400'
  };
  
  return colorMap[type] || 'text-gray-400';
}

/**
 * Получает иконку для типа транзакции
 */
export function getTransactionIcon(type: string): string {
  const iconMap: Record<string, string> = {
    deposit: '↗️',
    withdrawal: '↙️',
    reward: '🎁',
    referral: '👥'
  };
  
  return iconMap[type] || '💰';
}