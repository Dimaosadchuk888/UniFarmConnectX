import React, { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

// Layouts and Hooks
import MainLayout from "@/layouts/MainLayout";
import { useTelegram } from "@/hooks/useTelegram";
import { useBalance } from "@/hooks/useBalance";
import { useAutoAuth } from "@/hooks/useAutoAuth";

// Components
import TelegramWebAppCheck from "@/components/ui/TelegramWebAppCheck";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { UserProvider } from "@/contexts/userContext";
import { WebSocketProvider } from "@/contexts/webSocketContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import NetworkStatusIndicator from "@/components/common/NetworkStatusIndicator";


// Pages
import Dashboard from "@/pages/Dashboard";
import Farming from "@/pages/Farming";
import Missions from "@/pages/Missions";
import Friends from "@/pages/Friends";
import Wallet from "@/pages/Wallet";

// Services
import userService from '@/services/userService';
import { getReferrerIdFromURL } from './lib/utils';

// Types
interface AppState {
  isLoading: boolean;
  userId: number | null;
  activeTab: string;
  authError: string | null;
}

function App() {
  // Set JWT token for Preview mode before any other initialization
  useEffect(() => {
    if (window.location.hostname.includes('replit') && !localStorage.getItem('unifarm_jwt_token')) {
      const previewToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc0LCJ0ZWxlZ3JhbV9pZCI6OTk5NDg5LCJ1c2VybmFtZSI6InRlc3RfdXNlcl8xNzUyMTI5ODQwOTA1IiwicmVmX2NvZGUiOiJURVNUXzE3NTIxMjk4NDA5MDVfZG9reHYwIiwiaWF0IjoxNzUyMTQ0MjkxLCJleHAiOjE3NTI3NDkwOTF9.2A18-Rx0enn8v30ANK6RVBl7SoR_TV2fUJN2hOox-C4';
      localStorage.setItem('unifarm_jwt_token', previewToken);
      console.log('[App] Preview mode JWT token set for user ID 74');
    }
  }, []);

  const [state, setState] = useState<AppState>({
    isLoading: true,
    userId: null,
    activeTab: "dashboard",
    authError: null
  });

  const { isReady: telegramReady, user: telegramUser, initData } = useTelegram();
  const { isAuthenticating, authError: autoAuthError } = useAutoAuth();

  // Initialize app
  useEffect(() => {
    console.log('[App] Component mounted, auto auth status:', { isAuthenticating, autoAuthError });
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
      // Get referral code from URL
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref_code') || urlParams.get('refCode') || 
                     sessionStorage.getItem('referrer_code');

      if (refCode) {
        sessionStorage.setItem('referrer_code', refCode);
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
              
              // Обновляем страницу для применения авторизации
              window.location.reload();
            }
          } else {
            console.error('[App] Ошибка авторизации:', response.status, response.statusText);
          }
        } catch (authError) {
          console.error('[App] Ошибка при вызове auth/telegram:', authError);
        }
      } else {
        // Проверяем наличие существующего JWT токена
        const existingToken = localStorage.getItem('unifarm_jwt_token');
        console.log('[App] Проверка JWT токена:', existingToken ? 'Найден' : 'Отсутствует');
        
        if (!existingToken) {
          console.log('[App] Telegram WebApp не найден и нет JWT токена');
          
          // Проверяем, находимся ли мы в Preview режиме Replit
          const hostname = window.location.hostname;
          const isReplitPreview = hostname.includes('replit');
          console.log('[App] Hostname:', hostname, 'Is Replit Preview:', isReplitPreview);
          
          if (isReplitPreview) {
            console.log('[App] Preview режим Replit - создаем тестового пользователя');
            
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
                console.log('[App] Токен сохранен, перезагружаем страницу...');
                window.location.reload();
              } else {
                console.error('[App] Preview авторизация не удалась:', data.error || 'Unknown error');
              }
            } catch (error) {
              console.error('[App] Ошибка создания preview пользователя:', error);
            }
          } else {
            console.log('[App] Не в Preview режиме Replit, пропускаем автоматическую авторизацию');
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
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка UniFarm...</p>
        </div>
      </div>
    );
  }

  // В случае ошибки аутентификации всё равно загружаем основной интерфейс
  // Ошибки будут отображаться в уведомлениях, но не блокируют UI

  return (
    <QueryClientProvider client={queryClient}>
      <TonConnectUIProvider manifestUrl="/tonconnect-manifest.json">
        <ErrorBoundary>
          <NotificationProvider>
            <UserProvider>
              <WebSocketProvider>
                <TelegramWebAppCheck>
                  <MainLayout 
                    activeTab={state.activeTab} 
                    onTabChange={handleTabChange}
                  >
                    {renderPage()}
                  </MainLayout>
                  {/* <NetworkStatusIndicator /> */}
                  <Toaster />
                </TelegramWebAppCheck>
              </WebSocketProvider>
            </UserProvider>
          </NotificationProvider>
        </ErrorBoundary>
      </TonConnectUIProvider>
    </QueryClientProvider>
  );
}

export default App;