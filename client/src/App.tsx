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

  // Усиленная инициализация Telegram WebApp при запуске
  // Специальный useEffect для проверки Telegram WebApp
  useEffect(() => {
    // выводим в консоль, чтобы было видно и в DEV‑режиме Replit
    console.log('TG check →', window.Telegram?.WebApp);

    // визуальная метка в правом‑верхнем углу (только в NODE_ENV !== 'production')
    if (process.env.NODE_ENV !== 'production') {
      const tag = document.createElement('div');
      tag.style.cssText =
        'position:fixed;top:6px;right:6px;padding:2px 6px;font:12px monospace;' +
        'border-radius:4px;z-index:9999;background:' +
        (window.Telegram?.WebApp ? "#0f0" : "#f00") +
        ';color:#000;';
      tag.textContent = window.Telegram?.WebApp ? 'TG OK' : 'TG ⛔️';
      document.body.appendChild(tag);
    }

    // сообщаем Telegram, что приложение готово
    if (window.Telegram?.WebApp) window.Telegram.WebApp.ready();
  }, []);
  
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
          
          // АУДИТ: Расширенная диагностика состояния Telegram WebApp
          if (window.Telegram?.WebApp) {
            // Полное логирование всех доступных данных
            const tg = window.Telegram.WebApp;
            console.log('[АУДИТ] DIAG: Telegram WebApp state after initialization:', {
              // Основные поля
              initDataAvailable: !!tg.initData,
              initDataLength: (tg.initData || '').length,
              // Добавляем само значение initData и initDataUnsafe для отладки согласно ТЗ
              initData: tg.initData || 'empty',
              initDataUnsafe: tg.initDataUnsafe,
              // Проверка объекта с пользовательскими данными
              initDataUnsafeAvailable: !!tg.initDataUnsafe,
              userAvailable: !!tg.initDataUnsafe?.user,
              userId: tg.initDataUnsafe?.user?.id || 'недоступен',
              username: tg.initDataUnsafe?.user?.username || 'недоступен',
              firstName: tg.initDataUnsafe?.user?.first_name || 'недоступен',
              // Проверка служебных полей
              startParam: tg.startParam || 'недоступен',
              platform: tg.platform || 'недоступен',
              version: tg.version || 'недоступен',
              // Контекст запуска
              isInIframe: window !== window.parent,
              currentUrl: window.location.href,
              referrer: document.referrer || 'no-referrer',
              userAgent: navigator.userAgent,
              time: new Date().toISOString(),
              initAttempt: initAttempt
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
            </Route>
          </Switch>
        </div>
        <Toaster />
      </TonConnectUIProvider>
    </QueryClientProvider>
  );
}

export default App;
