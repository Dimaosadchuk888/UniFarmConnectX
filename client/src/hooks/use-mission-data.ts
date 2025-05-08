import { useQuery } from '@tanstack/react-query';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/userContext';

// Определение типов для данных миссий
export enum MissionStatus {
  AVAILABLE = 'available',
  PROCESSING = 'processing',
  COMPLETED = 'completed'
}

// Тип миссии из БД
export interface DbMission {
  id: number;
  type: string;
  title: string;
  description: string;
  reward_uni: string; // В БД это numeric как строка
  is_active: boolean;
}

// Тип для выполненной миссии пользователя
export interface UserMission {
  id: number;
  user_id: number;
  mission_id: number;
  completed_at: string;
}

// Тип миссии для UI
export interface Mission {
  id: number;
  type: string;
  title: string;
  description: string;
  rewardUni: number;
  status: MissionStatus;
  progress?: number; // прогресс выполнения от 0 до 100
  visitStartTime?: number; // время начала выполнения социальной миссии
  verificationAvailable?: boolean; // доступна ли кнопка проверки
}

/**
 * Хук для получения данных о миссиях
 */
export function useMissionData() {
  const { userId } = useUser();
  const [missions, setMissions] = useState<Mission[]>([]);
  
  // Загружаем активные миссии
  const { 
    data: dbMissions, 
    isLoading: missionsLoading, 
    error: missionsError 
  } = useQuery<DbMission[]>({
    queryKey: ['/api/missions/active'],
    queryFn: async () => {
      console.log('🚀 Запрос активных миссий');
      
      try {
        const data = await correctApiRequest('/api/missions/active', 'GET');
        console.log(`📥 Ответ получен через correctApiRequest:`, data);
        
        if (data && data.success && Array.isArray(data.data)) {
          console.log(`✅ Получены активные миссии (${data.data.length} шт.)`);
          return data.data;
        } else {
          console.log('⚠️ Неожиданный формат данных:', data);
          return [];
        }
      } catch (error) {
        console.error('⚠️ Ошибка запроса:', error);
        return [];
      }
    }
  });
  
  // Загружаем выполненные миссии пользователя
  const { 
    data: userCompletedMissions, 
    isLoading: userMissionsLoading, 
    error: userMissionsError 
  } = useQuery<UserMission[]>({
    queryKey: ['/api/user_missions', userId],
    queryFn: async () => {
      console.log('🚀 Запрос выполненных миссий пользователя ID:', userId);
      
      try {
        const data = await correctApiRequest(`/api/user_missions?user_id=${userId || 1}`, 'GET');
        console.log(`📥 Ответ получен через correctApiRequest:`, data);
        
        if (data && data.success && Array.isArray(data.data)) {
          console.log(`✅ Получены выполненные миссии (${data.data.length} шт.)`);
          return data.data;
        } else {
          console.log('⚠️ Неожиданный формат данных:', data);
          return [];
        }
      } catch (error) {
        console.error('⚠️ Ошибка запроса:', error);
        return [];
      }
    }
  });
  
  // Объединяем данные о миссиях
  useEffect(() => {
    if (!dbMissions) {
      console.log('dbMissions не загружены');
      return;
    }
    
    // Безопасно создаем карту выполненных миссий
    const completedMissionsMap = new Map<number, UserMission>();
    
    if (userCompletedMissions && Array.isArray(userCompletedMissions)) {
      console.log('Обработка массива выполненных миссий:', userCompletedMissions.length);
      
      // Используем forEach вместо map для безопасной итерации
      userCompletedMissions.forEach(mission => {
        if (mission && typeof mission === 'object' && 'mission_id' in mission) {
          completedMissionsMap.set(mission.mission_id, mission);
        }
      });
    } else {
      console.log('userCompletedMissions отсутствует или не является массивом');
    }
    
    // Преобразуем данные для UI
    const mappedMissions: Mission[] = dbMissions.map(dbMission => {
      const isCompleted = completedMissionsMap.has(dbMission.id);
      
      return {
        id: dbMission.id,
        type: dbMission.type,
        title: dbMission.title,
        description: dbMission.description,
        rewardUni: parseFloat(dbMission.reward_uni),
        status: isCompleted ? MissionStatus.COMPLETED : MissionStatus.AVAILABLE
      };
    });
    
    console.log('Загружено миссий:', mappedMissions.length);
    setMissions(mappedMissions);
  }, [dbMissions, userCompletedMissions]);
  
  return {
    missions,
    setMissions,
    isLoading: missionsLoading || userMissionsLoading,
    hasError: !!missionsError || !!userMissionsError
  };
}