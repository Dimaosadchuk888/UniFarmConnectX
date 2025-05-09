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
 * Полностью переписанный безопасный хук для работы с миссиями
 * Предотвращает ошибки с Map и map() через использование обычных JS-объектов и простых массивов
 * @param forceRefresh - флаг принудительного обновления данных для решения проблем с кешированием
 */
export function useMissionsSafe(forceRefresh: boolean = false) {
  const { userId } = useUser();
  
  // Используем только массивы и обычные объекты
  const [missions, setMissions] = useState<Array<Mission>>([]);
  const [userMissions, setUserMissions] = useState<Array<UserMission>>([]);
  
  // Для быстрого поиска используем обычный JS объект
  const [completedMissionIds, setCompletedMissionIds] = useState<Record<number, boolean>>({});
  
  // Состояние загрузки
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Добавляем ключ для принудительного обновления компонента
  useEffect(() => {
    console.log('[useMissionsSafe v2] Начинаем загрузку данных', forceRefresh ? '(принудительное обновление)' : '');
    let isMounted = true;
    
    // Устанавливаем начальные значения
    setLoading(true);
    setError(null);
    
    // Вспомогательная функция для загрузки данных
    async function fetchData() {
      try {
        // Шаг 1: Загружаем активные миссии
        console.log('[useMissionsSafe v2] Загрузка активных миссий');
        let missionsUrl = '/api/missions/active';
        
        // Добавляем случайный параметр для обхода кеширования
        if (forceRefresh) {
          const noCache = Date.now();
          missionsUrl += `?nocache=${noCache}`;
        }
        
        // Выполняем запрос
        const missionsResponse = await correctApiRequest(missionsUrl, 'GET');
        
        // Проверяем монтирование
        if (!isMounted) return;
        
        // Проверяем и обрабатываем ответ
        if (missionsResponse && missionsResponse.success && Array.isArray(missionsResponse.data)) {
          console.log(`[useMissionsSafe v2] Успешно получено ${missionsResponse.data.length} миссий`);
          
          // Безопасное копирование массива
          const missionsArray: Array<Mission> = [];
          for (let i = 0; i < missionsResponse.data.length; i++) {
            missionsArray.push(missionsResponse.data[i]);
          }
          
          setMissions(missionsArray);
        } else {
          console.error('[useMissionsSafe v2] Ошибка формата данных миссий', missionsResponse);
          setError('Не удалось загрузить список миссий');
          setMissions([]);
        }
        
        // Шаг 2: Загружаем выполненные миссии пользователя
        console.log('[useMissionsSafe v2] Загрузка выполненных миссий');
        let userMissionsUrl = `/api/user_missions?user_id=${userId || 1}`;
        
        // Добавляем параметр для обхода кеширования
        if (forceRefresh) {
          const noCache = Date.now();
          userMissionsUrl += `&nocache=${noCache}`;
        }
        
        // Выполняем запрос
        const userMissionsResponse = await correctApiRequest(userMissionsUrl, 'GET');
        
        // Проверяем монтирование
        if (!isMounted) return;
        
        // Проверяем и обрабатываем ответ
        if (userMissionsResponse && userMissionsResponse.success && Array.isArray(userMissionsResponse.data)) {
          console.log(`[useMissionsSafe v2] Успешно получено ${userMissionsResponse.data.length} выполненных миссий`);
          
          // Безопасное копирование массива
          const userMissionsArray: Array<UserMission> = [];
          for (let i = 0; i < userMissionsResponse.data.length; i++) {
            userMissionsArray.push(userMissionsResponse.data[i]);
          }
          
          setUserMissions(userMissionsArray);
          
          // Создаем объект для быстрого поиска выполненных миссий
          const completed: Record<number, boolean> = {};
          
          // Простая итерация по массиву
          for (let i = 0; i < userMissionsArray.length; i++) {
            const mission = userMissionsArray[i];
            if (mission && typeof mission === 'object' && 'mission_id' in mission) {
              completed[mission.mission_id] = true;
            }
          }
          
          setCompletedMissionIds(completed);
        } else {
          console.error('[useMissionsSafe v2] Ошибка формата данных выполненных миссий', userMissionsResponse);
          setUserMissions([]);
          setCompletedMissionIds({});
        }
      } catch (err) {
        // Обрабатываем ошибки только если компонент все еще смонтирован
        if (isMounted) {
          console.error('[useMissionsSafe v2] Ошибка при загрузке данных:', err);
          setError('Произошла ошибка при загрузке заданий. Пожалуйста, попробуйте позже.');
        }
      } finally {
        // Завершаем загрузку только если компонент все еще смонтирован
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    // Запускаем загрузку данных
    fetchData();
    
    // Функция очистки при размонтировании
    return () => {
      console.log('[useMissionsSafe v2] Компонент размонтирован');
      isMounted = false;
    };
  }, [userId, forceRefresh]);
  
  // Функция для выполнения миссии
  const completeMission = async (missionId: number): Promise<MissionResult> => {
    console.log(`[useMissionsSafe v2] Выполнение миссии ${missionId}`);
    
    try {
      // Отправляем запрос на выполнение миссии
      const result = await correctApiRequest('/api/missions/complete', 'POST', {
        user_id: userId || 1,
        mission_id: missionId
      });
      
      // Проверяем результат
      if (result && result.success) {
        console.log(`[useMissionsSafe v2] Миссия ${missionId} успешно выполнена`);
        
        // Обновляем локальное состояние: добавляем ID в список выполненных
        const newCompletedMissionIds = { ...completedMissionIds };
        newCompletedMissionIds[missionId] = true;
        setCompletedMissionIds(newCompletedMissionIds);
        
        // Добавляем новую запись в список выполненных миссий
        if (result.data && result.data.userMission) {
          const newUserMissions = [...userMissions];
          newUserMissions.push(result.data.userMission);
          setUserMissions(newUserMissions);
        }
        
        // Возвращаем успешный результат
        return { 
          success: true, 
          reward: result.data?.reward || 0
        };
      } else {
        // Возвращаем информацию об ошибке
        console.error(`[useMissionsSafe v2] Ошибка выполнения миссии ${missionId}:`, result?.message);
        return { 
          success: false, 
          error: result?.message || 'Не удалось выполнить миссию'
        };
      }
    } catch (err) {
      // Обрабатываем ошибки запроса
      console.error(`[useMissionsSafe v2] Исключение при выполнении миссии ${missionId}:`, err);
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