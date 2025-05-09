import { useState, useEffect } from 'react';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { useUser } from '@/contexts/userContext';

// Типы миссий
export interface Mission {
  id: number;
  type: string;
  title: string;
  description: string;
  reward_uni: string;
  is_active: boolean;
}

export interface UserMission {
  id: number;
  user_id: number;
  mission_id: number;
  completed_at: string;
}

/**
 * Безопасный хук для работы с миссиями
 * Предотвращает ошибки с Map и map() через использование обычных объектов
 * @param forceRefresh - флаг принудительного обновления данных для решения проблем с кешированием
 */
export function useMissionsSafe(forceRefresh: boolean = false) {
  const { userId } = useUser();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [userMissions, setUserMissions] = useState<UserMission[]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных при монтировании
  useEffect(() => {
    console.log('useMissionsSafe: начинаем загрузку данных');
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadData() {
      try {
        // 1. Загружаем доступные миссии
        console.log('useMissionsSafe: загрузка миссий');
        const missionsResponse = await correctApiRequest('/api/missions/active', 'GET');
        
        // Детальный лог структуры ответа для отладки
        console.log('DEBUG - missionsResponse:', JSON.stringify(missionsResponse));
        console.log('DEBUG - typeof missionsResponse.data:', typeof missionsResponse.data);
        console.log('DEBUG - isArray(missionsResponse.data):', Array.isArray(missionsResponse.data));
        if (missionsResponse && missionsResponse.data) {
          console.log('DEBUG - missionsResponse.data[0]:', JSON.stringify(missionsResponse.data[0]));
        }
        
        if (!isMounted) return;
        
        if (missionsResponse && missionsResponse.success && Array.isArray(missionsResponse.data)) {
          console.log(`useMissionsSafe: получено ${missionsResponse.data.length} миссий`);
          setMissions(missionsResponse.data);
        } else {
          console.error('useMissionsSafe: ошибка загрузки миссий', missionsResponse);
          setError('Не удалось загрузить миссии');
          setMissions([]);
        }

        // 2. Загружаем миссии пользователя
        console.log('useMissionsSafe: загрузка выполненных миссий');
        const userMissionsResponse = await correctApiRequest(`/api/user_missions?user_id=${userId || 1}`, 'GET');
        
        // Детальный лог структуры ответа для отладки
        console.log('DEBUG - userMissionsResponse:', JSON.stringify(userMissionsResponse));
        console.log('DEBUG - typeof userMissionsResponse.data:', typeof userMissionsResponse.data);
        console.log('DEBUG - isArray(userMissionsResponse.data):', Array.isArray(userMissionsResponse.data));
        if (userMissionsResponse && userMissionsResponse.data && userMissionsResponse.data.length > 0) {
          console.log('DEBUG - userMissionsResponse.data[0]:', JSON.stringify(userMissionsResponse.data[0]));
          // Попытка идентифицировать возможную проблему с map
          console.log('DEBUG - mission_id присутствует:', 'mission_id' in userMissionsResponse.data[0]);
        }
        
        if (!isMounted) return;
        
        if (userMissionsResponse && userMissionsResponse.success && Array.isArray(userMissionsResponse.data)) {
          console.log(`useMissionsSafe: получено ${userMissionsResponse.data.length} выполненных миссий`);
          
          // Сохраняем массив
          setUserMissions(userMissionsResponse.data);
          
          // Создаем объект для быстрой проверки ID
          const completedMap: Record<number, boolean> = {};
          
          // Безопасная итерация по массиву
          for (let i = 0; i < userMissionsResponse.data.length; i++) {
            const mission = userMissionsResponse.data[i];
            if (mission && typeof mission === 'object' && 'mission_id' in mission) {
              completedMap[mission.mission_id] = true;
            }
          }
          
          setCompletedMissionIds(completedMap);
        } else {
          console.error('useMissionsSafe: ошибка загрузки выполненных миссий', userMissionsResponse);
          setUserMissions([]);
          setCompletedMissionIds({});
        }
      } catch (err) {
        if (isMounted) {
          console.error('useMissionsSafe: ошибка загрузки данных', err);
          setError('Произошла ошибка при загрузке заданий');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [userId]);
  
  // Выполнение миссии
  const completeMission = async (missionId: number) => {
    try {
      const result = await correctApiRequest('/api/missions/complete', 'POST', {
        user_id: userId || 1,
        mission_id: missionId
      });
      
      if (result && result.success) {
        // Обновляем локальное состояние
        setCompletedMissionIds(prev => ({
          ...prev,
          [missionId]: true
        }));
        
        // Добавляем новую запись в список выполненных миссий
        if (result.data && result.data.userMission) {
          setUserMissions(prev => [...prev, result.data.userMission]);
        }
        
        return { 
          success: true, 
          reward: result.data?.reward || 0
        };
      } else {
        return { 
          success: false, 
          error: result?.message || 'Не удалось выполнить миссию'
        };
      }
    } catch (err) {
      console.error('useMissionsSafe: ошибка выполнения миссии', err);
      return { 
        success: false, 
        error: 'Произошла ошибка при выполнении миссии'
      };
    }
  };
  
  return {
    missions,
    userMissions,
    completedMissionIds,
    isCompleted: (missionId: number) => !!completedMissionIds[missionId],
    loading,
    error,
    completeMission
  };
}