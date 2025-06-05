import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

// Layouts and Hooks
import MainLayout from "@/layouts/MainLayout";
import { useTelegram } from "@/hooks/useTelegram";
import { useBalance } from "@/hooks/useBalance";

// Components
import TelegramWebAppCheck from "@/components/ui/TelegramWebAppCheck";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { UserProvider } from "@/contexts/userContext";
import { ConfigurableWebSocketProvider } from "@/core/providers/ConfigurableWebSocketProvider";
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
              <ConfigurableWebSocketProvider enableAutoConnect={true}>
                <TelegramWebAppCheck>
                  <MainLayout 
                    activeTab={state.activeTab} 
                    onTabChange={handleTabChange}
                  >
                    {renderPage()}
                  </MainLayout>
                  <NetworkStatusIndicator />
                  <Toaster />
                </TelegramWebAppCheck>
              </ConfigurableWebSocketProvider>
            </UserProvider>
          </NotificationProvider>
        </ErrorBoundary>
      </TonConnectUIProvider>
    </QueryClientProvider>
  );
}

export default App;