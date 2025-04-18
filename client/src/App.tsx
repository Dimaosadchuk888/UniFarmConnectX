import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { apiRequest } from "@/lib/queryClient";
import { getTelegramUserData, initTelegramWebApp, isTelegramWebApp } from "./services/telegramService";
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { TONCONNECT_MANIFEST_URL } from './config/tonConnect';

import Header from "@/components/layout/Header";
import NavigationBar from "@/components/layout/NavigationBar";
import Dashboard from "@/pages/Dashboard";
import Farming from "@/pages/Farming";
import Missions from "@/pages/Missions";
import Friends from "@/pages/Friends";
import Wallet from "@/pages/Wallet";

// For Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        expand: () => void;
        ready: () => void;
        initData: string;
        initDataUnsafe: any;
      };
    };
  }
}

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [telegramAuthError, setTelegramAuthError] = useState<string | null>(null);

  // Инициализация Telegram WebApp при запуске
  useEffect(() => {
    // Если это Telegram WebApp, инициализируем его
    if (isTelegramWebApp()) {
      initTelegramWebApp();
      authenticateWithTelegram();
    }
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

      // Отправляем данные на сервер для аутентификации
      const authResult = await apiRequest('/api/auth/telegram', {
        method: 'POST',
        body: JSON.stringify({ authData: telegramData.authData }),
      });

      if (authResult.success && authResult.data) {
        // Сохраняем ID пользователя
        setUserId(authResult.data.user_id);
        console.log('Пользователь авторизован:', authResult.data);
        
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
      <TonConnectUIProvider manifestUrl={TONCONNECT_MANIFEST_URL}>
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
