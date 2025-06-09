/**
 * Telegram Theme Service
 * Manages theme and appearance for Telegram Mini App
 */

export interface TelegramTheme {
  backgroundColor: string;
  textColor: string;
  hintColor: string;
  linkColor: string;
  buttonColor: string;
  buttonTextColor: string;
  secondaryBackgroundColor: string;
}

export class TelegramThemeService {
  private currentTheme: TelegramTheme | null = null;
  private isDarkMode = false;

  /**
   * Initialize theme from Telegram WebApp
   */
  initializeTheme(): void {
    try {
      if (window.Telegram?.WebApp) {
        const webApp = window.Telegram.WebApp;
        
        this.currentTheme = {
          backgroundColor: webApp.backgroundColor || '#ffffff',
          textColor: webApp.textColor || '#000000',
          hintColor: webApp.hintColor || '#999999',
          linkColor: webApp.linkColor || '#0088cc',
          buttonColor: webApp.buttonColor || '#0088cc',
          buttonTextColor: webApp.buttonTextColor || '#ffffff',
          secondaryBackgroundColor: webApp.secondaryBackgroundColor || '#f0f0f0'
        };

        this.isDarkMode = webApp.colorScheme === 'dark';
        this.applyTheme();
      }
    } catch (error) {
      console.warn('[TelegramTheme] Failed to initialize theme:', error);
      this.setDefaultTheme();
    }
  }

  /**
   * Set default theme
   */
  private setDefaultTheme(): void {
    this.currentTheme = {
      backgroundColor: '#ffffff',
      textColor: '#000000',
      hintColor: '#999999',
      linkColor: '#0088cc',
      buttonColor: '#0088cc',
      buttonTextColor: '#ffffff',
      secondaryBackgroundColor: '#f0f0f0'
    };
    this.isDarkMode = false;
    this.applyTheme();
  }

  /**
   * Apply theme to document
   */
  private applyTheme(): void {
    if (!this.currentTheme) return;

    const root = document.documentElement;
    
    root.style.setProperty('--tg-bg-color', this.currentTheme.backgroundColor);
    root.style.setProperty('--tg-text-color', this.currentTheme.textColor);
    root.style.setProperty('--tg-hint-color', this.currentTheme.hintColor);
    root.style.setProperty('--tg-link-color', this.currentTheme.linkColor);
    root.style.setProperty('--tg-button-color', this.currentTheme.buttonColor);
    root.style.setProperty('--tg-button-text-color', this.currentTheme.buttonTextColor);
    root.style.setProperty('--tg-secondary-bg-color', this.currentTheme.secondaryBackgroundColor);

    // Set color scheme class
    document.body.classList.toggle('dark-theme', this.isDarkMode);
    document.body.classList.toggle('light-theme', !this.isDarkMode);
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): TelegramTheme | null {
    return this.currentTheme;
  }

  /**
   * Check if dark mode is active
   */
  isDark(): boolean {
    return this.isDarkMode;
  }

  /**
   * Set header color
   */
  setHeaderColor(color: string): void {
    try {
      if (window.Telegram?.WebApp?.headerColor !== undefined) {
        window.Telegram.WebApp.headerColor = color;
      }
    } catch (error) {
      console.warn('[TelegramTheme] Failed to set header color:', error);
    }
  }

  /**
   * Set background color
   */
  setBackgroundColor(color: string): void {
    try {
      if (window.Telegram?.WebApp?.backgroundColor !== undefined) {
        window.Telegram.WebApp.backgroundColor = color;
      }
    } catch (error) {
      console.warn('[TelegramTheme] Failed to set background color:', error);
    }
  }
}

export const telegramThemeService = new TelegramThemeService();