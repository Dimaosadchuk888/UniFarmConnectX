import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calendar, CheckCircle, Coins, MessageCircle, UserPlus } from 'lucide-react';
import { useNotification } from '@/contexts/notificationContext';
import { useUser } from '@/contexts/userContext';
import { correctApiRequest } from '@/lib/correctApiRequest';

// Типы данных для миссий
interface Mission {
  id: number;
  type: string;
  title: string;
  description: string;
  reward_uni: string;
  is_active: boolean;
}

/**
 * Прямая версия компонента списка миссий, которая не использует React Query
 * и напрямую обращается к API через correctApiRequest
 */
interface DirectMissionsListProps {
  forceRefresh?: boolean;
}

export const DirectMissionsList: React.FC<DirectMissionsListProps> = ({ forceRefresh = false }) => {
  console.log('DirectMissionsList: компонент отрисовывается (v1)', forceRefresh ? '- с принудительным обновлением' : '');

  const { userId } = useUser();
  const { showNotification } = useNotification();
  
  // Локальные состояния
  const [missions, setMissions] = useState<Mission[]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Функция получения данных о миссиях - исключает использование React Query
  useEffect(() => {
    let isMounted = true;
    
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Загружаем список активных миссий
        console.log('🚀 Запрос активных миссий - DirectMissionsList');
        let missionsUrl = '/api/missions/active';
        
        if (forceRefresh) {
          const timestamp = Date.now();
          missionsUrl += `?nocache=${timestamp}`;
        }
        
        const missionsResponse = await correctApiRequest(missionsUrl, 'GET');
        
        if (!isMounted) return;
        
        if (missionsResponse?.success && Array.isArray(missionsResponse.data)) {
          console.log(`✅ Получено ${missionsResponse.data.length} миссий`);
          setMissions(missionsResponse.data);
        } else {
          console.error('⚠️ Некорректные данные миссий:', missionsResponse);
          setMissions([]);
        }
        
        // 2. Загружаем выполненные миссии пользователя напрямую через correctApiRequest
        console.log('🚀 Запрос выполненных миссий пользователя ID:', userId);
        const userMissionsResponse = await correctApiRequest(`/api/user_missions?user_id=${userId || 1}`, 'GET');
        
        if (!isMounted) return;
        
        const completed: Record<number, boolean> = {};
        
        if (userMissionsResponse?.success && Array.isArray(userMissionsResponse.data)) {
          console.log(`✅ Получено ${userMissionsResponse.data.length} выполненных миссий`);
          
          // Безопасная итерация с проверкой типов
          for (let i = 0; i < userMissionsResponse.data.length; i++) {
            const mission = userMissionsResponse.data[i];
            if (mission && typeof mission === 'object' && 'mission_id' in mission) {
              completed[mission.mission_id] = true;
            }
          }
        } else {
          console.log('⚠️ Неожиданный формат данных выполненных миссий:', userMissionsResponse);
        }
        
        setCompletedMissionIds(completed);
      } catch (err) {
        if (!isMounted) return;
        console.error('⚠️ Ошибка при загрузке миссий:', err);
        setError('Не удалось загрузить миссии');
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
  
  // Функция проверки, выполнена ли миссия
  const isCompleted = (missionId: number): boolean => {
    return !!completedMissionIds[missionId];
  };
  
  // Функция выполнения миссии
  const completeMission = async (missionId: number): Promise<any> => {
    try {
      const result = await correctApiRequest('/api/missions/complete', 'POST', {
        user_id: userId || 1,
        mission_id: missionId
      });
      
      if (result?.success) {
        // Обновляем локальное состояние
        setCompletedMissionIds(prev => ({
          ...prev,
          [missionId]: true
        }));
        
        return { 
          success: true,
          reward: result.data?.reward || 0
        };
      } else {
        console.error('Ошибка выполнения миссии:', result?.message);
        return { 
          success: false, 
          error: result?.message || 'Ошибка выполнения миссии'
        };
      }
    } catch (err) {
      console.error('Исключение при выполнении миссии:', err);
      return { 
        success: false, 
        error: 'Произошла ошибка при выполнении миссии'
      };
    }
  };

  // Функция для получения иконки по типу миссии
  const getMissionIcon = (type: string) => {
    switch (type) {
      case 'social': return <MessageCircle className="h-5 w-5 text-blue-400" />;
      case 'invite': return <UserPlus className="h-5 w-5 text-indigo-400" />;
      case 'daily': return <Calendar className="h-5 w-5 text-amber-400" />;
      default: return <Coins className="h-5 w-5 text-purple-400" />;
    }
  };

  // Обработчик выполнения миссии
  const handleCompleteMission = async (missionId: number) => {
    try {
      // Находим миссию по ID для отображения названия в уведомлении
      let missionTitle = `Миссия #${missionId}`;

      // Защищённый поиск по массиву
      if (missions && Array.isArray(missions)) {
        for (let i = 0; i < missions.length; i++) {
          if (missions[i]?.id === missionId) {
            missionTitle = missions[i]?.title || missionTitle;
            break;
          }
        }
      }

      const result = await completeMission(missionId);

      if (result.success) {
        // Показываем красивое уведомление
        showNotification('success', {
          message: `${missionTitle} выполнена! Награда: ${result.reward} UNI`
        });
      } else {
        // Показываем уведомление об ошибке
        showNotification('error', {
          message: `Ошибка: ${result.error}`
        });
      }
    } catch (err) {
      console.error('Ошибка выполнения миссии:', err);

      // Показываем уведомление об ошибке
      showNotification('error', {
        message: 'Произошла ошибка при выполнении миссии'
      });
    }
  };

  // Рендерим компоненты загрузчика
  const renderLoaderCards = () => {
    const loaders = [];
    for (let i = 1; i <= 3; i++) {
      loaders.push(
        <Card key={i} className="w-full opacity-70 animate-pulse">
          <CardHeader className="h-16"></CardHeader>
          <CardContent className="h-20"></CardContent>
          <CardFooter className="h-12"></CardFooter>
        </Card>
      );
    }
    return loaders;
  };

  // Отображение загрузки
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="text-center text-muted-foreground text-sm mb-4">Загрузка заданий...</div>
        {renderLoaderCards()}
      </div>
    );
  }

  // Отображение ошибки
  if (error) {
    return (
      <div className="space-y-4 p-4">
        <Card className="w-full bg-slate-800/70 border border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-red-400" />
              Не удалось загрузить задания
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error}
            </p>
            <Button 
              className="mt-4 w-full"
              onClick={() => window.location.reload()}
            >
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Защитная проверка missions на массив
  const missionsArray = missions && Array.isArray(missions) ? missions : [];

  // Отображение пустого списка
  if (missionsArray.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <Card className="w-full bg-slate-800/70 border border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-amber-400" />
              Задания не найдены
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              На данный момент доступных заданий нет. Проверьте позже или обновите страницу.
            </p>
            <Button 
              className="mt-4 w-full"
              onClick={() => window.location.reload()}
            >
              Обновить
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Рендерим карточки миссий
  const renderMissionCards = () => {
    const cards = [];

    if (!Array.isArray(missionsArray)) {
      console.error('Unexpected format: missions is not an array', missions);
      return []; // Защитный возврат пустого массива
    }

    for (let i = 0; i < missionsArray.length; i++) {
      const mission = missionsArray[i];

      // Защитная проверка на null/undefined
      if (!mission) continue;

      const isCompletedMission = isCompleted(mission.id);

      cards.push(
        <Card key={mission.id || i} className="w-full">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center">
                  {getMissionIcon(mission.type)}
                </div>
                <CardTitle className="text-lg">{mission.title || 'Миссия без названия'}</CardTitle>
              </div>
              <Badge className={isCompletedMission ? 'bg-teal-500/70' : 'bg-blue-500'}>
                <span className="flex items-center">
                  {isCompletedMission ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Выполнено
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Доступно
                    </>
                  )}
                </span>
              </Badge>
            </div>
            <CardDescription className="mt-2">{mission.description || 'Без описания'}</CardDescription>
          </CardHeader>

          <CardFooter className="flex justify-between items-center border-t pt-4">
            <div className="flex items-center">
              <div className="text-purple-300/80 font-medium mr-2">Награда:</div>
              <div className="flex items-center px-2 py-1 bg-purple-900/30 rounded-md">
                <Coins className="h-4 w-4 text-purple-400 mr-1.5" />
                <span className="text-purple-300 font-semibold">
                  {mission.reward_uni ? parseFloat(mission.reward_uni) : 0} UNI
                </span>
              </div>
            </div>

            {isCompletedMission ? (
              <Badge variant="outline" className="border-purple-400/60 text-purple-300 px-3 py-1">
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Получено
              </Badge>
            ) : (
              <Button 
                size="sm"
                onClick={() => handleCompleteMission(mission.id)}
                className="bg-primary hover:bg-primary/90"
              >
                Выполнить
              </Button>
            )}
          </CardFooter>
        </Card>
      );
    }

    return cards;
  };

  // Основное отображение списка миссий
  return (
    <div className="space-y-4 p-4">
      {renderMissionCards()}
    </div>
  );
};

export default DirectMissionsList;