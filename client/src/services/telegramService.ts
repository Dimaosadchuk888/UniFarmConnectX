
/**
 * Сервис для работы с Telegram WebApp API
 * Обработка initData, пользовательских данных и интеграции с Mini App
 */

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
  initDataUnsafe: {
    user?: TelegramUser;
    start_param?: string;
    auth_date?: number;
    hash?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  CloudStorage: {
    setItem: (key: string, value: string, callback?: (error: string | null, success: boolean) => void) => void;
    getItem: (key: string, callback: (error: string | null, value: string | null) => void) => void;
    getItems: (keys: string[], callback: (error: string | null, values: Record<string, string> | null) => void) => void;
    removeItem: (key: string, callback?: (error: string | null, success: boolean) => void) => void;
    removeItems: (keys: string[], callback?: (error: string | null, success: boolean) => void) => void;
    getKeys: (callback: (error: string | null, keys: string[] | null) => void) => void;
  };
  sendData: (data: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

class TelegramService {
  private webApp: TelegramWebApp | null = null;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Инициализация Telegram WebApp
   */
  private initialize(): void {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      this.webApp = window.Telegram.WebApp;
      this.webApp.ready();
      this.initialized = true;
      console.log('[telegramService] Telegram WebApp инициализирован');
    } else {
      console.log('[telegramService] Telegram WebApp недоступен');
    }
  }

  /**
   * Проверка доступности Telegram WebApp
   */
  isAvailable(): boolean {
    return this.initialized && this.webApp !== null;
  }

  /**
   * Получение данных пользователя
   */
  getUser(): TelegramUser | null {
    if (!this.isAvailable()) {
      console.log('[telegramService] WebApp недоступен для получения пользователя');
      return null;
    }
    
    return this.webApp!.initDataUnsafe.user || null;
  }

  /**
   * Получение initData для отправки на сервер
   */
  getInitData(): string {
    if (!this.isAvailable()) {
      console.log('[telegramService] WebApp недоступен для получения initData');
      return '';
    }
    
    return this.webApp!.initData || '';
  }

  /**
   * Получение start параметра
   */
  getStartParam(): string | null {
    if (!this.isAvailable()) {
      return null;
    }
    
    return this.webApp!.initDataUnsafe.start_param || null;
  }

  /**
   * Подготовка заголовков для API запросов
   */
  getApiHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const initData = this.getInitData();
    const user = this.getUser();

    console.log('[telegramService] Подготовка заголовков:', {
      hasInitData: !!initData,
      initDataLength: initData.length,
      hasUser: !!user
    });

    if (initData) {
      headers['X-Telegram-Init-Data'] = initData;
    }

    if (user) {
      headers['X-Telegram-User-Id'] = user.id.toString();
    }

    return headers;
  }

  /**
   * Получение информации о среде
   */
  getEnvironmentInfo() {
    if (!this.isAvailable()) {
      return {
        platform: 'unknown',
        version: '0.0',
        isInIframe: window.self !== window.top,
        userAgent: navigator.userAgent
      };
    }

    return {
      platform: this.webApp!.platform,
      version: this.webApp!.version,
      colorScheme: this.webApp!.colorScheme,
      viewportHeight: this.webApp!.viewportHeight,
      viewportStableHeight: this.webApp!.viewportStableHeight,
      isExpanded: this.webApp!.isExpanded,
      isInIframe: window.self !== window.top,
      userAgent: navigator.userAgent
    };
  }

  /**
   * Расширение WebApp
   */
  expand(): void {
    if (this.isAvailable()) {
      this.webApp!.expand();
    }
  }

  /**
   * Закрытие WebApp
   */
  close(): void {
    if (this.isAvailable()) {
      this.webApp!.close();
    }
  }

  /**
   * Отправка данных родительскому окну
   */
  sendData(data: any): void {
    if (this.isAvailable()) {
      this.webApp!.sendData(JSON.stringify(data));
    }
  }

  /**
   * Работа с главной кнопкой
   */
  showMainButton(text: string, onClick: () => void): void {
    if (!this.isAvailable()) return;

    const mainButton = this.webApp!.MainButton;
    mainButton.setText(text);
    mainButton.onClick(onClick);
    mainButton.show();
  }

  hideMainButton(): void {
    if (this.isAvailable()) {
      this.webApp!.MainButton.hide();
    }
  }

  /**
   * Тактильная обратная связь
   */
  hapticFeedback(type: 'impact' | 'notification' | 'selection', style?: string): void {
    if (!this.isAvailable()) return;

    const haptic = this.webApp!.HapticFeedback;
    
    switch (type) {
      case 'impact':
        haptic.impactOccurred(style as any || 'medium');
        break;
      case 'notification':
        haptic.notificationOccurred(style as any || 'success');
        break;
      case 'selection':
        haptic.selectionChanged();
        break;
    }
  }

  /**
   * Fallback логика при отсутствии Telegram данных
   */
  getFallbackData(guestId: string, refCode?: string) {
    const envInfo = this.getEnvironmentInfo();
    
    console.log('[telegramService] Детали среды:', envInfo);
    console.log(`[telegramService] ⚠️ Нет данных Telegram, fallback к guest_id: ${guestId}, рефкод: ${refCode || 'отсутствует'}`);
    
    return {
      guestId,
      refCode: refCode || null,
      environment: envInfo,
      isFallback: true,
      reason: 'no_telegram_data'
    };
  }

  /**
   * Проверка на реальное окружение (не iframe preview)
   */
  isPreviewMode(): boolean {
    const envInfo = this.getEnvironmentInfo();
    
    // Проверяем признаки preview режима
    const isReplit = window.location.hostname.includes('replit');
    const isPreview = envInfo.isInIframe && !this.isAvailable();
    
    return isReplit && isPreview;
  }

  /**
   * Проверка на реальное Telegram окружение
   */
  isRealTelegramEnvironment(): boolean {
    // Проверяем наличие реальных Telegram данных
    const hasValidInitData = this.getInitData().length > 0;
    const hasValidUser = this.getUser() !== null;
    const envInfo = this.getEnvironmentInfo();
    
    // Telegram Mini App должен иметь специфичные характеристики
    const isTelegramUserAgent = envInfo.userAgent.includes('Telegram') || 
                               envInfo.platform !== 'unknown';
    
    return hasValidInitData && hasValidUser && isTelegramUserAgent;
  }
}

// Экспорт singleton instance
export const telegramService = new TelegramService();
export default telegramService;

/**
 * Функция для получения заголовков авторизации Telegram
 * Совместимость с queryClient.ts
 */
export function getTelegramAuthHeaders(): Record<string, string> {
  return telegramService.getApiHeaders();
}

/**
 * Функция для получения отображаемого имени пользователя Telegram
 */
export function getTelegramUserDisplayName(): string {
  const user = telegramService.getUser();
  if (!user) return 'Пользователь';
  
  // Приоритет: first_name + last_name, затем username, затем значение по умолчанию
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  const username = user.username || '';
  
  if (firstName) {
    return lastName ? `${firstName} ${lastName}` : firstName;
  }
  
  if (username) {
    return username;
  }
  
  return 'Пользователь';
}

/**
 * Проверка, является ли среда Telegram WebApp
 */
export function isTelegramWebApp(): boolean {
  return telegramService.isAvailable();
}
