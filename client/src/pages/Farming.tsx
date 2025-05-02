import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UniFarmingCard from '../components/farming/UniFarmingCard';
import BoostPackagesCard from '../components/farming/BoostPackagesCard';
import ActiveBoostsCard from '../components/farming/ActiveBoostsCard';
import FarmingHistory from '../components/farming/FarmingHistory';
import TonBoostPackagesCard from '../components/ton-boost/BoostPackagesCard';
import TonFarmingStatusCard from '../components/ton-boost/TonFarmingStatusCard';
import ActiveTonBoostsCard from '../components/ton-boost/ActiveTonBoostsCard';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

const Farming: React.FC = () => {
  // Хардкод ID=1 для демонстрации
  const userId = 1;
  
  // Получаем информацию о пользователе для отображения баланса
  const { data: userResponse } = useQuery({
    queryKey: [`/api/users/${userId}`],
  });
  
  // Извлекаем userData из ответа API
  const userData = (userResponse as any)?.data || null;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Фарминг</h1>
      
      <Tabs defaultValue="uni" className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="uni" className="text-lg">UNI Фарминг</TabsTrigger>
          <TabsTrigger value="ton" className="text-lg">TON Фарминг</TabsTrigger>
        </TabsList>
        
        <TabsContent value="uni">
          {/* Основной UNI пакет */}
          <ErrorBoundary fallback={<div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 my-4">Не удалось загрузить фарминг UNI</div>}>
            <UniFarmingCard userData={userData} />
          </ErrorBoundary>
          
          {/* UNI Boost Пакеты */}
          <ErrorBoundary fallback={<div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 my-4">Не удалось загрузить бусты UNI</div>}>
            <BoostPackagesCard userData={userData} />
          </ErrorBoundary>
          
          {/* Активные Boost-пакеты */}
          <ErrorBoundary fallback={<div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 my-4">Не удалось загрузить активные бусты</div>}>
            <ActiveBoostsCard userId={userId} />
          </ErrorBoundary>
        </TabsContent>
        
        <TabsContent value="ton">
          {/* Статус TON фарминга - добавлен новый компонент */}
          <ErrorBoundary fallback={<div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 my-4">Не удалось загрузить статус TON фарминга</div>}>
            <TonFarmingStatusCard />
          </ErrorBoundary>
          
          {/* Активные TON Boost-пакеты */}
          <ErrorBoundary fallback={<div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 my-4">Не удалось загрузить активные TON бусты</div>}>
            <ActiveTonBoostsCard />
          </ErrorBoundary>
          
          {/* TON Boost-пакеты */}
          <ErrorBoundary fallback={<div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 my-4">Не удалось загрузить TON бусты</div>}>
            <div className="mb-6">
              <TonBoostPackagesCard />
            </div>
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
      
      {/* История фарминга (общая для обоих типов) */}
      <ErrorBoundary fallback={<div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 my-4">Не удалось загрузить историю фарминга</div>}>
        <FarmingHistory userId={userId} />
      </ErrorBoundary>
    </div>
  );
};

export default Farming;