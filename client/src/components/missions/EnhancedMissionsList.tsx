import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calendar, CheckCircle, Coins, MessageCircle, UserPlus } from 'lucide-react';
import { useUser } from '@/contexts/userContext';
import { useNotification } from '@/contexts/NotificationContext';
import { correctApiRequest } from '@/lib/correctApiRequest';

// Тип миссии из API
interface Mission {
  id: number;
  type: string;
  title: string;
  description: string;
  reward_uni: string;
  is_active: boolean;
}

// Тип для выполненной миссии
interface UserMission {
  id: number;
  user_id: number;
  mission_id: number;
  completed_at: string;
}

// Компонент списка миссий с оптимизированной загрузкой данных
const EnhancedMissionsList: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setError] = useState<string | null>(null);
  const [completedMissionIds, setCompletedMissionIds] = useState<number[]>([]);
  const { userId } = useUser();
  const { success, error: showError } = useNotification();
  
  // Функция загрузки данных миссий
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[EnhancedMissionsList] Загрузка данных миссий...');
      
      // Загружаем активные миссии
      const missionsResponse = await correctApiRequest('/api/v2/missions/active', 'GET');
      
      // Проверяем ответ
      if (!missionsResponse || !missionsResponse.success) {
        throw new Error('Не удалось загрузить список миссий');
      }
      
      const missionsData = missionsResponse.data || [];
      setMissions(missionsData);
      console.log('[EnhancedMissionsList] Загружено миссий:', missionsData.length);
      
      // Загружаем выполненные пользователем миссии (только если есть userId)
      if (userId) {
        try {
          console.log('[EnhancedMissionsList] Загружаем выполненные миссии для пользователя:', userId);
          const completedResponse = await correctApiRequest(`/api/v2/missions/user/${userId}`, 'GET');
          
          if (completedResponse && completedResponse.success) {
            const completedData = completedResponse.data || [];
            const completedIds = completedData.map((mission: UserMission) => mission.mission_id);
            setCompletedMissionIds(completedIds);
            console.log('[EnhancedMissionsList] Загружено выполненных миссий:', completedIds.length);
          } else {
            // Если не удалось загрузить выполненные миссии, продолжаем с пустым списком
            console.log('[EnhancedMissionsList] Не удалось загрузить выполненные миссии, продолжаем без них');
            setCompletedMissionIds([]);
          }
        } catch (userMissionsError) {
          console.error('[EnhancedMissionsList] Ошибка при загрузке выполненных миссий:', userMissionsError);
          // Продолжаем работу с пустым списком выполненных миссий
          setCompletedMissionIds([]);
        }
      }
    } catch (fetchError: any) {
      console.error('[EnhancedMissionsList] Ошибка загрузки данных:', fetchError);
      setError(fetchError.message || 'Не удалось загрузить миссии');
    } finally {
      setLoading(false);
    }
  }, [userId]);
    
  // Загрузка миссий при монтировании компонента
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Функция для выполнения миссии
  const completeMission = async (missionId: number) => {
    try {
      // Находим миссию по ID для отображения названия в уведомлении
      const mission = missions.find(m => m.id === missionId);
      const missionTitle = mission?.title || `Миссия #${missionId}`;
      
      // Отправляем запрос на сервер
      const result = await correctApiRequest('/api/v2/missions/complete', 'POST', {
        user_id: userId || 1,
        mission_id: missionId
      });
      
      if (result && result.success) {
        // Добавляем миссию в список выполненных
        setCompletedMissionIds(prev => [...prev, missionId]);
        
        // Извлекаем награду из ответа API
        const reward = result.data && result.data.reward 
          ? result.data.reward 
          : (result.reward || 0);
        
        // Показываем улучшенное уведомление об успехе с эмодзи
        success(`✅ ${missionTitle} выполнена! Получено ${reward} UNI`, {
          duration: 4000,
          autoDismiss: true
        });
      } else {
        // Показываем ошибку с подробностями
        showError(`❌ Не удалось выполнить миссию "${missionTitle}": ${result?.message || 'Неизвестная ошибка'}`, {
          duration: 5000,
          autoDismiss: true
        });
      }
    } catch (error: any) {
      // Показываем ошибку сети или сервера
      showError(`🔥 Ошибка при выполнении миссии: ${error.message || 'Проблема с подключением'}`, {
        duration: 5000,
        autoDismiss: true
      });
      console.error('[EnhancedMissionsList] Ошибка выполнения миссии:', error);
    }
  };
  
  // Функция для получения иконки миссии в зависимости от типа
  const getMissionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'social':
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'referral':
        return <UserPlus className="h-5 w-5 text-green-500" />;
      case 'daily':
        return <Calendar className="h-5 w-5 text-orange-500" />;
      case 'achievement':
        return <CheckCircle className="h-5 w-5 text-purple-500" />;
      default:
        return <Coins className="h-5 w-5 text-yellow-500" />;
    }
  };
  
  // Отображение состояния загрузки
  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">🎯 Доступные задания</h2>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  // Отображение ошибки
  if (errorState) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">🎯 Доступные задания</h2>
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Ошибка загрузки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Произошла ошибка: {errorState}
            </p>
            <Button 
              className="mt-4 w-full"
              onClick={() => {
                setError(null);
                fetchData();
              }}
            >
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Отображение пустого списка
  if (!missions || missions.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">🎯 Доступные задания</h2>
        <Card>
          <CardHeader>
            <CardTitle>Заданий пока нет</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              На данный момент доступных заданий нет. Проверьте позже или обновите страницу.
            </p>
            <Button 
              className="mt-4 w-full"
              onClick={() => {
                setError(null);
                fetchData();
              }}
            >
              Обновить
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Отображение списка миссий
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">🎯 Доступные задания</h2>
      <div className="grid gap-4">
        {missions.map((mission) => {
          const isCompleted = completedMissionIds.includes(mission.id);
          
          return (
            <Card key={mission.id} className={`transition-all duration-200 ${
              isCompleted 
                ? 'bg-green-50 border-green-200 opacity-75' 
                : 'hover:shadow-md border-gray-200'
            }`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    {getMissionIcon(mission.type)}
                    <span className={isCompleted ? 'line-through text-gray-500' : ''}>
                      {mission.title}
                    </span>
                  </div>
                  <Badge variant={isCompleted ? 'secondary' : 'default'}>
                    {isCompleted ? '✅ Выполнено' : `+${mission.reward_uni} UNI`}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-sm">
                  {mission.description}
                </CardDescription>
              </CardHeader>
              
              {!isCompleted && (
                <CardFooter className="pt-0">
                  <Button 
                    onClick={() => completeMission(mission.id)}
                    className="w-full"
                    size="sm"
                  >
                    <Coins className="h-4 w-4 mr-2" />
                    Выполнить задание
                  </Button>
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>
      
      {missions.length > 0 && (
        <div className="text-center text-sm text-muted-foreground pt-4">
          Выполнено заданий: {completedMissionIds.length} из {missions.length}
        </div>
      )}
    </div>
  );
};

export default EnhancedMissionsList;