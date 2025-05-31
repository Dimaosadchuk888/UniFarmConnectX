/**
 * Telegram utilities - объединенные утилиты для работы с Telegram Mini App
 * 
 * Содержит функциональность из:
 * - telegramAdvancedService.ts - продвинутые функции
 * - telegramButtonService.ts - работа с кнопками
 * - telegramErrorService.ts - обработка ошибок
 * - telegramSendDataService.ts - отправка данных
 * - telegramStorageService.ts - работа с хранилищем
 * - telegramThemeService.ts - работа с темами
 */

// Интерфейсы
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: any;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: any;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: any;
  MainButton: any;
  SettingsButton: any;
  HapticFeedback: any;
  CloudStorage: any;
  BiometricManager: any;
}

interface TelegramData {
  user?: TelegramUser;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  auth_date?: number;
  hash?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export class TelegramUtils {
  private static instance: TelegramUtils;
  private webApp: TelegramWebApp | null = null;
  private isInitialized = false;

  private constructor() {
    this.initializeWebApp();
  }

  public static getInstance(): TelegramUtils {
    if (!TelegramUtils.instance) {
      TelegramUtils.instance = new TelegramUtils();
    }
    return TelegramUtils.instance;
  }

  // ========== ИНИЦИАЛИЗАЦИЯ ==========

  private initializeWebApp(): void {
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        this.webApp = window.Telegram.WebApp;
        this.webApp.ready();
        this.isInitialized = true;
        console.log('[TelegramUtils] WebApp инициализирован');
      } else {
        console.warn('[TelegramUtils] Telegram WebApp недоступен');
      }
    } catch (error) {
      console.error('[TelegramUtils] Ошибка инициализации WebApp:', error);
    }
  }

  public isWebAppAvailable(): boolean {
    return this.isInitialized && this.webApp !== null;
  }

  // ========== РАБОТА С ДАННЫМИ ПОЛЬЗОВАТЕЛЯ ==========

  public getTelegramUser(): TelegramUser | null {
    try {
      if (!this.webApp?.initDataUnsafe?.user) {
        return null;
      }
      return this.webApp.initDataUnsafe.user;
    } catch (error) {
      console.error('[TelegramUtils] Ошибка получения пользователя:', error);
      return null;
    }
  }

  public getTelegramData(): TelegramData | null {
    try {
      if (!this.webApp?.initDataUnsafe) {
        return null;
      }
      return this.webApp.initDataUnsafe;
    } catch (error) {
      console.error('[TelegramUtils] Ошибка получения данных Telegram:', error);
      return null;
    }
  }

  public getInitData(): string {
    try {
      return this.webApp?.initData || '';
    } catch (error) {
      console.error('[TelegramUtils] Ошибка получения initData:', error);
      return '';
    }
  }

  // ========== РАБОТА С КНОПКАМИ ==========

  public showMainButton(text: string, onClick: () => void): void {
    try {
      if (!this.webApp?.MainButton) return;
      
      this.webApp.MainButton.setText(text);
      this.webApp.MainButton.show();
      this.webApp.MainButton.onClick(onClick);
      console.log(`[TelegramUtils] MainButton показана: ${text}`);
    } catch (error) {
      console.error('[TelegramUtils] Ошибка показа MainButton:', error);
    }
  }

  public hideMainButton(): void {
    try {
      if (!this.webApp?.MainButton) return;
      
      this.webApp.MainButton.hide();
      console.log('[TelegramUtils] MainButton скрыта');
    } catch (error) {
      console.error('[TelegramUtils] Ошибка скрытия MainButton:', error);
    }
  }

  public enableMainButton(): void {
    try {
      this.webApp?.MainButton?.enable();
    } catch (error) {
      console.error('[TelegramUtils] Ошибка активации MainButton:', error);
    }
  }

  public disableMainButton(): void {
    try {
      this.webApp?.MainButton?.disable();
    } catch (error) {
      console.error('[TelegramUtils] Ошибка деактивации MainButton:', error);
    }
  }

  public showBackButton(onClick: () => void): void {
    try {
      if (!this.webApp?.BackButton) return;
      
      this.webApp.BackButton.show();
      this.webApp.BackButton.onClick(onClick);
      console.log('[TelegramUtils] BackButton показана');
    } catch (error) {
      console.error('[TelegramUtils] Ошибка показа BackButton:', error);
    }
  }

  public hideBackButton(): void {
    try {
      if (!this.webApp?.BackButton) return;
      
      this.webApp.BackButton.hide();
      console.log('[TelegramUtils] BackButton скрыта');
    } catch (error) {
      console.error('[TelegramUtils] Ошибка скрытия BackButton:', error);
    }
  }

  // ========== РАБОТА С ТЕМАМИ ==========

  public getThemeParams(): any {
    try {
      return this.webApp?.themeParams || {};
    } catch (error) {
      console.error('[TelegramUtils] Ошибка получения themeParams:', error);
      return {};
    }
  }

  public getColorScheme(): 'light' | 'dark' {
    try {
      return this.webApp?.colorScheme || 'light';
    } catch (error) {
      console.error('[TelegramUtils] Ошибка получения colorScheme:', error);
      return 'light';
    }
  }

  public setHeaderColor(color: string): void {
    try {
      if (this.webApp?.setHeaderColor) {
        this.webApp.setHeaderColor(color);
        console.log(`[TelegramUtils] Цвет заголовка изменен: ${color}`);
      }
    } catch (error) {
      console.error('[TelegramUtils] Ошибка изменения цвета заголовка:', error);
    }
  }

  public setBackgroundColor(color: string): void {
    try {
      if (this.webApp?.setBackgroundColor) {
        this.webApp.setBackgroundColor(color);
        console.log(`[TelegramUtils] Цвет фона изменен: ${color}`);
      }
    } catch (error) {
      console.error('[TelegramUtils] Ошибка изменения цвета фона:', error);
    }
  }

  // ========== РАБОТА С ХРАНИЛИЩЕМ ==========

  public async setCloudStorageItem(key: string, value: string): Promise<boolean> {
    try {
      if (!this.webApp?.CloudStorage) {
        console.warn('[TelegramUtils] CloudStorage недоступен');
        return false;
      }

      return new Promise((resolve) => {
        this.webApp!.CloudStorage.setItem(key, value, (error: any) => {
          if (error) {
            console.error('[TelegramUtils] Ошибка записи в CloudStorage:', error);
            resolve(false);
          } else {
            console.log(`[TelegramUtils] Данные сохранены в CloudStorage: ${key}`);
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('[TelegramUtils] Ошибка setCloudStorageItem:', error);
      return false;
    }
  }

  public async getCloudStorageItem(key: string): Promise<string | null> {
    try {
      if (!this.webApp?.CloudStorage) {
        console.warn('[TelegramUtils] CloudStorage недоступен');
        return null;
      }

      return new Promise((resolve) => {
        this.webApp!.CloudStorage.getItem(key, (error: any, value: string) => {
          if (error) {
            console.error('[TelegramUtils] Ошибка чтения из CloudStorage:', error);
            resolve(null);
          } else {
            console.log(`[TelegramUtils] Данные получены из CloudStorage: ${key}`);
            resolve(value || null);
          }
        });
      });
    } catch (error) {
      console.error('[TelegramUtils] Ошибка getCloudStorageItem:', error);
      return null;
    }
  }

  // ========== HAPTIC FEEDBACK ==========

  public impactOccurred(style: 'light' | 'medium' | 'heavy' = 'medium'): void {
    try {
      this.webApp?.HapticFeedback?.impactOccurred(style);
    } catch (error) {
      console.error('[TelegramUtils] Ошибка haptic feedback:', error);
    }
  }

  public notificationOccurred(type: 'error' | 'success' | 'warning'): void {
    try {
      this.webApp?.HapticFeedback?.notificationOccurred(type);
    } catch (error) {
      console.error('[TelegramUtils] Ошибка notification feedback:', error);
    }
  }

  // ========== РАСШИРЕНИЕ VIEWPORT ==========

  public expand(): void {
    try {
      this.webApp?.expand();
      console.log('[TelegramUtils] WebApp расширен');
    } catch (error) {
      console.error('[TelegramUtils] Ошибка расширения WebApp:', error);
    }
  }

  public close(): void {
    try {
      this.webApp?.close();
      console.log('[TelegramUtils] WebApp закрыт');
    } catch (error) {
      console.error('[TelegramUtils] Ошибка закрытия WebApp:', error);
    }
  }

  // ========== ОТПРАВКА ДАННЫХ ==========

  public sendData(data: string): void {
    try {
      if (this.webApp?.sendData) {
        this.webApp.sendData(data);
        console.log('[TelegramUtils] Данные отправлены в бот:', data);
      } else {
        console.warn('[TelegramUtils] sendData недоступен');
      }
    } catch (error) {
      console.error('[TelegramUtils] Ошибка отправки данных:', error);
    }
  }

  // ========== ОТКРЫТИЕ ССЫЛОК ==========

  public openLink(url: string, options?: { try_instant_view?: boolean }): void {
    try {
      if (this.webApp?.openLink) {
        this.webApp.openLink(url, options);
        console.log(`[TelegramUtils] Ссылка открыта: ${url}`);
      } else {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('[TelegramUtils] Ошибка открытия ссылки:', error);
    }
  }

  public openTelegramLink(url: string): void {
    try {
      if (this.webApp?.openTelegramLink) {
        this.webApp.openTelegramLink(url);
        console.log(`[TelegramUtils] Telegram ссылка открыта: ${url}`);
      } else {
        this.openLink(url);
      }
    } catch (error) {
      console.error('[TelegramUtils] Ошибка открытия Telegram ссылки:', error);
    }
  }

  // ========== ПЛАТФОРМА И ВЕРСИИ ==========

  public getPlatform(): string {
    try {
      return this.webApp?.platform || 'unknown';
    } catch (error) {
      console.error('[TelegramUtils] Ошибка получения платформы:', error);
      return 'unknown';
    }
  }

  public getVersion(): string {
    try {
      return this.webApp?.version || '1.0';
    } catch (error) {
      console.error('[TelegramUtils] Ошибка получения версии:', error);
      return '1.0';
    }
  }

  // ========== ОБРАБОТКА ОШИБОК ==========

  public handleError(error: any, context: string): void {
    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.code || 'UNKNOWN_ERROR';
    
    console.error(`[TelegramUtils] ${context}:`, {
      message: errorMessage,
      code: errorCode,
      stack: error?.stack
    });

    // Отправляем haptic feedback для ошибки
    this.notificationOccurred('error');
  }

  // ========== ВАЛИДАЦИЯ ==========

  public validateInitData(): boolean {
    try {
      const initData = this.getInitData();
      const telegramData = this.getTelegramData();
      
      if (!initData || !telegramData) {
        return false;
      }

      return Boolean(telegramData.user?.id && telegramData.auth_date);
    } catch (error) {
      console.error('[TelegramUtils] Ошибка валидации initData:', error);
      return false;
    }
  }

  // ========== УТИЛИТЫ ==========

  public isDebugMode(): boolean {
    try {
      return this.getPlatform() === 'tdesktop' || window.location.hostname === 'localhost';
    } catch (error) {
      return false;
    }
  }

  public getViewportInfo(): { height: number; stableHeight: number; isExpanded: boolean } {
    try {
      return {
        height: this.webApp?.viewportHeight || window.innerHeight,
        stableHeight: this.webApp?.viewportStableHeight || window.innerHeight,
        isExpanded: this.webApp?.isExpanded || false
      };
    } catch (error) {
      console.error('[TelegramUtils] Ошибка получения viewport info:', error);
      return {
        height: window.innerHeight,
        stableHeight: window.innerHeight,
        isExpanded: false
      };
    }
  }
}

// Экспортируем singleton instance для удобства
export const telegramUtils = TelegramUtils.getInstance();

// Экспортируем отдельные функции для обратной совместимости
export const getTelegramUser = () => telegramUtils.getTelegramUser();
export const getTelegramData = () => telegramUtils.getTelegramData();
export const getInitData = () => telegramUtils.getInitData();
export const isWebAppAvailable = () => telegramUtils.isWebAppAvailable();
export const showMainButton = (text: string, onClick: () => void) => telegramUtils.showMainButton(text, onClick);
export const hideMainButton = () => telegramUtils.hideMainButton();
export const getThemeParams = () => telegramUtils.getThemeParams();
export const getColorScheme = () => telegramUtils.getColorScheme();