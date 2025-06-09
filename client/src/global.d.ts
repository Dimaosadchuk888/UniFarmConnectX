/**
 * Расширения для глобальных типов
 */

interface Window {
  /**
   * Безопасная функция для создания Map из любых данных
   * @template K - тип ключа
   * @template V - тип значения
   * @param entries - итерируемый объект с парами [ключ, значение] или любой объект
   * @returns Map с безопасно обработанными данными
   */
  safeCreateMap<K, V>(entries?: any): Map<K, V>;
  
  /**
   * Индекс процесса для совместимости с некоторыми библиотеками
   */
  process: any;

  /**
   * Telegram WebApp объект с расширенными свойствами
   */
  Telegram?: {
    WebApp: TelegramWebApp & {
      textColor?: string;
      hintColor?: string;
      linkColor?: string;
      buttonColor?: string;
      buttonTextColor?: string;
      secondaryBackgroundColor?: string;
      openLink?: (url: string, options?: any) => void;
      showPopup?: (params: any, callback?: (id: string) => void) => void;
      showAlert?: (message: string, callback?: () => void) => void;
      showConfirm?: (message: string, callback?: (confirmed: boolean) => void) => void;
      enableClosingConfirmation?: () => void;
      disableClosingConfirmation?: () => void;
      CloudStorage?: {
        setItem: (key: string, value: string, callback?: (error: Error | null, success: boolean) => void) => void;
        getItem: (key: string, callback?: (error: Error | null, value: string) => void) => void;
        getItems: (keys: string[], callback?: (error: Error | null, values: Record<string, string>) => void) => void;
        removeItem: (key: string, callback?: (error: Error | null, success: boolean) => void) => void;
        removeItems: (keys: string[], callback?: (error: Error | null, success: boolean) => void) => void;
        getKeys: (callback?: (error: Error | null, keys: string[]) => void) => void;
      };
    };
  };
}