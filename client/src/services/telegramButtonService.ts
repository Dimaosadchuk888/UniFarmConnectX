/**
 * Telegram Button Service
 * Manages MainButton and BackButton for Telegram Mini App
 */

export class TelegramButtonService {
  private mainButtonCallbacks: Map<string, () => void> = new Map();
  private backButtonCallbacks: Map<string, () => void> = new Map();

  /**
   * Show main button with text and callback
   */
  showMainButton(text: string, callback: () => void, options?: {
    color?: string;
    textColor?: string;
    isVisible?: boolean;
    isActive?: boolean;
  }): string {
    try {
      if (window.Telegram?.WebApp?.MainButton) {
        const mainButton = window.Telegram.WebApp.MainButton;
        const callbackId = Math.random().toString(36).substring(2);
        
        this.mainButtonCallbacks.set(callbackId, callback);
        
        mainButton.text = text;
        mainButton.show();
        
        if (options?.color) {
          mainButton.color = options.color;
        }
        if (options?.textColor) {
          mainButton.textColor = options.textColor;
        }
        if (options?.isActive !== undefined) {
          if (options.isActive) {
            mainButton.enable();
          } else {
            mainButton.disable();
          }
        }

        // Remove previous listeners and add new one
        mainButton.offClick();
        mainButton.onClick(callback);
        
        return callbackId;
      }
    } catch (error) {
      console.warn('[TelegramButton] Failed to show main button:', error);
    }
    
    return '';
  }

  /**
   * Hide main button
   */
  hideMainButton(): void {
    try {
      if (window.Telegram?.WebApp?.MainButton) {
        window.Telegram.WebApp.MainButton.hide();
        window.Telegram.WebApp.MainButton.offClick();
      }
    } catch (error) {
      console.warn('[TelegramButton] Failed to hide main button:', error);
    }
  }

  /**
   * Update main button text
   */
  updateMainButtonText(text: string): void {
    try {
      if (window.Telegram?.WebApp?.MainButton) {
        window.Telegram.WebApp.MainButton.text = text;
      }
    } catch (error) {
      console.warn('[TelegramButton] Failed to update main button text:', error);
    }
  }

  /**
   * Enable/disable main button
   */
  setMainButtonEnabled(enabled: boolean): void {
    try {
      if (window.Telegram?.WebApp?.MainButton) {
        if (enabled) {
          window.Telegram.WebApp.MainButton.enable();
        } else {
          window.Telegram.WebApp.MainButton.disable();
        }
      }
    } catch (error) {
      console.warn('[TelegramButton] Failed to set main button state:', error);
    }
  }

  /**
   * Show back button with callback
   */
  showBackButton(callback: () => void): string {
    try {
      if (window.Telegram?.WebApp?.BackButton) {
        const backButton = window.Telegram.WebApp.BackButton;
        const callbackId = Math.random().toString(36).substring(2);
        
        this.backButtonCallbacks.set(callbackId, callback);
        
        backButton.show();
        
        // Remove previous listeners and add new one
        backButton.offClick();
        backButton.onClick(callback);
        
        return callbackId;
      }
    } catch (error) {
      console.warn('[TelegramButton] Failed to show back button:', error);
    }
    
    return '';
  }

  /**
   * Hide back button
   */
  hideBackButton(): void {
    try {
      if (window.Telegram?.WebApp?.BackButton) {
        window.Telegram.WebApp.BackButton.hide();
        window.Telegram.WebApp.BackButton.offClick();
      }
    } catch (error) {
      console.warn('[TelegramButton] Failed to hide back button:', error);
    }
  }

  /**
   * Clear all button callbacks
   */
  clearCallbacks(): void {
    this.mainButtonCallbacks.clear();
    this.backButtonCallbacks.clear();
    this.hideMainButton();
    this.hideBackButton();
  }

  /**
   * Show progress on main button
   */
  showMainButtonProgress(): void {
    try {
      if (window.Telegram?.WebApp?.MainButton) {
        window.Telegram.WebApp.MainButton.showProgress();
      }
    } catch (error) {
      console.warn('[TelegramButton] Failed to show main button progress:', error);
    }
  }

  /**
   * Hide progress on main button
   */
  hideMainButtonProgress(): void {
    try {
      if (window.Telegram?.WebApp?.MainButton) {
        window.Telegram.WebApp.MainButton.hideProgress();
      }
    } catch (error) {
      console.warn('[TelegramButton] Failed to hide main button progress:', error);
    }
  }
}

export const telegramButtonService = new TelegramButtonService();