import React, { useState, useEffect } from 'react';
import UniFarmReferralLink from '@/components/friends/UniFarmReferralLink';
import ReferralLevelsTable from '@/components/friends/ReferralLevelsTable';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';
import type { User } from '@/services/userService';

/**
 * ТЕСТОВЫЙ КОМПОНЕНТ
 * Этот файл создан специально для проверки импорта и рендеринга
 */
const FriendsTest: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(true);
  
  // Эта отметка должна появляться в консоли
  console.log('[FRIENDSTEST.TSX]: Этот файл был только что создан!');
  
  // Получаем данные пользователя с типизацией
  const { data: userData, isLoading, isError } = useQuery<any>({ 
    queryKey: ['/api/me'],
    staleTime: 60000 
  });

  // Сообщаем в консоль, какая версия рендерится
  useEffect(() => {
    console.log('[FriendsTest.tsx] Рендеринг тестового компонента: FriendsTest.tsx');
    console.log('[FriendsTest.tsx] Данные пользователя:', userData);
    return () => {
      console.log('[FriendsTest.tsx] Компонент размонтирован');
    };
  }, [userData]);

  return (
    <div className="w-full">
      <div className="bg-purple-700 p-4 rounded-lg mb-6 text-center">
        <h1 className="text-2xl font-bold text-white">
          ТЕСТОВЫЙ КОМПОНЕНТ — FriendsTest.tsx
        </h1>
        <p className="text-yellow-300 mt-2">
          Этот файл был создан 27.04.2025 в 20:00
        </p>
      </div>
      
      <div className="flex flex-col items-center mb-6">
        <div className="w-full p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg mb-4">
          <h2 className="text-xl text-white font-bold mb-2">Диагностика</h2>
          <div className="bg-white/20 p-3 rounded">
            <p className="text-white mb-1"><strong>Реф-код:</strong> {(userData as any)?.ref_code || 'не загружен'}</p>
            <p className="text-white mb-1"><strong>ID:</strong> {(userData as any)?.id || 'не загружен'}</p>
            <p className="text-white"><strong>Username:</strong> {(userData as any)?.username || 'не загружен'}</p>
          </div>
        </div>

        <button 
          onClick={() => alert('Этот компонент рендерится из файла FriendsTest.tsx!')} 
          className="animate-pulse bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-full shadow-lg mb-4"
        >
          НАЖМИ МЕНЯ — FriendsTest.tsx
        </button>
      </div>
      
      <div className="bg-black/30 p-4 rounded-lg mb-5">
        <h3 className="text-yellow-400 font-bold mb-3">Компонент UniFarmReferralLink:</h3>
        <UniFarmReferralLink />
      </div>
      
      <div>
        <h3 className="text-yellow-400 font-bold mb-3">Таблица уровней:</h3>
        <ReferralLevelsTable />
      </div>
    </div>
  );
};

export default FriendsTest;