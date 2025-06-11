import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

// Layouts and Hooks
import MainLayout from "@/layouts/MainLayout";
import { useTelegram } from "@/hooks/useTelegram";
import { useBalance } from "@/hooks/useBalance";

// Components
import TelegramWebAppCheck from "@/components/ui/TelegramWebAppCheck";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { UserProvider } from "@/contexts/simpleUserContext";
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
  const [state, setState] = useState<AppState>({
    isLoading: true,
    userId: null,
    activeTab: "dashboard",
    authError: null
  });

  const { isReady: telegramReady, user: telegramUser, initData } = useTelegram();

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('[UniFarm] Начинаем инициализацию приложения');
      setState(prev => ({ ...prev, isLoading: true, authError: null }));
      
      // Загружаем интерфейс сразу, без ожидания аутентификации
      console.log('[UniFarm] Устанавливаем isLoading: false');
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
      console.log('[UniFarm] Принудительно устанавливаем isLoading: false из-за ошибки');
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        userId: 1
      }));
    }
  };

  const authenticateUser = async () => {
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
      
      // Обновляем userId если он еще не установлен
      setState(prev => {
        if (!prev.userId) {
          return { ...prev, userId: 1 };
        }
        return prev;
      });
      
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
    console.log('[UniFarm] Показываем экран загрузки');
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ border: '2px solid #8b5cf6', borderTop: '2px solid transparent', borderRadius: '50%', width: '32px', height: '32px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p>Загрузка UniFarm...</p>
        </div>
      </div>
    );
  }

  console.log('[UniFarm] Рендерим основной интерфейс, state:', state);

  // В случае ошибки аутентификации всё равно загружаем основной интерфейс
  // Ошибки будут отображаться в уведомлениях, но не блокируют UI

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0f0f23', 
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <UserProvider>
            <TelegramWebAppCheck>
              <MainLayout 
                activeTab={state.activeTab} 
                onTabChange={handleTabChange}
              >
                {renderPage()}
              </MainLayout>
              <Toaster />
            </TelegramWebAppCheck>
          </UserProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </div>
  );
}

export default App;