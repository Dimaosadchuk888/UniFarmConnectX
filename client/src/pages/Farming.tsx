import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FarmingStatusCard from '../components/farming/FarmingStatusCard';
import UniFarmingCard from '../components/farming/UniFarmingCard';
import BoostPackagesCard from '../components/farming/BoostPackagesCard';
import ActiveBoostsCard from '../components/farming/ActiveBoostsCard';
import FarmingHistory from '../components/farming/FarmingHistory';
import TonBoostPackagesCard from '../components/ton-boost/BoostPackagesCard';
import TonFarmingStatusCard from '../components/ton-boost/TonFarmingStatusCard';

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
          {/* Статус фарминга */}
          <FarmingStatusCard />
          
          {/* Основной UNI пакет */}
          <UniFarmingCard userData={userData} />
          
          {/* UNI Boost Пакеты */}
          <BoostPackagesCard userData={userData} />
          
          {/* Активные Boost-пакеты */}
          <ActiveBoostsCard userId={userId} />
        </TabsContent>
        
        <TabsContent value="ton">
          {/* Статус TON фарминга - добавлен новый компонент */}
          <TonFarmingStatusCard />
          
          {/* TON Boost-пакеты */}
          <div className="mb-6">
            <TonBoostPackagesCard />
          </div>
        </TabsContent>
      </Tabs>
      
      {/* История фарминга (общая для обоих типов) */}
      <FarmingHistory userId={userId} />
    </div>
  );
};

export default Farming;