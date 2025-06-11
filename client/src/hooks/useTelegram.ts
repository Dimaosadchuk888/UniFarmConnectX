import { useState, useEffect } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    start_param?: string;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState<string>('');

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    
    if (tg) {
      tg.ready();
      setIsReady(true);
      setUser(tg.initDataUnsafe.user || null);
      setInitData(tg.initData);
      
      // Expand the app to full height
      tg.expand();
    }
  }, []);

  const showMainButton = (text: string, onClick: () => void) => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.MainButton.text = text;
      tg.MainButton.show();
      tg.MainButton.onClick(onClick);
    }
  };

  const hideMainButton = () => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.MainButton.hide();
    }
  };

  const showBackButton = (onClick: () => void) => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.BackButton.show();
      tg.BackButton.onClick(onClick);
    }
  };

  const hideBackButton = () => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.BackButton.hide();
    }
  };

  const close = () => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.close();
    }
  };

  return {
    isReady,
    user,
    initData,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    close,
    tg: window.Telegram?.WebApp
  };
}