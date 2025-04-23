import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { apiRequest } from "@/lib/queryClient";
import { getTelegramUserData, initTelegramWebApp, isTelegramWebApp, getCachedTelegramUserId } from "./services/telegramService";
import { extractTelegramInitData, getTelegramUserId, hasTelegramUserId, isRunningInTelegram } from "./services/telegramInitData";
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { TONCONNECT_MANIFEST_URL } from './config/tonConnect';
import { getReferrerIdFromURL } from './lib/utils';
import userService from '@/services/userService';

// Компонент для отображения предупреждения о Telegram initData
import TelegramInitDataWarning from "@/components/ui/TelegramInitDataWarning";

import Header from "@/components/layout/Header";
import NavigationBar from "@/components/layout/NavigationBar";
import Dashboard from "@/pages/Dashboard";
import Farming from "@/pages/Farming";
import Missions from "@/pages/Missions";
import Friends from "@/pages/Friends";
import FriendsMinimal from "@/pages/FriendsMinimal";
import Wallet from "@/pages/Wallet";
import TelegramTest from "./pages/TelegramTest";
import WebhookSetup from "./pages/WebhookSetup";
import DebugPage from "./pages/DebugPage";
import AdminPage from "./pages/AdminPage";
import ReferralDebug from "./pages/ReferralDebug";
import AuditPage from "./pages/AuditPage";
import TelegramSetupGuide from "./pages/TelegramSetupGuide";

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
        startParam?: string; // Параметр start= из ссылки запуска бота
        version?: string;    // Версия API
        themeParams?: Record<string, string>; // Параметры темы
      };
    };
    process: {
      env: Record<string, string | undefined>;
    };
    TextEncoder: typeof TextEncoder;
  }
}

