import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { apiRequest } from "@/lib/queryClient";
import { getTelegramUserData, initTelegramWebApp, isTelegramWebApp } from "./services/telegramService";
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { TONCONNECT_MANIFEST_URL } from './config/tonConnect';
import { getReferrerIdFromURL } from './lib/utils';

import Header from "@/components/layout/Header";
import NavigationBar from "@/components/layout/NavigationBar";
import Dashboard from "@/pages/Dashboard";
import Farming from "@/pages/Farming";
import Missions from "@/pages/Missions";
import Friends from "@/pages/Friends";
import Wallet from "@/pages/Wallet";

// For Telegram WebApp types
// Обновлено определение глобального интерфейса для Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        expand: () => void;
        ready: () => void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            username?: string;
            first_name?: string;
            last_name?: string;
            photo_url?: string;
          };
          auth_date?: string;
          hash?: string;
          platform?: string;
        };
        platform?: string;
        colorScheme?: string;
      };
    };
    process: {
      env: Record<string, string | undefined>;
    };
    TextEncoder: typeof TextEncoder;
  }
}

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [telegramAuthError, setTelegramAuthError] = useState<string | null>(null);

  // Усиленная инициализация Telegram WebApp при запуске
  useEffect(() => {
    // Для отладки - всегда выводим информацию о состоянии WebApp
    console.log('App initialization: checking Telegram.WebApp availability...');
    
    // Добавим проверку на 3 попытки инициализации
    let initAttempt = 0;
    const maxAttempts = 3;
    
    const attemptInit = () => {
      initAttempt++;
      console.log(`Telegram WebApp initialization attempt ${initAttempt}/${maxAttempts}`);
      
      // Проверяем, доступен ли Telegram WebApp
      if (isTelegramWebApp()) {
        console.log('✅ Telegram WebApp обнаружен, инициализируем...');
        
        try {
          // Вызываем инициализацию
          initTelegramWebApp();
          
          // Выводим доступные данные для отладки
          if (window.Telegram?.WebApp) {
            console.log('window.Telegram.WebApp object:', {
              initDataAvailable: !!window.Telegram.WebApp.initData,
              initDataLength: (window.Telegram.WebApp.initData || '').length,
              initDataUnsafeAvailable: !!window.Telegram.WebApp.initDataUnsafe,
              userAvailable: !!window.Telegram.WebApp.initDataUnsafe?.user,
              userId: window.Telegram.WebApp.initDataUnsafe?.user?.id || 'недоступен'
            });
          }
          
          // Попытка авторизации через Telegram
          authenticateWithTelegram();
          
          return true; // Успешная инициализация
        } catch (error) {
          console.error('❌ Ошибка при инициализации Telegram WebApp:', error);
        }
      } else {
        console.warn(`⚠️ Telegram WebApp не обнаружен (попытка ${initAttempt}/${maxAttempts})`);
      }
      
      // Если мы еще не достигли максимального количества попыток, пробуем снова
      if (initAttempt < maxAttempts) {
        console.log(`Повторная попытка через 1 секунду...`);
        setTimeout(attemptInit, 1000);
      } else {
        console.warn('❌ Все попытки инициализации Telegram WebApp исчерпаны');
      }
      
      return false;
    };
    
    // Запускаем первую попытку инициализации
    attemptInit();
    
    // Обработка события загрузки страницы для повторной проверки
    const handleLoad = () => {
      console.log('Страница полностью загружена, проверяем статус Telegram WebApp еще раз');
      if (!isTelegramWebApp() && initAttempt >= maxAttempts) {
        attemptInit(); // Дополнительная попытка после полной загрузки
      }
    };
    
    window.addEventListener('load', handleLoad);
    
    // Очистка обработчика при размонтировании
    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  // Авторизация через Telegram
  const authenticateWithTelegram = async () => {
    try {
      setIsLoading(true);
      setTelegramAuthError(null);

      // Получаем данные из Telegram WebApp
      const telegramData = getTelegramUserData();
      
      if (!telegramData) {
        console.warn('Не удалось получить данные Telegram WebApp');
        setTelegramAuthError('Не удалось получить данные пользователя из Telegram');
        setIsLoading(false);
        return;
      }

      // Проверяем, есть ли параметр реферера в URL
      const referrerId = getReferrerIdFromURL();
      console.log('Параметр реферера из URL:', referrerId);

      // Отправляем данные на сервер для аутентификации
      const authResult = await apiRequest('/api/auth/telegram', {
        method: 'POST',
        body: JSON.stringify({ 
          authData: telegramData.authData,
          referrerId: referrerId // Добавляем ID приглашающего пользователя
        })
      });

      if (authResult.success && authResult.data) {
        // Сохраняем ID пользователя
        setUserId(authResult.data.user_id);
        console.log('Пользователь авторизован:', authResult.data);
        
        // Если был реферер, показываем сообщение
        if (referrerId && authResult.data.referrer_registered) {
          console.log('Вы были приглашены пользователем:', referrerId);
          // Здесь можно добавить Toast или другое уведомление
        }
        
        // Обновляем кэш запросов, которые зависят от авторизации
        queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
      } else {
        console.error('Ошибка аутентификации:', authResult.message || 'Неизвестная ошибка');
        setTelegramAuthError(authResult.message || 'Не удалось авторизоваться');
      }
    } catch (error) {
      console.error('Ошибка при аутентификации через Telegram:', error);
      setTelegramAuthError('Ошибка подключения к серверу');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch between tabs without using routes (simpler for Telegram Mini App)
  const renderActivePage = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "farming":
        return <Farming />;
      case "missions":
        return <Missions />;
      case "friends":
        return <Friends />;
      case "wallet":
        return <Wallet />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TonConnectUIProvider manifestUrl="https://universegames8.github.io/tonconnect-manifest/tonconnect-manifest.json">
        <div className="max-w-md mx-auto min-h-screen bg-background pb-20 relative">
          <Header />
          <main className="px-4 pt-2 pb-20">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : telegramAuthError ? (
              <div className="p-4 mt-4 bg-red-50 border border-red-200 rounded-md text-red-600">
                <p className="font-medium">Ошибка авторизации</p>
                <p className="text-sm">{telegramAuthError}</p>
              </div>
            ) : (
              renderActivePage()
            )}
          </main>
          <NavigationBar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
        <Toaster />
      </TonConnectUIProvider>
    </QueryClientProvider>
  );
}

export default App;
