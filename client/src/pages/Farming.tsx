import React from 'react';
import { useQuery } from '@tanstack/react-query';
import FarmingStatusCard from '../components/farming/FarmingStatusCard';
import UniFarmingCard from '../components/farming/UniFarmingCard';
import BoostPackagesCard from '../components/farming/BoostPackagesCard';

const Farming: React.FC = () => {
  // Получаем информацию о пользователе для отображения баланса
  const { data: userResponse } = useQuery({
    queryKey: ['/api/users/1'], // Хардкод ID=1 для демонстрации
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
      
      {/* Airdrop Boost Пакеты */}
      <BoostPackagesCard />
    </div>
  );
};

export default Farming;