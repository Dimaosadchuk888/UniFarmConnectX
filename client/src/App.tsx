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

import Header from "@/components/layout/Header";
import NavigationBar from "@/components/layout/NavigationBar";
import Dashboard from "@/pages/Dashboard";
import Farming from "@/pages/Farming";
import Missions from "@/pages/Missions";
import Friends from "@/pages/Friends";
import FriendsMinimal from "@/pages/FriendsMinimal";
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

/**
 * Компонент для корневой диагностики (Telegram WebApp, ref_code и telegramId)
 */
const RootTelegramDiagnostics = () => {
  // Для диагностики получаем telegramId из разных источников
  const [telegramData, setTelegramData] = useState<{
    userId: string | number | null,
    refCode: string | null,
    telegramAvailable: boolean,
    webAppAvailable: boolean,
    initDataLength: number,
    hasInitDataUnsafe: boolean,
    hasUser: boolean,
    startParam: string | null,
    time: string
  }>({
    userId: null,
    refCode: null,
    telegramAvailable: false,
    webAppAvailable: false,
    initDataLength: 0,
    hasInitDataUnsafe: false,
    hasUser: false,
    startParam: null,
    time: new Date().toISOString()
  });
  
  // Запрос на получение данных пользователя
  const { data: userData } = useQuery({
    queryKey: ['/api/me'], 
    queryFn: () => userService.getCurrentUser(),
    staleTime: 10000
  });
  
  useEffect(() => {
    // Определяем доступность Telegram объекта
    const telegram = window.Telegram;
    const webApp = telegram?.WebApp;
    const telegramUser = webApp?.initDataUnsafe?.user;
    
    // Собираем диагностические данные
    const diagnosticData = {
      userId: telegramUser?.id || userData?.telegram_id || getTelegramUserId() || null,
      refCode: userData?.ref_code || null,
      telegramAvailable: !!telegram,
      webAppAvailable: !!webApp,
      initDataLength: (webApp?.initData || '').length,
      hasInitDataUnsafe: !!webApp?.initDataUnsafe,
      hasUser: !!telegramUser,
      startParam: webApp?.startParam || null,
      time: new Date().toISOString()
    };
    
    setTelegramData(diagnosticData);
    
    // Логируем подробную диагностику
    console.log('[АУДИТ] [DIAG] Telegram WebApp State:', {
      isTelegramAvailable: diagnosticData.telegramAvailable,
      isWebAppAvailable: diagnosticData.webAppAvailable,
      initDataLength: diagnosticData.initDataLength,
      hasInitDataUnsafe: diagnosticData.hasInitDataUnsafe,
      hasUser: diagnosticData.hasUser,
      userId: diagnosticData.userId || 'not available',
      username: telegramUser?.username || 'not available',
      firstName: telegramUser?.first_name || 'not available',
      startParam: diagnosticData.startParam || 'not available',
      authDate: webApp?.initDataUnsafe?.auth_date || 'not available',
      platform: webApp?.platform || 'not available',
      version: webApp?.version || 'not available',
      hash: webApp?.initDataUnsafe?.hash || 'absent',
      fullInitData: webApp?.initData || 'empty',
      documentURL: document.URL,
      isIframe: window !== window.parent,
      userAgent: navigator.userAgent,
      time: diagnosticData.time
    });
  }, [userData]);
  
  // Стиль для блока, который будет виден вне основного контента но не закрывая его
  const diagnosticsStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    zIndex: 9999,
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    padding: '8px',
    fontSize: '10px',
    maxWidth: '100%',
    width: 'auto',
    height: 'auto',
    overflow: 'hidden',
    fontFamily: 'monospace',
    lineHeight: '1.3',
    opacity: 0.9
  };
  
  return (
    <div style={diagnosticsStyle}>
      <div style={{fontSize: '9px', color: '#ff9800', marginBottom: '3px'}}>⚠️ TELEGRAM DIAGNOSTICS</div>
      <div>U:{telegramData.userId || 'n/a'} | R:{telegramData.refCode || 'n/a'}</div>
      <div>TG:{telegramData.telegramAvailable?'✓':'✗'} WebApp:{telegramData.webAppAvailable?'✓':'✗'}</div>
      <div>initData:{telegramData.initDataLength}b | User:{telegramData.hasUser?'✓':'✗'}</div>
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [telegramAuthError, setTelegramAuthError] = useState<string | null>(null);
  const [showDiagnostics] = useState(true); // Всегда показываем диагностику

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
            console.log('[АУДИТ] DIAG: Telegram WebApp state after initialization:', {
              // Основные поля
              initDataAvailable: !!window.Telegram.WebApp.initData,
              initDataLength: (window.Telegram.WebApp.initData || '').length,
              // Добавляем само значение initData для анализа
              initData: window.Telegram.WebApp.initData || 'empty',
              // Проверка объекта с пользовательскими данными
              initDataUnsafeAvailable: !!window.Telegram.WebApp.initDataUnsafe,
              userAvailable: !!window.Telegram.WebApp.initDataUnsafe?.user,
              userId: window.Telegram.WebApp.initDataUnsafe?.user?.id || 'недоступен',
              username: window.Telegram.WebApp.initDataUnsafe?.user?.username || 'недоступен',
              firstName: window.Telegram.WebApp.initDataUnsafe?.user?.first_name || 'недоступен',
              // Проверка служебных полей
              startParam: window.Telegram.WebApp.startParam || 'недоступен',
              platform: window.Telegram.WebApp.platform || 'недоступен',
              version: window.Telegram.WebApp.version || 'недоступен',
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
        {/* Безусловный диагностический блок на самом верхнем уровне */}
        {showDiagnostics && <RootTelegramDiagnostics />}
        
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
