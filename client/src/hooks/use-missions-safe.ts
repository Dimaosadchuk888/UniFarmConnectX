import { useState, useEffect } from 'react';
import { correctApiRequest } from '@/lib/correctApiRequest';

/**
 * Безопасный хук для загрузки миссий напрямую через API без React Query
 * Реализует ТЗ: "Настроить вызов именно на `/missions` и обеспечить корректную загрузку карточек"
 */
export function useMissionsData() {
  const [missions, setMissions] = useState<any[]>([]);
  const [userMissions, setUserMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        setLoading(true);
        
        // Запрос активных миссий
        const missionsResponse = await correctApiRequest('/api/missions/active', 'GET');
        
        if (missionsResponse?.success && Array.isArray(missionsResponse.data)) {
          console.log('✅ API /api/missions/active успешно вернул данные:', missionsResponse.data.length);
          setMissions(missionsResponse.data);
          
          // Запрос статуса миссий для пользователя
          try {
            // Используем ID пользователя 1 для демо-режима (или другой ID из контекста пользователя)
            const userMissionsResponse = await correctApiRequest('/api/user_missions?user_id=1', 'GET');
            
            if (userMissionsResponse?.success && Array.isArray(userMissionsResponse.data)) {
              console.log('✅ API /api/user_missions успешно вернул данные:', userMissionsResponse.data.length);
              setUserMissions(userMissionsResponse.data);
            } else {
              console.warn('⚠️ API /api/user_missions вернул некорректные данные:', userMissionsResponse);
              setUserMissions([]);
            }
          } catch (userMissionsError) {
            console.error('❌ Ошибка при загрузке статуса миссий пользователя:', userMissionsError);
            setUserMissions([]);
          }
        } else {
          console.error('❌ API /api/missions/active вернул некорректные данные:', missionsResponse);
          setMissions([]);
          setError('Не удалось загрузить миссии. Пожалуйста, попробуйте позже.');
        }
      } catch (err) {
        console.error('❌ Критическая ошибка при загрузке миссий:', err);
        setMissions([]);
        setError('Произошла ошибка при загрузке миссий.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMissions();
  }, []);

  return { missions, userMissions, loading, error };
}