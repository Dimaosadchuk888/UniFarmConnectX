import React from 'react';
import { useQuery } from '@tanstack/react-query';
import FarmingStatusCard from '../components/farming/FarmingStatusCard';
import UniFarmingCard from '../components/farming/UniFarmingCard';
import BoostPackagesCard from '../components/farming/BoostPackagesCard';
import ActiveBoostsCard from '../components/farming/ActiveBoostsCard';
import UniFarmingHistory from '../components/farming/UniFarmingHistory';
import TonBoostHistory from '../components/farming/TonBoostHistory';

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
      
      {/* Статус фарминга */}
      <FarmingStatusCard />
      
      {/* Основной UNI пакет */}
      <UniFarmingCard userData={userData} />
      
      {/* История UNI фарминга */}
      <UniFarmingHistory userId={userId} />
      
      {/* Airdrop Boost Пакеты */}
      <BoostPackagesCard userData={userData} />
      
      {/* Активные Boost-пакеты */}
      <ActiveBoostsCard userId={userId} />
      
      {/* История TON Boost-пакетов */}
      <TonBoostHistory userId={userId} />
    </div>
  );
};

export default Farming;