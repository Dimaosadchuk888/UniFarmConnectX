/**
 * Безопасный обработчик Telegram WebApp API
 * 
 * Обертка над Telegram API с защитой от ошибок и fallback
 * для работы вне Telegram окружения
 */

interface CloudStorageItem {
  [key: string]: string;
}

export class SafeTelegramAPI {
  /**
   * Безопасный вызов метода закрытия приложения
   */
  static async close(): Promise<boolean> {
    try {
      if (window.Telegram?.WebApp?.close) {
        window.Telegram.WebApp.close();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[SafeTelegramAPI] Error closing app:', error);
      return false;
    }
  }

  /**
   * Получение данных из Telegram Cloud Storage
   */
  static async getCloudStorage(keys: string[]): Promise<CloudStorageItem | null> {
    try {
      if (!window.Telegram?.WebApp?.CloudStorage) {
        console.log('[SafeTelegramAPI] CloudStorage not available');
        return null;
      }

      return new Promise((resolve) => {
        window.Telegram.WebApp.CloudStorage.getItems(keys, (error, result) => {
          if (error) {
            console.error('[SafeTelegramAPI] CloudStorage getItems error:', error);
            resolve(null);
          } else {
            resolve(result || null);
          }
        });
      });
    } catch (error) {
      console.error('[SafeTelegramAPI] Error getting cloud storage:', error);
      return null;
    }
  }

  /**
   * Сохранение данных в Telegram Cloud Storage
   */
  static async setCloudStorage(items: CloudStorageItem): Promise<boolean> {
    try {
      if (!window.Telegram?.WebApp?.CloudStorage) {
        console.log('[SafeTelegramAPI] CloudStorage not available');
        return false;
      }

      return new Promise((resolve) => {
        window.Telegram.WebApp.CloudStorage.setItem(
          Object.keys(items)[0], 
          items[Object.keys(items)[0]], 
          (error, result) => {
            if (error) {
              console.error('[SafeTelegramAPI] CloudStorage setItem error:', error);
              resolve(false);
            } else {
              resolve(result || false);
            }
          }
        );
      });
    } catch (error) {
      console.error('[SafeTelegramAPI] Error setting cloud storage:', error);
      return false;
    }
  }

  /**
   * Отправка данных в основной чат бота
   */
  static async sendData(data: string): Promise<boolean> {
    try {
      if (!window.Telegram?.WebApp?.sendData) {
        console.log('[SafeTelegramAPI] sendData not available');
        return false;
      }

      window.Telegram.WebApp.sendData(data);
      return true;
    } catch (error) {
      console.error('[SafeTelegramAPI] Error sending data:', error);
      return false;
    }
  }

  /**
   * Показать всплывающее уведомление
   */
  static async showAlert(message: string): Promise<boolean> {
    try {
      if (!window.Telegram?.WebApp?.showAlert) {
        // Fallback to browser alert
        alert(message);
        return true;
      }

      return new Promise((resolve) => {
        window.Telegram.WebApp.showAlert(message, () => {
          resolve(true);
        });
      });
    } catch (error) {
      console.error('[SafeTelegramAPI] Error showing alert:', error);
      // Fallback to browser alert
      alert(message);
      return true;
    }
  }

  /**
   * Показать диалог подтверждения
   */
  static async showConfirm(message: string): Promise<boolean> {
    try {
      if (!window.Telegram?.WebApp?.showConfirm) {
        // Fallback to browser confirm
        return confirm(message);
      }

      return new Promise((resolve) => {
        window.Telegram.WebApp.showConfirm(message, (confirmed) => {
          resolve(confirmed);
        });
      });
    } catch (error) {
      console.error('[SafeTelegramAPI] Error showing confirm:', error);
      // Fallback to browser confirm
      return confirm(message);
    }
  }

  /**
   * Включить/выключить кнопку закрытия подтверждения
   */
  static enableClosingConfirmation(): void {
    try {
      if (window.Telegram?.WebApp?.enableClosingConfirmation) {
        window.Telegram.WebApp.enableClosingConfirmation();
      }
    } catch (error) {
      console.error('[SafeTelegramAPI] Error enabling closing confirmation:', error);
    }
  }

  /**
   * Отключить кнопку закрытия подтверждения
   */
  static disableClosingConfirmation(): void {
    try {
      if (window.Telegram?.WebApp?.disableClosingConfirmation) {
        window.Telegram.WebApp.disableClosingConfirmation();
      }
    } catch (error) {
      console.error('[SafeTelegramAPI] Error disabling closing confirmation:', error);
    }
  }
}