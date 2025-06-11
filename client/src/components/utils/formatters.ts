/**
 * Utility functions for formatting data
 */

/**
 * Format amount with proper decimal places and currency symbol
 */
export const formatAmount = (amount: number, currency: string = 'UNI'): string => {
  if (amount === 0) return `0 ${currency}`;
  
  // Handle large numbers with appropriate formatting
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M ${currency}`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(2)}K ${currency}`;
  } else if (amount >= 1) {
    return `${amount.toFixed(2)} ${currency}`;
  } else {
    return `${amount.toFixed(6)} ${currency}`;
  }
};

/**
 * Format date to readable string
 */
export const formatDate = (timestamp: number | string | Date): string => {
  const date = new Date(timestamp);
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * Format number with precision
 */
export const formatNumberWithPrecision = (num: number, precision: number = 2): string => {
  return num.toFixed(precision);
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};