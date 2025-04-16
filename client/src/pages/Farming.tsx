import React from 'react';
import { useQuery } from '@tanstack/react-query';
import FarmingStatusCard from '../components/farming/FarmingStatusCard';
import UniFarmingCard from '../components/farming/UniFarmingCard';

const Farming: React.FC = () => {
  // Получаем информацию о пользователе для отображения баланса
  const { data: userResponse } = useQuery({
    queryKey: ['/api/users/1'], // Хардкод ID=1 для демонстрации
  });
  
  // Извлекаем userData из ответа API
  const userData = userResponse?.data;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Фарминг</h1>
      
      {/* Статус фарминга */}
      <FarmingStatusCard />
      
      {/* Основной UNI пакет */}
      <UniFarmingCard userData={userData} />
      
      {/* Здесь могут быть другие компоненты страницы фарминга */}
    </div>
  );
};

export default Farming;