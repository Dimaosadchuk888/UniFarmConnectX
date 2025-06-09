// Централизованная конфигурация приложения
export const APP_CONFIG = {
  // API настройки
  API: {
    BASE_URL: import.meta.env.VITE_API_BASE_URL || 
      (typeof window !== 'undefined' 
        ? window.location.origin 
        : 'http://localhost:3000'),
    ENDPOINTS: {
      AUTH: '/api/v2/auth',
      USER: '/api/v2/users',
      WALLET: '/api/v2/wallet',
      FARMING: '/api/v2/farming',
      MISSIONS: '/api/v2/missions',
      REFERRAL: '/api/v2/referral',
      TON_BOOST: '/api/v2/ton-boost'
    }
  },

  // Telegram настройки
  TELEGRAM: {
    BOT_USERNAME: import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '',
    WEB_APP_URL: import.meta.env.VITE_WEB_APP_URL || '',
    SCRIPT_URL: 'https://telegram.org/js/telegram-web-app.js'
  },

  // UI настройки
  UI: {
    REFRESH_INTERVAL: 5000, // 5 секунд
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 500,
    TOAST_DURATION: 3000
  },

  // Валюты и форматирование
  CURRENCIES: {
    UNI: {
      symbol: 'UNI',
      decimals: 6,
      name: 'UniFarm Token'
    },
    TON: {
      symbol: 'TON',
      decimals: 5,
      name: 'The Open Network'
    }
  },

  // Farming настройки
  FARMING: {
    UNI_DAILY_RATE: 0.005, // 0.5% в день
    TON_BOOST_RATES: {
      1: 0.005, // Starter Boost - 0.5%
      2: 0.01,  // Standard Boost - 1%
      3: 0.02,  // Advanced Boost - 2%
      4: 0.025  // Premium Boost - 2.5%
    }
  },

  // Реферальная система
  REFERRAL: {
    MAX_LEVELS: 20,
    COMMISSION_RATES: {
      1: 1.00,   // 100% с первого уровня
      2: 0.02,   // 2% со второго уровня
      3: 0.03,   // 3% с третьего уровня
      // ... до 20 уровня
    }
  }
};

export default APP_CONFIG;