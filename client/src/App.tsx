import { useState, useEffect } from "react";
import { Switch, Route, useLocation, useRoute } from "wouter";
// Импортируем исправленный queryClient, который не использует Map для проблемных запросов
import { safeQueryClient } from "./lib/queryClientFixed";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { apiRequest } from "@/lib/queryClient";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { 
  registerUserWithTelegram, // Функция регистрации пользователя
  logAppLaunch, // Функция логирования запуска Mini App
  clearTelegramCache, // Функция очистки кэша (для совместимости)
  initTelegramWebApp, // Функция инициализации Telegram WebApp (Этап 11.1)
  isTelegramWebApp // Функция проверки наличия Telegram WebApp
} from "./services/telegramService";
import { getReferrerIdFromURL } from './lib/utils';
import userService from '@/services/userService';
import sessionRestoreService from '@/services/sessionRestoreService'; // Сервис восстановления сессии
import { UserProvider } from "@/contexts/userContext"; // Импортируем UserProvider
import { NotificationProvider } from "@/contexts/notificationContext"; // Импортируем NotificationProvider
import NotificationContainer from "@/components/ui/NotificationContainer"; // Импортируем контейнер уведомлений
import ErrorBoundary from "@/components/ui/ErrorBoundary"; // Импортируем глобальный ErrorBoundary

// Импортируем компоненты UI
import TelegramWebAppCheck from "@/components/ui/TelegramWebAppCheck";

import Header from "@/components/layout/Header";
import NavigationBar from "@/components/layout/NavigationBar";
import Dashboard from "@/pages/Dashboard";
import Farming from "@/pages/Farming";
import Missions from "@/pages/Missions";
import MissionsNavMenu from "@/pages/MissionsNavMenu"; // Специальная версия для меню
// Используем только основной компонент миссий
import Friends from "@/pages/Friends"; // Компонент страницы друзей и реферальной системы
import Wallet from "@/pages/Wallet";
import AdminPage from "./pages/AdminPage";
import TelegramSetupGuide from "./pages/TelegramSetupGuide";
import TelegramMiniApp from "./pages/TelegramMiniApp";
import TelegramInitializer from "@/components/telegram/TelegramInitializer";
// Используем только стандартный компонент MissionsList

