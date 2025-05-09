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

// Доп. тип для безопасного управления
interface MissionResult {
  success: boolean;
  reward?: number;
  error?: string;
}

/**
 * Сильно упрощенный безопасный хук для работы с миссиями
 * Предотвращает ошибки с Map и map() через использование обычных JS-объектов
 * @param forceRefresh - флаг принудительного обновления данных для решения проблем с кешированием
 */
export function useMissionsSafe(forceRefresh: boolean = false) {
  const { userId } = useUser();
  
  // Используем только простые массивы
  const [missions, setMissions] = useState<Mission[]>([]);
  const [userMissions, setUserMissions] = useState<UserMission[]>([]);
  
  // Для быстрого поиска используем обычный JS объект
  const [completedMissionIds, setCompletedMissionIds] = useState<Record<number, boolean>>({});
  
  // Состояние загрузки
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Принудительно добавляем прототипное свойство map к Array, если его нет
  // Это нужно для предотвращения ошибки "map is not a function" 
  // при работе с потенциально модифицированными прототипами
  useEffect(() => {
    // Безопасно расширяем прототип Array, если его метод map отсутствует
    if (!Array.prototype.map) {
      console.warn('[SafetyFix] Array.prototype.map отсутствует, добавляем полифилл');
      
      // Добавляем стандартную полифилл-реализацию map
      // @ts-ignore - игнорируем ошибку TypeScript при модификации прототипа
      Array.prototype.map = function(callback, thisArg) {
        if (this == null) {
          throw new TypeError('this is null or not defined');
        }
        
        const O = Object(this);
        const len = O.length >>> 0;
        const A = new Array(len);
        
        for (let k = 0; k < len; k++) {
          if (k in O) {
            A[k] = callback.call(thisArg, O[k], k, O);
          }
        }
        
        return A;
      };
    }
  }, []);
  
  useEffect(() => {
    console.log('[useMissionsSafe v4] Начинаем загрузку данных', forceRefresh ? '(принудительное обновление)' : '');
    let isMounted = true;
    
    // Устанавливаем начальные значения
    setLoading(true);
    setError(null);
    
    async function fetchData() {
      try {
        // Шаг 1: Загружаем активные миссии
        let missionsUrl = '/api/missions/active';
        if (forceRefresh) {
          const noCache = Date.now();
          missionsUrl += `?nocache=${noCache}`;
        }
        
        const missionsResponse = await correctApiRequest(missionsUrl, 'GET');
        
        if (!isMounted) return;
        
        if (missionsResponse?.success && Array.isArray(missionsResponse.data)) {
          console.log(`[useMissionsSafe v4] Успешно получено ${missionsResponse.data.length} миссий`);
          setMissions(missionsResponse.data || []);
        } else {
          console.error('[useMissionsSafe v4] Неверный формат данных для миссий');
          setMissions([]); // Защита от undefined
        }
        
        // Шаг 2: Загружаем выполненные миссии
        let userMissionsUrl = `/api/user_missions?user_id=${userId || 1}`;
        if (forceRefresh) {
          const noCache = Date.now();
          userMissionsUrl += `&nocache=${noCache}`;
        }
        
        const userMissionsResponse = await correctApiRequest(userMissionsUrl, 'GET');
        
        if (!isMounted) return;
        
        if (userMissionsResponse?.success) {
          // Убедимся, что userMissionsResponse.data - это массив
          const userMissionsData = Array.isArray(userMissionsResponse.data) 
            ? userMissionsResponse.data 
            : [];
            
          console.log(`[useMissionsSafe v4] Успешно получено ${userMissionsData.length} выполненных миссий`);
          
          setUserMissions(userMissionsData);
          
          // Создаем объект для быстрого поиска выполненных миссий
          const completed: Record<number, boolean> = {};
          
          // Безопасная итерация по массиву
          for (let i = 0; i < userMissionsData.length; i++) {
            const mission = userMissionsData[i];
            if (mission && typeof mission === 'object' && 'mission_id' in mission) {
              completed[mission.mission_id] = true;
            }
          }
          
          setCompletedMissionIds(completed);
        } else {
          console.error('[useMissionsSafe v4] Неверный формат данных для выполненных миссий');
          setUserMissions([]); // Защита от undefined
          setCompletedMissionIds({});
        }
      } catch (err) {
        if (!isMounted) return;
        
        console.error('[useMissionsSafe v4] Ошибка загрузки данных:', err);
        setError('Произошла ошибка при загрузке заданий. Пожалуйста, попробуйте позже.');
        setMissions([]); // Защита от undefined даже в случае ошибки
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
  
  // Функция для выполнения миссии
  const completeMission = async (missionId: number): Promise<MissionResult> => {
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
  
  // Функция проверки выполнения миссии по ID
  const isCompleted = (missionId: number): boolean => {
    return !!completedMissionIds[missionId];
  };
  
  // Возвращаем данные и функции
  return {
    // Данные
    missions,
    userMissions,
    completedMissionIds,
    
    // Состояние
    loading,
    error,
    
    // Функции
    isCompleted,
    completeMission
  };
}