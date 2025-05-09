import { useState, useEffect } from 'react';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { useUser } from '@/contexts/userContext';

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

export function useMissionsSafe(forceRefresh: boolean = false) {
  const { userId } = useUser();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [userMissions, setUserMissions] = useState<UserMission[]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function fetchData() {
      try {
        // Загружаем активные миссии
        let missionsUrl = '/api/missions/active';
        if (forceRefresh) {
          missionsUrl += `?nocache=${Date.now()}`;
        }

        const missionsResponse = await correctApiRequest(missionsUrl, 'GET');

        if (!isMounted) return;

        if (missionsResponse?.success && Array.isArray(missionsResponse.data)) {
          setMissions(missionsResponse.data);
        } else {
          console.error('Некорректный формат данных миссий:', missionsResponse);
          setMissions([]);
        }

        // Загружаем выполненные миссии
        const userMissionsResponse = await correctApiRequest(`/api/user_missions?user_id=${userId || 1}`, 'GET');

        if (!isMounted) return;

        if (userMissionsResponse?.success && Array.isArray(userMissionsResponse.data)) {
          setUserMissions(userMissionsResponse.data);

          const completed: Record<number, boolean> = {};
          userMissionsResponse.data.forEach(mission => {
            if (mission && typeof mission === 'object' && mission.mission_id) {
              completed[mission.mission_id] = true;
            }
          });

          setCompletedMissionIds(completed);
        } else {
          console.error('Некорректный формат данных выполненных миссий:', userMissionsResponse);
          setUserMissions([]);
          setCompletedMissionIds({});
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Ошибка загрузки миссий:', err);
        setError('Произошла ошибка при загрузке миссий');
        setMissions([]);
        setUserMissions([]);
        setCompletedMissionIds({});
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [userId, forceRefresh]);

  const isCompleted = (missionId: number): boolean => {
    return !!completedMissionIds[missionId];
  };

  const completeMission = async (missionId: number): Promise<any> => {
    console.log(`[useMissionsSafe v4] Выполнение миссии ${missionId}`);
    
    try {
      const result = await correctApiRequest('/api/missions/complete', 'POST', {
        user_id: userId || 1,
        mission_id: missionId
      });
      
      if (result && result.success) {
        console.log(`[useMissionsSafe v4] Миссия ${missionId} успешно выполнена`);
        
        // Обновляем локальное состояние
        const newCompletedIds = { ...completedMissionIds };
        newCompletedIds[missionId] = true;
        setCompletedMissionIds(newCompletedIds);
        
        // Если получили данные о выполненной миссии, добавляем в список
        if (result.data && result.data.userMission) {
          setUserMissions(prev => [...(prev || []), result.data.userMission]);
        }
        
        return { 
          success: true, 
          reward: result.data?.reward || 0
        };
      } else {
        console.error(`[useMissionsSafe v4] Ошибка выполнения миссии ${missionId}:`, result?.message);
        return { 
          success: false, 
          error: result?.message || 'Не удалось выполнить миссию'
        };
      }
    } catch (err) {
      console.error(`[useMissionsSafe v4] Исключение при выполнении миссии ${missionId}:`, err);
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
    loading,
    error,
    isCompleted,
    completeMission
  };
}