// Компонент RootTelegramDiagnostics удален

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [telegramAuthError, setTelegramAuthError] = useState<string | null>(null);
  const [showDiagnostics] = useState(true); // Всегда показываем диагностику

  // Простая проверка инициализации Telegram WebApp по ТЗ
  useEffect(() => {
    const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    console.log('==[ Telegram WebApp Init Check ]==');
    console.log('Telegram.WebApp:', webApp);
    
    // Шаг 1.2 — Проверка initData в Telegram WebApp
    console.log('==[ InitData Check ]==', 
      webApp?.initData || null, 
      webApp?.initDataUnsafe || null
    );
    
    if (webApp) {
      console.log('==[ InitData Fields Check ]==', {
        user: !!webApp.initDataUnsafe?.user,
        query_id: !!webApp.initDataUnsafe?.query_id,
        auth_date: !!webApp.initDataUnsafe?.auth_date
      });
    } else {
      console.log('==[ InitData Fields Check ]==', {
        user: false,
        query_id: false,
        auth_date: false
      });
    }
  }, []);

  // Детальная проверка инициализации Telegram WebApp API
  useEffect(() => {
    // Этап 1.1: Проверка существования window.Telegram.WebApp
    console.log('[TG AUDIT] Этап 1.1: Проверка window.Telegram.WebApp');
    console.log('[TG AUDIT] window.Telegram существует:', !!window.Telegram);
    console.log('[TG AUDIT] window.Telegram?.WebApp существует:', !!window.Telegram?.WebApp);
    
    const webApp = window.Telegram?.WebApp;

    if (webApp) {
      console.log('[TG AUDIT] ✓ WebApp API найден и доступен');
      
      // Этап 1.2: Вывод в консоль данных
      console.log('[TG AUDIT] Этап 1.2: Вывод данных инициализации');
      console.log('[TG AUDIT] initData:', webApp.initData);
      console.log('[TG AUDIT] initData длина:', webApp.initData?.length || 0);
      console.log('[TG AUDIT] initDataUnsafe:', webApp.initDataUnsafe);
      console.log('[TG AUDIT] initDataUnsafe.user:', webApp.initDataUnsafe?.user);
      console.log('[TG AUDIT] initDataUnsafe.auth_date:', webApp.initDataUnsafe?.auth_date);
      console.log('[TG AUDIT] initDataUnsafe.hash:', webApp.initDataUnsafe?.hash);
      console.log('[TG AUDIT] platform:', webApp.platform);
      console.log('[TG AUDIT] version:', webApp.version);
      console.log('[TG AUDIT] colorScheme:', webApp.colorScheme);
      console.log('[TG AUDIT] themeParams:', webApp.themeParams);
      console.log('[TG AUDIT] startParam:', webApp.startParam);

      // Проверяем полноту данных
      if (!webApp.initData || !webApp.initDataUnsafe?.user) {
        console.error('[TG AUDIT] ⚠️ Ошибка: Telegram WebApp не передал данные пользователя!');
      } else {
        console.log('[TG AUDIT] ✓ Данные пользователя получены успешно');
      }
      
      // Этап 1.3: Вызов Telegram.WebApp.ready()
      console.log('[TG AUDIT] Этап 1.3: Вызов Telegram.WebApp.ready()');
      try {
        webApp.ready();
        console.log('[TG AUDIT] ✓ Метод webApp.ready() вызван успешно');
      } catch (error) {
        console.error('[TG AUDIT] ⚠️ Ошибка при вызове webApp.ready():', error);
      }
      
      // Расширяем приложение на весь доступный размер
      try {
        webApp.expand();
        console.log('[TG AUDIT] ✓ Метод webApp.expand() вызван успешно');
      } catch (error) {
        console.error('[TG AUDIT] ⚠️ Ошибка при вызове webApp.expand():', error);
      }
      
      // Попытка авторизации через Telegram
      authenticateWithTelegram();
    } else {
      console.error('[TG AUDIT] ⚠️ Ошибка: Telegram WebApp не загружен!');
      console.log('[TG AUDIT] Детали window:', {
        windowDefined: typeof window !== 'undefined',
        telegramDefined: typeof window.Telegram !== 'undefined',
        userAgent: navigator.userAgent,
        isIframe: window.self !== window.top,
        documentURL: window.location.href
      });
      
      // Продолжаем инициализацию приложения даже без Telegram WebApp
      authenticateWithTelegram();
    }
  }, []);

  // Отладочный баннер с отображением домена удален для улучшения UX

  // Авторизация через Telegram с усиленной проверкой в telegramInitData.ts
  const authenticateWithTelegram = async () => {
    try {
      setIsLoading(true);
      setTelegramAuthError(null);

      // АУДИТ: Получаем данные через улучшенный метод проверки Telegram WebApp
      const telegramInitData = extractTelegramInitData();
      console.log('[App] АУДИТ: Получены данные Telegram WebApp через новый метод:', {
        isValid: telegramInitData.isValid,
        userId: telegramInitData.userId || 'недоступен',
        startParam: telegramInitData.startParam || 'недоступен',
        errors: telegramInitData.validationErrors
      });
      
      // Получаем userId через разные методы для диагностики
      const telegramUserId = getTelegramUserId();
      const oldTelegramData = getTelegramUserData();
      
      console.log('[App] АУДИТ: Сравнение источников ID:', {
        newMethod: telegramUserId,
        oldMethod: oldTelegramData?.userId || 'недоступен',
        dataValid: !!oldTelegramData
      });
      
      // Используем новые данные для авторизации, если доступны,
      // в противном случае падаем на старую имплементацию
      let authData = null;
      let hasTelegramValidData = telegramInitData.isValid && telegramInitData.userId;
      
      if (hasTelegramValidData) {
        // Формируем данные для авторизации на основе нового метода
        authData = {
          id: telegramInitData.userId,
          initData: telegramInitData.rawInitData,
          username: telegramInitData.username,
          firstName: telegramInitData.firstName,
          lastName: telegramInitData.lastName,
          photoUrl: telegramInitData.photoUrl,
          startParam: telegramInitData.startParam
        };
        console.log('[App] АУДИТ: Используем новый метод для авторизации, ID:', telegramInitData.userId);
      } else if (oldTelegramData) {
        // Используем старый метод как запасной
        authData = oldTelegramData.authData;
        console.log('[App] АУДИТ: Используем старый метод для авторизации, ID:', oldTelegramData.userId);
      }
      
      if (!authData) {
        console.warn('[App] АУДИТ: Не удалось получить данные Telegram WebApp ни через один метод');
        // Не устанавливаем ошибку авторизации, чтобы не блокировать отображение интерфейса
        // setTelegramAuthError('Не удалось получить данные пользователя из Telegram');
        setIsLoading(false);
        
        // Продолжаем обработку без данных Telegram - используем гостевой режим
        // Это позволит приложению работать независимо от авторизации через Telegram
        return;
      }

      // Проверяем, есть ли параметр реферера в URL
      const referrerId = getReferrerIdFromURL();
      console.log('Параметр реферера из URL:', referrerId);

      // Отправляем данные на сервер для аутентификации
      const authResult = await apiRequest('/api/auth/telegram', {
        method: 'POST',
        body: JSON.stringify({ 
          authData: authData, // Теперь используем полученные данные из улучшенного метода
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
    // Для тестирования, временно перенаправляем "friends" на минимальную версию
    // В реальной телеграм среде будет отображаться минимальная версия для диагностики
    const useMinimalFriends = isRunningInTelegram();
    
    // Проверяем URL на наличие параметра тестирования
    const urlParams = new URLSearchParams(window.location.search);
    const forceMinimal = urlParams.get('minimal') === 'true';
    
    // Используем минимальную версию, если:
    // 1. Мы в Telegram Mini App
    // 2. ИЛИ в URL есть параметр minimal=true для тестирования
    const shouldUseMinimal = useMinimalFriends || forceMinimal;
    
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "farming":
        return <Farming />;
      case "missions":
        return <Missions />;
      case "friends":
        // В Telegram Mini App или при наличии специального URL параметра
        // используем минимальную версию для тестирования
        return shouldUseMinimal ? <FriendsMinimal /> : <Friends />;
      case "wallet":
        return <Wallet />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TonConnectUIProvider manifestUrl="https://universegames8.github.io/tonconnect-manifest/tonconnect-manifest.json">
        {/* Диагностический блок удален */}
        
        <div className="max-w-md mx-auto min-h-screen bg-background pb-20 relative">
          <Switch>
            {/* Специальная страница для тестирования Telegram */}
            <Route path="/telegram-test">
              <TelegramTest />
            </Route>
            
            {/* Страница отладки Telegram Mini App */}
            <Route path="/debug">
              <DebugPage />
            </Route>
            
            {/* Страница настройки Telegram Webhook */}
            <Route path="/webhook-setup">
              <WebhookSetup />
            </Route>
            
            {/* Административная страница для настройки бота */}
            <Route path="/admin">
              <AdminPage />
            </Route>
            
            {/* Диагностика реферальной системы */}
            <Route path="/referral-debug">
              <ReferralDebug />
            </Route>
            
            {/* Полный аудит приложения */}
            <Route path="/audit">
              <AuditPage />
            </Route>
            
            {/* Руководство по настройке Telegram Mini App */}
            <Route path="/telegram-setup">
              <TelegramSetupGuide />
            </Route>
            
            {/* Основной интерфейс приложения */}
            <Route path="*">
              <Header />
              {/* Показываем предупреждение о проблемах с Telegram WebApp */}
              <TelegramInitDataWarning />
              <main className="px-4 pt-2 pb-20">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  /* Просто рендерим страницу, не показываем ошибку Telegram авторизации */
                  renderActivePage()
                )}
              </main>
              <NavigationBar activeTab={activeTab} setActiveTab={setActiveTab} />
            </Route>
          </Switch>
        </div>
        <Toaster />
      </TonConnectUIProvider>
    </QueryClientProvider>
  );
}

export default App;
