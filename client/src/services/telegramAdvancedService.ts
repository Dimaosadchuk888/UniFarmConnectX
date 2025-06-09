/**
 * Telegram Advanced Service
 * Advanced features for Telegram Mini App integration
 */

export interface CloudStorageData {
  [key: string]: string;
}

export class TelegramAdvancedService {
  /**
   * Get data from Telegram Cloud Storage
   */
  async getCloudStorageItem(key: string): Promise<string | null> {
    try {
      if (window.Telegram?.WebApp?.CloudStorage) {
        return await window.Telegram.WebApp.CloudStorage.getItem(key);
      }
    } catch (error) {
      console.warn('[TelegramAdvanced] Failed to get cloud storage item:', error);
    }
    return null;
  }

  /**
   * Set data in Telegram Cloud Storage
   */
  async setCloudStorageItem(key: string, value: string): Promise<boolean> {
    try {
      if (window.Telegram?.WebApp?.CloudStorage) {
        await window.Telegram.WebApp.CloudStorage.setItem(key, value);
        return true;
      }
    } catch (error) {
      console.warn('[TelegramAdvanced] Failed to set cloud storage item:', error);
    }
    return false;
  }

  /**
   * Remove data from Telegram Cloud Storage
   */
  async removeCloudStorageItem(key: string): Promise<boolean> {
    try {
      if (window.Telegram?.WebApp?.CloudStorage) {
        await window.Telegram.WebApp.CloudStorage.removeItem(key);
        return true;
      }
    } catch (error) {
      console.warn('[TelegramAdvanced] Failed to remove cloud storage item:', error);
    }
    return false;
  }

  /**
   * Get multiple items from cloud storage
   */
  async getCloudStorageItems(keys: string[]): Promise<CloudStorageData> {
    try {
      if (window.Telegram?.WebApp?.CloudStorage) {
        return await window.Telegram.WebApp.CloudStorage.getItems(keys);
      }
    } catch (error) {
      console.warn('[TelegramAdvanced] Failed to get cloud storage items:', error);
    }
    return {};
  }

  /**
   * Remove multiple items from cloud storage
   */
  async removeCloudStorageItems(keys: string[]): Promise<boolean> {
    try {
      if (window.Telegram?.WebApp?.CloudStorage) {
        await window.Telegram.WebApp.CloudStorage.removeItems(keys);
        return true;
      }
    } catch (error) {
      console.warn('[TelegramAdvanced] Failed to remove cloud storage items:', error);
    }
    return false;
  }

  /**
   * Send data to Telegram (only for supported apps)
   */
  sendData(data: any): boolean {
    try {
      if (window.Telegram?.WebApp?.sendData) {
        window.Telegram.WebApp.sendData(JSON.stringify(data));
        return true;
      }
    } catch (error) {
      console.warn('[TelegramAdvanced] Failed to send data:', error);
    }
    return false;
  }

  /**
   * Open link in browser
   */
  openLink(url: string): boolean {
    try {
      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(url);
        return true;
      } else {
        // Fallback to regular window.open
        window.open(url, '_blank');
        return true;
      }
    } catch (error) {
      console.warn('[TelegramAdvanced] Failed to open link:', error);
    }
    return false;
  }

  /**
   * Show popup
   */
  showPopup(params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text?: string;
    }>;
  }): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        if (window.Telegram?.WebApp?.showPopup) {
          window.Telegram.WebApp.showPopup(params, (buttonId: string) => {
            resolve(buttonId);
          });
        } else {
          // Fallback to browser alert
          const result = confirm(params.message);
          resolve(result ? 'ok' : 'cancel');
        }
      } catch (error) {
        console.warn('[TelegramAdvanced] Failed to show popup:', error);
        resolve(null);
      }
    });
  }

  /**
   * Show alert
   */
  showAlert(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert(message, () => {
            resolve(true);
          });
        } else {
          // Fallback to browser alert
          alert(message);
          resolve(true);
        }
      } catch (error) {
        console.warn('[TelegramAdvanced] Failed to show alert:', error);
        resolve(false);
      }
    });
  }

  /**
   * Show confirm dialog
   */
  showConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (window.Telegram?.WebApp?.showConfirm) {
          window.Telegram.WebApp.showConfirm(message, (confirmed: boolean) => {
            resolve(confirmed);
          });
        } else {
          // Fallback to browser confirm
          const result = confirm(message);
          resolve(result);
        }
      } catch (error) {
        console.warn('[TelegramAdvanced] Failed to show confirm:', error);
        resolve(false);
      }
    });
  }

  /**
   * Enable closing confirmation
   */
  enableClosingConfirmation(): void {
    try {
      if (window.Telegram?.WebApp?.enableClosingConfirmation) {
        window.Telegram.WebApp.enableClosingConfirmation();
      }
    } catch (error) {
      console.warn('[TelegramAdvanced] Failed to enable closing confirmation:', error);
    }
  }

  /**
   * Disable closing confirmation
   */
  disableClosingConfirmation(): void {
    try {
      if (window.Telegram?.WebApp?.disableClosingConfirmation) {
        window.Telegram.WebApp.disableClosingConfirmation();
      }
    } catch (error) {
      console.warn('[TelegramAdvanced] Failed to disable closing confirmation:', error);
    }
  }

  /**
   * Get launch parameters
   */
  getLaunchParams(): any {
    try {
      if (window.Telegram?.WebApp?.initDataUnsafe) {
        return window.Telegram.WebApp.initDataUnsafe;
      }
    } catch (error) {
      console.warn('[TelegramAdvanced] Failed to get launch params:', error);
    }
    return {};
  }

  /**
   * Check if feature is supported
   */
  isFeatureSupported(feature: string): boolean {
    try {
      const webApp = window.Telegram?.WebApp;
      return !!(webApp && (webApp as any)[feature]);
    } catch (error) {
      console.warn('[TelegramAdvanced] Failed to check feature support:', error);
    }
    return false;
  }
}

export const telegramAdvancedService = new TelegramAdvancedService();