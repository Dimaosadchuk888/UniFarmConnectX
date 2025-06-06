// Общие утилиты для всего приложения
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function formatCurrency(amount: string | number, currency: 'UNI' | 'TON' = 'UNI'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${num.toLocaleString()} ${currency}`;
}

export function validateTelegramData(data: any): boolean {
  return data && data.id && typeof data.id === 'string';
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}