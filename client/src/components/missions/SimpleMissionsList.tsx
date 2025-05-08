import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calendar, CheckCircle, Coins, MessageCircle, UserPlus } from 'lucide-react';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { useUser } from '@/contexts/userContext';
import { useNotification } from '@/contexts/notificationContext';

// Тип миссии из API
interface Mission {
  id: number;
  type: string;
  title: string;
  description: string;
  reward_uni: string;
  is_active: boolean;
}

// Экспортируем простой компонент списка миссий
export const SimpleMissionsList: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [completedMissions, setCompletedMissions] = useState<number[]>([]);
  const { userId } = useUser();

  // Тип для выполненной миссии
  interface UserMission {
    id: number;
    user_id: number;
    mission_id: number;
    completed_at: string;
  }

  // Загрузка миссий
  useEffect(() => {
    async function loadMissions() {
      try {
        // Загружаем активные миссии
        const missionsResponse = await correctApiRequest('/api/missions/active', 'GET');
        
        if (missionsResponse && missionsResponse.success && Array.isArray(missionsResponse.data)) {
          console.log('Загружены миссии:', missionsResponse.data.length);
          setMissions(missionsResponse.data);
        } else {
          console.error('Ошибка формата данных миссий:', missionsResponse);
          setMissions([]);
        }
        
        // Загружаем выполненные миссии
        const userMissionsResponse = await correctApiRequest(`/api/user_missions?user_id=${userId || 1}`, 'GET');
        
        if (userMissionsResponse && userMissionsResponse.success && Array.isArray(userMissionsResponse.data)) {
          const completedMissionIds = userMissionsResponse.data
            .filter((m: any) => m && typeof m === 'object' && 'mission_id' in m)
            .map((m: UserMission) => m.mission_id);
          
          setCompletedMissions(completedMissionIds);
        }
      } catch (err) {
        console.error('Ошибка загрузки миссий:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    
    loadMissions();
  }, [userId]);
  
  // Функция для получения иконки по типу миссии
  const getMissionIcon = (type: string) => {
    switch (type) {
      case 'social': return <MessageCircle className="h-5 w-5 text-blue-400" />;
      case 'invite': return <UserPlus className="h-5 w-5 text-indigo-400" />;
      case 'daily': return <Calendar className="h-5 w-5 text-amber-400" />;
      default: return <Coins className="h-5 w-5 text-purple-400" />;
    }
  };
  
  // Получаем доступ к системе уведомлений
  const { showNotification } = useNotification();
  
  // Функция для выполнения миссии
  const completeMission = async (missionId: number) => {
    try {
      // Находим миссию по ID для отображения названия в уведомлении
      const mission = missions.find(m => m.id === missionId);
      const missionTitle = mission?.title || `Миссия #${missionId}`;
      
      const result = await correctApiRequest('/api/missions/complete', 'POST', {
        user_id: userId || 1,
        mission_id: missionId
      });
      
      if (result && result.success) {
        // Добавляем миссию в список выполненных
        setCompletedMissions([...completedMissions, missionId]);
        
        // Правильно извлекаем награду из ответа API
        const reward = result.data && result.data.reward 
          ? result.data.reward 
          : (result.reward || 0);
        
        // Показываем красивое уведомление вместо alert
        showNotification('success', {
          message: `${missionTitle} выполнена! Награда: ${reward} UNI`
        });
      } else {
        const errorMessage = result?.message || (result?.data?.message) || 'Не удалось выполнить миссию';
        
        // Показываем уведомление об ошибке
        showNotification('error', {
          message: `Ошибка: ${errorMessage}`
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
  
  // Отображение загрузки
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="text-center text-muted-foreground text-sm mb-4">Загрузка заданий...</div>
        {[1, 2, 3].map(i => (
          <Card key={i} className="w-full opacity-70 animate-pulse">
            <CardHeader className="h-16"></CardHeader>
            <CardContent className="h-20"></CardContent>
            <CardFooter className="h-12"></CardFooter>
          </Card>
        ))}
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
              Произошла ошибка при загрузке заданий. Пожалуйста, попробуйте позже.
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
  
  // Отображение пустого списка
  if (missions.length === 0) {
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
  
  // Основное отображение списка миссий
  return (
    <div className="space-y-4 p-4">
      {missions.map(mission => {
        const isCompleted = completedMissions.includes(mission.id);
        
        return (
          <Card key={mission.id} className="w-full">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center">
                    {getMissionIcon(mission.type)}
                  </div>
                  <CardTitle className="text-lg">{mission.title}</CardTitle>
                </div>
                <Badge className={isCompleted ? 'bg-teal-500/70' : 'bg-blue-500'}>
                  <span className="flex items-center">
                    {isCompleted ? (
                      <><CheckCircle className="h-4 w-4 mr-1" />Выполнено</>
                    ) : (
                      <><AlertCircle className="h-4 w-4 mr-1" />Доступно</>
                    )}
                  </span>
                </Badge>
              </div>
              <CardDescription className="mt-2">{mission.description}</CardDescription>
            </CardHeader>
            
            <CardFooter className="flex justify-between items-center border-t pt-4">
              <div className="flex items-center">
                <div className="text-purple-300/80 font-medium mr-2">Награда:</div>
                <div className="flex items-center px-2 py-1 bg-purple-900/30 rounded-md">
                  <Coins className="h-4 w-4 text-purple-400 mr-1.5" />
                  <span className="text-purple-300 font-semibold">
                    {parseFloat(mission.reward_uni)} UNI
                  </span>
                </div>
              </div>
              
              {isCompleted ? (
                <Badge variant="outline" className="border-purple-400/60 text-purple-300 px-3 py-1">
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Получено
                </Badge>
              ) : (
                <Button 
                  size="sm"
                  onClick={() => completeMission(mission.id)}
                  className="bg-primary hover:bg-primary/90"
                >
                  Выполнить
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};

export default SimpleMissionsList;