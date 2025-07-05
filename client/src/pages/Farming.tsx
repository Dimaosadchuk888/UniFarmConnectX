import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UniFarmingCardWithErrorBoundary from '../components/farming/UniFarmingCardWithErrorBoundary';
import BoostPackagesCardWithErrorBoundary from '../components/farming/BoostPackagesCardWithErrorBoundary';
import TonBoostPackagesCardWithErrorBoundary from '../components/ton-boost/TonBoostPackagesCardWithErrorBoundary';
import TonFarmingStatusCardWithErrorBoundary from '../components/ton-boost/TonFarmingStatusCardWithErrorBoundary';
import ActiveTonBoostsCardWithErrorBoundary from '../components/ton-boost/ActiveTonBoostsCardWithErrorBoundary';
// ЭТАП 2: Импорт хука для управления кнопками фарминга
import { useTelegramButtons } from '../hooks/useTelegramButtons';

const Farming: React.FC = () => {
  // ЭТАП 2: Инициализация кнопок фарминга с обработчиками
  const { showStartFarmingButton, showCollectButton, hideButton } = useTelegramButtons();
  
  // Статические данные для демонстрации в Replit (без API запросов)
  const userData = null;

  // ЭТАП 2: Обработчики для действий фарминга
  const handleStartFarming = () => {
    console.log('[FARMING PAGE] 🌱 Начало фарминга');
    // Здесь будет интеграция с API фарминга
  };

  const handleHarvestFarming = () => {
    console.log('[FARMING PAGE] 🌾 Сбор урожая');
    // Здесь будет интеграция с API сбора урожая
  };

  // УБРАНА КНОПКА ФАРМИНГА - больше не показываем никаких кнопок внизу
  React.useEffect(() => {
    console.log('[FARMING PAGE] 🔘 Скрываем все кнопки Telegram...');
    
    // ПОЛНОСТЬЮ УБИРАЕМ ВСЕ КНОПКИ - чистый интерфейс без кнопок внизу
    hideButton();
    
    // [FIX: REMOVE FARMING BUTTON] Очистка кнопок при выходе со страницы
    return () => {
      console.log('[FARMING PAGE] 🧹 Очистка кнопок при выходе со страницы фарминга');
      hideButton();
    };
  }, []);

  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4 min-h-full max-w-7xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Фарминг</h1>
      
      <Tabs defaultValue="uni" className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
          <TabsTrigger value="uni" className="text-sm sm:text-lg px-2 sm:px-4">UNI Фарминг</TabsTrigger>
          <TabsTrigger value="ton" className="text-sm sm:text-lg px-2 sm:px-4">TON Фарминг</TabsTrigger>
        </TabsList>
        
        <TabsContent value="uni" className="space-y-6">
          {/* Основной UNI пакет */}
          <UniFarmingCardWithErrorBoundary userData={userData} />
          
          {/* UNI Boost Пакеты */}
          <BoostPackagesCardWithErrorBoundary userData={userData} />
          
          {/* Дополнительное пространство внизу для прокрутки */}
          <div className="h-4"></div>
        </TabsContent>
        
        <TabsContent value="ton" className="space-y-6">
          {/* Статус TON фарминга - с ErrorBoundary */}
          <TonFarmingStatusCardWithErrorBoundary />
          
          {/* Активные TON Boost-пакеты - с ErrorBoundary */}
          <ActiveTonBoostsCardWithErrorBoundary />
          
          {/* TON Boost-пакеты - с ErrorBoundary */}
          <BoostPackagesCardWithErrorBoundary userData={userData} />
          
          {/* Дополнительное пространство внизу для прокрутки */}
          <div className="h-4"></div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Farming;