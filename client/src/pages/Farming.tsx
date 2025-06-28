import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import UniFarmingCard from '../components/farming/UniFarmingCard';
import BoostPackagesCard from '../components/farming/BoostPackagesCard';
import TonBoostPackagesCard from '../components/ton-boost/TonBoostPackagesCard';
import TonFarmingStatusCard from '../components/ton-boost/TonFarmingStatusCard';
import ActiveTonBoostsCard from '../components/ton-boost/ActiveTonBoostsCard';
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
    <div className="space-y-4 pb-6">
      <h1 className="text-2xl font-bold mb-6">Фарминг</h1>
      
      <Tabs defaultValue="uni" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="uni" className="text-lg">UNI Фарминг</TabsTrigger>
          <TabsTrigger value="ton" className="text-lg">TON Фарминг</TabsTrigger>
        </TabsList>
        
        <TabsContent value="uni" className="space-y-4">
          {/* Основной UNI пакет */}
          <UniFarmingCard userData={userData} />
          
          {/* UNI Boost Пакеты */}
          <BoostPackagesCard userData={userData} />
        </TabsContent>
        
        <TabsContent value="ton" className="space-y-4">
          {/* Статус TON фарминга - с ErrorBoundary */}
          <TonFarmingStatusCard />
          
          {/* Активные TON Boost-пакеты - с ErrorBoundary */}
          <ActiveTonBoostsCard />
          
          {/* TON Boost-пакеты - с ErrorBoundary */}
          <BoostPackagesCard userData={userData} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Farming;