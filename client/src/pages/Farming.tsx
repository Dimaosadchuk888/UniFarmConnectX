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
  const handleStartFarming = () => {// Здесь будет интеграция с API фарминга
  };

  const handleHarvestFarming = () => {// Здесь будет интеграция с API сбора урожая
  };

  // УБРАНА КНОПКА ФАРМИНГА - больше не показываем никаких кнопок внизу
  React.useEffect(() => {// ПОЛНОСТЬЮ УБИРАЕМ ВСЕ КНОПКИ - чистый интерфейс без кнопок внизу
    hideButton();
    
    // [FIX: REMOVE FARMING BUTTON] Очистка кнопок при выходе со страницы
    return () => {hideButton();
    };
  }, []);

  return (
    <div className="container mx-auto p-0 pb-6 min-h-full">
      <h1 className="text-2xl font-bold mb-6">Фарминг</h1>
      
      <Tabs defaultValue="uni" className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="uni" className="text-lg">UNI Фарминг</TabsTrigger>
          <TabsTrigger value="ton" className="text-lg">TON Фарминг</TabsTrigger>
        </TabsList>
        
        <TabsContent value="uni">
          {/* Основной UNI пакет */}
          <UniFarmingCardWithErrorBoundary userData={userData} />
          
          {/* UNI Boost Пакеты */}
          <BoostPackagesCardWithErrorBoundary userData={userData} />
        </TabsContent>
        
        <TabsContent value="ton">
          {/* Статус TON фарминга - с ErrorBoundary */}
          <TonFarmingStatusCardWithErrorBoundary />
          
          {/* Активные TON Boost-пакеты - с ErrorBoundary */}
          <ActiveTonBoostsCardWithErrorBoundary />
          
          {/* TON Boost-пакеты - с ErrorBoundary */}
          <div className="mb-6">
            <BoostPackagesCardWithErrorBoundary userData={userData} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Farming;