// Дополнительные определения для глобальных объектов
declare global {
  interface Window {
    process: any; // Используем any, чтобы избежать конфликта типов
    TextEncoder: typeof TextEncoder;
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
          start_param?: string;
        };
        version: string;
        platform: string;
        colorScheme?: string;
        MainButton?: any;
        CloudStorage?: {
          getItem: (key: string) => Promise<string | null>;
          setItem: (key: string, value: string) => Promise<void>;
          removeItem: (key: string) => Promise<void>;
          getItems: (keys: string[]) => Promise<Record<string, string | null>>;
          removeItems: (keys: string[]) => Promise<void>;
        };
      }
    }
  }
}

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [telegramAuthError, setTelegramAuthError] = useState<string | null>(null);

  // Проверка инициализации приложения (без Telegram WebApp по требованиям фазы 10.3)
  useEffect(() => {
    console.log('==[ App Init Check (No Telegram WebApp) ]==');
    console.log('Running in environment:', process.env.NODE_ENV);
    console.log('Window available:', typeof window !== 'undefined');
    
    // Шаг 1.2 — Проверка initData в Telegram WebApp
    console.log('==[ Guest ID Check ]==', 
      sessionRestoreService.getGuestId() || 'not found'
    );
    
    // Отладочная информация для проверки наличия реферального кода
    const urlParams = new URLSearchParams(window.location.search);
    console.log('==[ Ref Code Check ]==', {
      inUrl: urlParams.has('ref_code') || urlParams.has('refCode'),
      refCode: urlParams.get('ref_code') || urlParams.get('refCode') || 'not found',
      inSession: !!sessionStorage.getItem('referrer_code'),
      sessionRefCode: sessionStorage.getItem('referrer_code') || 'not found'
    });
  }, []);

  // Очистка кэша Telegram при старте приложения
  useEffect(() => {
    // Принудительная очистка всех кэшированных данных Telegram при загрузке приложения
    // Это необходимо для удаления устаревших данных от старого бота
    console.log('[App] 🧹 Очистка кэша Telegram при старте приложения...');
    clearTelegramCache();
    console.log('[App] ✅ Кэш Telegram очищен, обновляем локальные данные...');
  }, []);

  // Этап 11.1: Делегируем инициализацию Telegram WebApp компоненту TelegramInitializer
  // Это освобождает нас от необходимости дублировать код инициализации и гарантирует
  // корректную последовательность действий для корректной работы в среде Telegram
  // 
  // Все используемые ранее вызовы теперь выполняются в TelegramInitializer:
  // - Проверка доступности Telegram WebApp API
  // - Вызов initTelegramWebApp()
  // - Вызов WebApp.ready()
  // - Логирование запуска Mini App
  
  // Примечание: логирование запуска перемещено в TelegramInitializer для соблюдения
  // правильной последовательности инициализации

  // Обновленная инициализация приложения без зависимости от Telegram WebApp
  // (Этап 10.3 - удалены все обращения к window.Telegram.WebApp)
  useEffect(() => {
    console.log('[App] Этап 10.3: Инициализация без зависимости от Telegram WebApp');
    
    // Отображаем информацию о среде выполнения для диагностики
    console.log('[App] Детали среды выполнения:', {
      userAgent: navigator.userAgent,
      isIframe: window.self !== window.top,
      documentURL: window.location.href
    });
    
    // Проверяем, можно ли восстановить сессию из локального хранилища
    if (sessionRestoreService.shouldAttemptRestore()) {
      console.log('[App] 🔄 Пытаемся восстановить сессию по guest_id из локального хранилища...');
      restoreSessionFromStorage();
    } else {
      // Если нет сохраненной сессии, продолжаем обычную авторизацию
      console.log('[App] ⚙️ Нет сохраненной сессии, продолжаем авторизацию через guest_id...');
      authenticateWithTelegram();
    }
  }, []);

  // Отладочный баннер с отображением домена удален для улучшения UX

  // Метод для безопасного восстановления сессии из локального хранилища (Этап 5)
  // Обновлен для обеспечения корректной инициализации Telegram WebApp перед отправкой запросов
  const restoreSessionFromStorage = async () => {
    try {
      setIsLoading(true);
      setTelegramAuthError(null);
      
      console.log('[App] 🔍 Этап 5: Безопасное восстановление пользователя...');
      
      // Шаг 1: Проверка наличия сохранённой сессии
      // Получаем guest_id из хранилища
      const guestId = sessionRestoreService.getGuestId();
      
      // Если guest_id отсутствует, значит пользователь либо впервые зашел в приложение,
      // либо очистил данные
      if (!guestId) {
        console.warn('[App] ⚠️ Не найден guest_id в локальном хранилище');
        console.log('[App] Создаем новый кабинет в соответствии с Этапом 5...');
        
        // Если восстановление невозможно, переходим к обычной авторизации для создания нового кабинета
        authenticateWithTelegram();
        return;
      }
      
      console.log('[App] ✓ Найден guest_id в локальном хранилище:', guestId);
      
      // Шаг 1.5 (НОВЫЙ): Дожидаемся инициализации Telegram WebApp перед отправкой запросов
      console.log('[App] 🕒 Ожидаем инициализации Telegram WebApp перед восстановлением сессии...');
      
      // Ожидаем инициализации Telegram WebApp (или таймаута)
      const telegramReady = await sessionRestoreService.waitForTelegramWebApp();
      
      console.log(`[App] ${telegramReady ? '✅ Telegram WebApp готов' : '⚠️ Таймаут ожидания Telegram WebApp'}, продолжаем восстановление сессии...`);
      
      // Шаг 2: Восстановление кабинета по guest_id
      // Пытаемся восстановить сессию через API
      console.log('[App] Отправляем запрос на восстановление сессии с guest_id:', guestId);
      const result = await sessionRestoreService.restoreSession(guestId);
      
      if (result.success && result.data) {
        // Успешно восстановили сессию
        setUserId(result.data.user_id);
        console.log('[App] ✅ Кабинет успешно восстановлен для пользователя:', result.data);
        
        // Обновляем кэш запросов для получения актуальных данных пользователя
        queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      } else {
        // Не удалось восстановить сессию - вероятно, guest_id устарел или был удален из базы
        console.error('[App] ❌ Не удалось восстановить кабинет:', result.message);
        
        // Удаляем некорректный guest_id
        sessionRestoreService.clearGuestIdAndSession();
        
        // Переходим к обычной авторизации для создания нового кабинета
        authenticateWithTelegram();
      }
    } catch (error) {
      console.error('[App] ❌ Ошибка при восстановлении кабинета:', error);
      
      // При ошибке очищаем данные сессии, чтобы избежать зацикливания
      sessionRestoreService.clearGuestIdAndSession();
      
      // Переходим к обычной авторизации при ошибке
      authenticateWithTelegram();
    } finally {
      setIsLoading(false);
    }
  };

  // Метод для аутентификации только через guest_id и ref_code
  // Обновлен для обеспечения корректной инициализации Telegram WebApp перед отправкой запросов
  const authenticateWithTelegram = async () => {
    try {
      setIsLoading(true);
      setTelegramAuthError(null);

      console.log('[App] Начинаем аутентификацию только через guest_id и ref_code');
      
      // Этап 3.1: Проверка наличия реферального кода в URL
      let referrerCode: string | null = null;
      
      try {
        // Получаем реферальный код только из URL параметров
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('ref_code') || urlParams.has('refCode')) {
          const refCodeFromUrl = urlParams.get('ref_code') || urlParams.get('refCode');
          referrerCode = refCodeFromUrl || '';  // Преобразуем в пустую строку вместо null
          console.log('[App] Обнаружен реферальный код в URL:', referrerCode);
          
          // Сохраняем реферальный код в sessionStorage (если он есть)
          if (referrerCode) {
            sessionStorage.setItem('referrer_code', referrerCode);
            sessionStorage.setItem('referrer_code_timestamp', Date.now().toString());
          }
        } else {
          console.log('[App] Реферальный код в URL не обнаружен');
          
          // Проверяем сохраненный реферальный код
          const savedRefCode = sessionStorage.getItem('referrer_code');
          if (savedRefCode) {
            console.log('[App] Используем ранее сохраненный реферальный код:', savedRefCode);
            referrerCode = savedRefCode;
          }
        }
      } catch (error) {
        console.error('[App] Ошибка при обработке реферального кода:', error);
      }
      
      // Этап 5.1: Получение или создание гостевого ID
      const guestId = sessionRestoreService.getOrCreateGuestId();
      console.log('[App] Используем guest_id:', guestId);
      
      // Шаг 5.1.5 (НОВЫЙ): Дожидаемся инициализации Telegram WebApp перед отправкой запросов
      console.log('[App] 🕒 Ожидаем инициализации Telegram WebApp перед авторизацией...');
      
      // Ожидаем инициализации Telegram WebApp (или таймаута)
      const telegramReady = await sessionRestoreService.waitForTelegramWebApp();
      
      console.log(`[App] ${telegramReady ? '✅ Telegram WebApp готов' : '⚠️ Таймаут ожидания Telegram WebApp'}, продолжаем авторизацию...`);
      
      // Этап 5.2: Проверка существующего пользователя и создание нового при необходимости
      try {
        console.log('[App] Проверяем существование пользователя с guest_id:', guestId);
        const existingUser = await userService.getUserByGuestId(guestId)
          .catch(() => null);
        
        if (existingUser) {
          console.log('[App] Найден существующий пользователь по guest_id:', existingUser);
          setUserId(existingUser.id);
          
          // Сохраняем guest_id для восстановления сессии
          sessionRestoreService.saveGuestId(guestId);
          
          // Обновляем кэш запросов для получения актуальных данных
          queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
          queryClient.invalidateQueries({ queryKey: ['/api/me'] });
        } else {
          console.log('[App] Пользователь не найден, регистрируем нового с guest_id');
          
          // Регистрируем пользователя с guest_id и реферальным кодом (если есть)
          // Если referrerCode пустой или null, передаем undefined
          const refCodeToSend = referrerCode && referrerCode.length > 0 ? referrerCode : undefined;
          console.log('[App] Отправляем запрос на регистрацию с guest_id:', guestId, 'и ref_code:', refCodeToSend || 'не указан');
          const registrationResult = await registerUserWithTelegram(guestId, refCodeToSend);
          
          if (registrationResult && registrationResult.success) {
            console.log('[App] Пользователь успешно зарегистрирован:', registrationResult);
            
            // Сохраняем данные о новом пользователе
            if (registrationResult.data && registrationResult.data.user_id) {
              const newUserId = registrationResult.data.user_id;
              setUserId(newUserId);
              
              // Сохраняем guest_id для будущего восстановления сессии
              sessionRestoreService.saveGuestId(guestId);
              
              // Устанавливаем статус зарегистрированного пользователя
              console.log('[App] Пользователь успешно идентифицирован и авторизован');
            } else {
              console.error('[App] API вернул успех, но отсутствуют данные пользователя');
              setTelegramAuthError('Ошибка получения ID пользователя');
            }
          } else {
            console.error('[App] Ошибка регистрации пользователя:', registrationResult);
            setTelegramAuthError('Ошибка регистрации пользователя');
          }
        }
      } catch (error) {
        console.error('[App] Ошибка при работе с пользователем:', error);
        setTelegramAuthError('Ошибка доступа к серверу');
      }
    } catch (error) {
      console.error('[App] Общая ошибка аутентификации:', error);
      setTelegramAuthError('Ошибка аутентификации');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch between tabs without using routes (simpler for Telegram Mini App)
  const renderActivePage = () => {
    // ЭТАП 4.1: Удалена проверка на минимальную версию.
    // Всегда используем единый компонент Friends, работающий во всех средах.
    
    // Используем дополнительные импорты на верхнем уровне
    // Используем MissionsFix вместо стандартного Missions
    // Используем только стандартные компоненты
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "farming":
        return <Farming />;
      case "missions":
        // Использовать новый компонент с прямыми вызовами API
        // Это требуется по ТЗ: "Настроить вызов именно на /missions и обеспечить корректную загрузку карточек"
        // Обходим ошибку "w.map is not a function" используя прямой компонент
        return (
          <div className="p-4">
            <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
            <div className="grid gap-4">
              {/* Используем основной компонент MissionsList через импорт из Missions */}
              <Missions />
            </div>
          </div>
        );
      case "friends":
        // Используем основной компонент Friends
        return <Friends />;
      case "wallet":
        return <Wallet />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <QueryClientProvider client={safeQueryClient}>
      <TonConnectUIProvider manifestUrl="https://universegames8.github.io/tonconnect-manifest/tonconnect-manifest.json">
        {/* Компонент для автоматической инициализации Telegram WebApp */}
        <TelegramInitializer />
        
        {/* Оборачиваем весь контент в NotificationProvider и UserProvider */}
        <NotificationProvider>
          {/* Компонент для отображения уведомлений */}
          <NotificationContainer />
          
          {/* Оборачиваем весь контент в Provider контекста пользователя */}
          <UserProvider>
            {/* Оборачиваем весь контент в компонент проверки Telegram WebApp */}
            <ErrorBoundary>
              <TelegramWebAppCheck>
                <div className="max-w-md mx-auto min-h-screen bg-background pb-20 relative">
                  <Switch>
                    {/* Маршруты для Telegram Mini App */}
                    <Route path="/UniFarm/">
                      <TelegramMiniApp />
                    </Route>
                    
                    {/* Для совместимости, маршрут для Mini App независимо от регистра */}
                    <Route path="/unifarm/">
                      <TelegramMiniApp />
                    </Route>
                    
                    {/* Специальный обработчик для маршрута /app/ со слешем */}
                    <Route path="/app/">
                      <TelegramMiniApp />
                    </Route>
                    
                    {/* Основной маршрут /app без слеша */}
                    <Route path="/app">
                      <TelegramMiniApp />
                    </Route>
                    
                    {/* Административная страница для настройки бота */}
                    <Route path="/admin">
                      <AdminPage />
                    </Route>
                    
                    {/* Руководство по настройке Telegram Mini App */}
                    <Route path="/telegram-setup">
                      <TelegramSetupGuide />
                    </Route>
                    
                    {/* Прямой маршрут на страницу фарминга */}
                    <Route path="/farming">
                      <div className="max-w-md mx-auto bg-background">
                        <Header />
                        <main className="px-4 pt-2 pb-20">
                          <Farming />
                        </main>
                        <NavigationBar activeTab="farming" setActiveTab={setActiveTab} />
                      </div>
                    </Route>

                    {/* Прямой маршрут на страницу кошелька */}
                    <Route path="/wallet">
                      <div className="max-w-md mx-auto bg-background">
                        <Header />
                        <main className="px-4 pt-2 pb-20">
                          <Wallet />
                        </main>
                        <NavigationBar activeTab="wallet" setActiveTab={setActiveTab} />
                      </div>
                    </Route>

                    {/* Прямой маршрут на страницу друзей/партнёрки */}
                    <Route path="/friends">
                      <div className="max-w-md mx-auto bg-background">
                        <Header />
                        <main className="px-4 pt-2 pb-20">
                          <Friends />
                        </main>
                        <NavigationBar activeTab="friends" setActiveTab={setActiveTab} />
                      </div>
                    </Route>

                    {/* Прямой маршрут на страницу миссий - URL версия */}
                    <Route path="/missions">
                      <div className="max-w-md mx-auto bg-background">
                        <Header />
                        <main className="px-4 pt-2 pb-20">
                          <Missions />
                        </main>
                        <NavigationBar activeTab="missions" setActiveTab={setActiveTab} />
                      </div>
                    </Route>
                    
                    {/* Удален специальный маршрут для прямого доступа к миссиям без React Query */}
                    
                    {/* Тестовый маршрут на страницу миссий для навигации через меню */}
                    <Route path="/missions-nav">
                      <div className="max-w-md mx-auto bg-background">
                        <Header />
                        <main className="px-4 pt-2 pb-20">
                          <MissionsNavMenu />
                        </main>
                        <NavigationBar activeTab="missions" setActiveTab={setActiveTab} />
                      </div>
                    </Route>

                    {/* Прямой маршрут на страницу дашборда */}
                    <Route path="/dashboard">
                      <div className="max-w-md mx-auto bg-background">
                        <Header />
                        <main className="px-4 pt-2 pb-20">
                          <Dashboard />
                        </main>
                        <NavigationBar activeTab="dashboard" setActiveTab={setActiveTab} />
                      </div>
                    </Route>
                    
                    {/* Основной интерфейс приложения */}
                    <Route path="*">
                      <Header />
                      {/* Показываем предупреждение о проблемах с Telegram WebApp */}
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
                  <Toaster />
                </div>
              </TelegramWebAppCheck>
            </ErrorBoundary>
          </UserProvider>
        </NotificationProvider>
      </TonConnectUIProvider>
    </QueryClientProvider>
  );
}

export default App;