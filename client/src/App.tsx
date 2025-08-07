import React, { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

// Layouts and Hooks
import MainLayout from "@/layouts/MainLayout";
import { useTelegram } from "@/hooks/useTelegram";
import { useAutoAuth } from "@/hooks/useAutoAuth";
import { useJwtTokenWatcher } from "@/hooks/useJwtTokenWatcher";

// Components
import TelegramWebAppCheck from "@/components/ui/TelegramWebAppCheck";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import TonConnectErrorBoundary from "@/components/ui/TonConnectErrorBoundary";
import { UserProvider } from "@/contexts/userContext";
import { WebSocketProvider } from "@/contexts/webSocketContext";
import { NotificationProvider } from "@/contexts/NotificationContext";

import NetworkStatusIndicator from "@/components/common/NetworkStatusIndicator";
import { WebSocketBalanceSync } from "@/components/WebSocketBalanceSync";
// import { JwtTokenStatus } from "@/components/JwtTokenStatus"; // УБРАН ИЗ UI - JWT защита работает в фоне


// Pages
import Dashboard from "@/pages/Dashboard";
import Farming from "@/pages/Farming";
import Missions from "@/pages/Missions";
import Friends from "@/pages/Friends";
import Wallet from "@/pages/Wallet";

// Services
import userService from '@/services/userService';
import { getReferrerIdFromURL } from './lib/utils';
import { CacheManager } from '@/utils/cacheManager';
import { forceApplicationRefresh } from '@/utils/forceRefresh';

// Types
interface AppState {
  isLoading: boolean;
  userId: number | null;
  activeTab: string;
  authError: string | null;
  isReloadingAuth: boolean;
}

function App() {
  const [state, setState] = useState<AppState>({
    isLoading: true,
    userId: null,
    activeTab: "dashboard",
    authError: null,
    isReloadingAuth: false
  });

  // Preview mode detection - token should be set via authentication flow
  useEffect(() => {
    if (window.location.hostname.includes('railway') && !localStorage.getItem('unifarm_jwt_token')) {
      console.log('[App] Preview mode detected, no JWT token found - authentication required');
    }
  }, []);

  const { isReady: telegramReady, user: telegramUser, initData } = useTelegram();
  const { isAuthenticating, authError: autoAuthError } = useAutoAuth();
  
  // JWT Token Protection System - предотвращает потерю депозитов
  const { isWatching } = useJwtTokenWatcher();
  
  // Логируем статус JWT мониторинга
  useEffect(() => {
    console.log(`[JWT_PROTECTION] Система мониторинга JWT токенов: ${isWatching ? 'АКТИВНА' : 'НЕАКТИВНА'}`);
  }, [isWatching]);

  // Initialize app
  useEffect(() => {
    console.log('[App] Component mounted, auto auth status:', { isAuthenticating, autoAuthError });
    
    // ПРИНУДИТЕЛЬНАЯ ОЧИСТКА КЕША ДЛЯ ОБНОВЛЕНИЯ UI
    console.log('🔄 [App] Выполняем принудительную очистку кеша для обновления');
    forceApplicationRefresh();
    
    initializeApp();
  }, []);
  
  // Логируем изменения статуса автоматической авторизации
  useEffect(() => {
    if (autoAuthError) {
      console.error('[App] Auto auth error:', autoAuthError);
    }
  }, [autoAuthError]);

  const initializeApp = async () => {
    try {
      // Force cache clear for all users to eliminate old bugs
      const cacheCleared = CacheManager.checkVersionAndClearCache();
      if (cacheCleared) {
        console.log('🔄 Cache cleared - user will get fresh version without bugs');
      }
      setState(prev => ({ ...prev, isLoading: true, authError: null }));
      
      // Загружаем интерфейс сразу, без ожидания аутентификации
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        userId: 1 // Устанавливаем базовый ID для демонстрации
      }));
      
      // Пытаемся создать пользователя в фоне, не блокируя интерфейс
      try {
        await authenticateUser();
      } catch (authError) {
        console.warn('Authentication failed, continuing with demo mode:', authError);
      }
    } catch (error) {
      console.error('App initialization error:', error);
      // В любом случае загружаем интерфейс
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        userId: 1
      }));
    }
  };

  const authenticateUser = async () => {
    console.log('[App] authenticateUser вызван');
    console.log('[App] Telegram WebApp доступен:', !!window.Telegram?.WebApp);
    console.log('[App] Telegram initData:', window.Telegram?.WebApp?.initData ? 'Есть' : 'Нет');
    
    try {
      // Используем готовую функцию для получения реферального кода
      // Она корректно обрабатывает все форматы: startapp, ref_code, refCode, start_param
      const refCode = getReferrerIdFromURL();

      if (refCode) {
        sessionStorage.setItem('referrer_code', refCode);
        
        // Логируем источник реферального кода для отладки
        console.log('[App] Referral code found via getReferrerIdFromURL():', {
          refCode: refCode,
          source: 'getReferrerIdFromURL_function'
        });
      } else {
        console.log('[App] No referral code found in any source');
      }

      // Get or create guest ID
      const guestId = getOrCreateGuestId();
      
      // Save guest ID for future sessions
      localStorage.setItem('unifarm_guest_id', guestId);
      
      // Проверяем наличие Telegram WebApp
      if (window.Telegram?.WebApp?.initData) {
        console.log('[App] Найден Telegram WebApp, выполняем авторизацию...');
        
        try {
          const response = await fetch('/api/v2/auth/telegram', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Telegram-Init-Data': window.Telegram.WebApp.initData
            },
            body: JSON.stringify({
              initData: window.Telegram.WebApp.initData,
              ref_by: refCode || undefined
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.token) {
              console.log('[App] Авторизация успешна, сохраняем JWT токен');
              localStorage.setItem('unifarm_jwt_token', data.data.token);
              
              // Сохраняем данные пользователя
              if (data.data.user) {
                setState(prev => ({
                  ...prev,
                  userId: data.data.user.id,
                  authError: null
                }));
              }
              
              // НЕ обновляем страницу - это вызывает бесконечный цикл!
              console.log('[App] Авторизация завершена, продолжаем без перезагрузки');
              setState(prev => ({ 
                ...prev, 
                isLoading: false,
                isAuthenticated: true 
              }));
            }
          } else {
            console.error('[App] Ошибка авторизации:', response.status, response.statusText);
            
            // Если это ошибка авторизации, обрабатываем корректно
            if (response.status === 401) {
              try {
                const errorData = await response.json();
                if (errorData.error && 
                    (errorData.error.includes('Authentication required') || errorData.need_jwt_token)) {
                  console.log('[App] Обнаружена ошибка авторизации, перезагрузка через 2 секунды...');
                  setState(prev => ({ ...prev, isReloadingAuth: true, isLoading: false }));
                  setTimeout(() => {
                    window.location.href = window.location.href;
                  }, 2000);
                  return;
                }
              } catch (parseError) {
                console.error('[App] Не удалось распарсить ошибку авторизации:', parseError);
              }
            }
          }
        } catch (authError) {
          console.error('[App] Ошибка при вызове auth/telegram:', authError);
          
          // Проверяем, является ли это ошибкой авторизации
          const errorMessage = authError instanceof Error ? authError.message : String(authError);
          if (errorMessage.includes('Authentication required') || 
              errorMessage.includes('need_jwt_token') ||
              errorMessage.includes('401')) {
            console.log('[App] Обнаружена ошибка авторизации в catch блоке, перезагрузка через 2 секунды...');
            setState(prev => ({ ...prev, isReloadingAuth: true, isLoading: false }));
            setTimeout(() => {
              window.location.href = window.location.href;
            }, 2000);
            return;
          }
        }
      } else {
        // Проверяем наличие существующего JWT токена
        const existingToken = localStorage.getItem('unifarm_jwt_token');
        console.log('[App] Проверка JWT токена:', existingToken ? 'Найден' : 'Отсутствует');
        
        if (!existingToken) {
          console.log('[App] Telegram WebApp не найден и нет JWT токена');
          
          // Проверяем, находимся ли мы в Preview режиме Railway
          const hostname = window.location.hostname;
          const isRailwayPreview = hostname.includes('railway');
          console.log('[App] Hostname:', hostname, 'Is Railway Preview:', isRailwayPreview);
          
          if (isRailwayPreview) {
            console.log('[App] Preview режим Railway - создаем тестового пользователя');
            
            try {
              // Создаем тестового пользователя для Preview режима
              const response = await fetch('/api/v2/auth/telegram', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  direct_registration: true,
                  telegram_id: 999489, // Передаем как число, а не строку
                  username: 'test_user_1752129840905',
                  first_name: 'Test'
                })
              });

              console.log('[App] Preview auth response status:', response.status);
              const data = await response.json();
              console.log('[App] Preview auth response data:', data);

              if (response.ok && data.success && data.data?.token) {
                console.log('[App] Preview авторизация успешна, сохраняем токен');
                localStorage.setItem('unifarm_jwt_token', data.data.token);
                console.log('[App] Токен сохранен, НЕ перезагружаем страницу для предотвращения цикла');
                // НЕ перезагружаем - это вызывает бесконечный цикл!
                // Вместо этого обновляем состояние напрямую
                setState(prev => ({ 
                  ...prev, 
                  isLoading: false,
                  isAuthenticated: true 
                }));
              } else {
                console.error('[App] Preview авторизация не удалась:', data.error || 'Unknown error');
                
                // Если это ошибка авторизации, обрабатываем корректно
                if (data.error && 
                    (data.error.includes('Authentication required') || data.need_jwt_token)) {
                  console.log('[App] Preview режим: обнаружена ошибка авторизации, перезагрузка через 2 секунды...');
                  setState(prev => ({ ...prev, isReloadingAuth: true, isLoading: false }));
                  setTimeout(() => {
                    window.location.href = window.location.href;
                  }, 2000);
                  return;
                }
              }
            } catch (error) {
              console.error('[App] Ошибка создания preview пользователя:', error);
              
              // Проверяем, является ли это ошибкой авторизации
              const errorMessage = error instanceof Error ? error.message : String(error);
              if (errorMessage.includes('Authentication required') || 
                  errorMessage.includes('need_jwt_token') ||
                  errorMessage.includes('401')) {
                console.log('[App] Preview режим: обнаружена ошибка авторизации в catch блоке, перезагрузка через 2 секунды...');
                setState(prev => ({ ...prev, isReloadingAuth: true, isLoading: false }));
                setTimeout(() => {
                  window.location.href = window.location.href;
                }, 2000);
                return;
              }
            }
          } else {
            console.log('[App] Не в Preview режиме Railway, пропускаем автоматическую авторизацию');
          }
        } else {
          console.log('[App] Используем существующий JWT токен');
        }
      }
      
      console.log('Demo mode: using guest ID', guestId);
    } catch (error) {
      console.warn('Authentication skipped, continuing in demo mode:', error);
    }
  };

  const getOrCreateGuestId = () => {
    let guestId = localStorage.getItem('unifarm_guest_id');
    
    if (!guestId) {
      guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('unifarm_guest_id', guestId);
    }
    
    return guestId;
  };

  const handleTabChange = (tab: string) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  };

  const renderPage = () => {
    switch (state.activeTab) {
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

  // Loading state
  if (state.isLoading || state.isReloadingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {state.isReloadingAuth 
              ? 'Обновление авторизации...' 
              : 'Загрузка UniFarm...'
            }
          </p>
          {state.isReloadingAuth && (
            <p className="text-xs text-muted-foreground mt-2">
              Приложение перезагрузится автоматически через несколько секунд
            </p>
          )}
        </div>
      </div>
    );
  }

  // В случае ошибки аутентификации всё равно загружаем основной интерфейс
  // Ошибки будут отображаться в уведомлениях, но не блокируют UI

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <TonConnectUIProvider manifestUrl="https://web-production-8e45b.up.railway.app/tonconnect-manifest.json">
          <TonConnectErrorBoundary>
              <NotificationProvider>
                <UserProvider>
                  <WebSocketProvider>
                  <WebSocketBalanceSync />
                  <TelegramWebAppCheck>
                    <MainLayout 
                      activeTab={state.activeTab} 
                      onTabChange={handleTabChange}
                    >
                      {renderPage()}
                    </MainLayout>
                    {/* <JwtTokenStatus /> - СКРЫТО: JWT защита работает в фоне без отображения */}
                    {/* <NetworkStatusIndicator /> */}
                    <Toaster />
                  </TelegramWebAppCheck>
                  </WebSocketProvider>
                </UserProvider>
              </NotificationProvider>
          </TonConnectErrorBoundary>
        </TonConnectUIProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;