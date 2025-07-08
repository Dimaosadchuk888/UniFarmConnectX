import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Coins } from 'lucide-react';
import { useUser } from '@/contexts/userContext';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { useToast } from '@/hooks/use-toast';

interface Mission {
  id: number;
  type: string;
  title: string;
  description: string;
  reward_uni: string;
  is_active: boolean;
  link?: string;
}

interface UserMission {
  id: number;
  mission_id: number;
  completed_at: string;
}

const SimpleMissionsList: React.FC = () => {
  const { userId, refreshUserData } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [openedMissions, setOpenedMissions] = useState<Set<number>>(new Set());
  const [checkingMission, setCheckingMission] = useState<number | null>(null);
  const [processingMissions, setProcessingMissions] = useState<Set<number>>(new Set());

  // Проверяем наличие авторизации перед запросами
  const hasAuth = !!userId && !!localStorage.getItem('unifarm_jwt_token');
  
  console.log('[SimpleMissionsList] Авторизация:', { userId, hasAuth, hasToken: !!localStorage.getItem('unifarm_jwt_token') });

  const { data: missionsData, refetch: refetchMissions } = useQuery({
    queryKey: ['/api/v2/missions/list', userId],
    queryFn: () => correctApiRequest(`/api/v2/missions/list?user_id=${userId}`),
    enabled: hasAuth, // Включаем запрос только при наличии авторизации
    refetchInterval: hasAuth ? 30000 : false, // Отключаем автообновление без авторизации
    retry: (failureCount, error: any) => {
      // Не повторять при 429 ошибках
      if (error?.status === 429) {
        console.log('[SimpleMissionsList] Пропускаем retry для 429 ошибки');
        return false;
      }
      return failureCount < 3;
    },
  });

  const { data: userMissionsData, refetch: refetchUserMissions } = useQuery({
    queryKey: ['/api/v2/missions/user', userId],
    queryFn: () => correctApiRequest(`/api/v2/missions/user/${userId}`),
    enabled: hasAuth, // Включаем запрос только при наличии авторизации
    refetchInterval: hasAuth ? 30000 : false, // Отключаем автообновление без авторизации
    retry: (failureCount, error: any) => {
      // Не повторять при 429 ошибках
      if (error?.status === 429) {
        console.log('[SimpleMissionsList] Пропускаем retry для 429 ошибки');
        return false;
      }
      return failureCount < 3;
    },
  });

  const missions: Mission[] = missionsData?.data || [];
  const userMissions: UserMission[] = userMissionsData?.data || [];
  const completedMissionIds = new Set(userMissions.map(um => um.mission_id));

  // Добавляем логирование для отладки
  console.log('[SimpleMissionsList] Missions data:', { 
    missionsData,
    missions: missions.length,
    activeMissions: missions.filter(m => m.is_active).length
  });
  console.log('[SimpleMissionsList] User missions:', {
    userMissionsData,
    userMissions: userMissions.length,
    completedIds: Array.from(completedMissionIds)
  });

  const handleMissionClick = (mission: Mission) => {
    if (mission.link) {
      window.open(mission.link, '_blank');
      setOpenedMissions(prev => new Set(Array.from(prev).concat(mission.id)));
    }
  };

  const handleCheckMission = async (mission: Mission) => {
    // Защита от двойного клика
    if (processingMissions.has(mission.id)) {
      return;
    }

    try {
      setCheckingMission(mission.id);
      setProcessingMissions(prev => new Set(Array.from(prev).concat(mission.id)));
      
      const response = await correctApiRequest(
        `/api/v2/missions/${mission.id}/complete`,
        'POST',
        {
          missionId: mission.id,
          verification_data: {
            social_link: mission.link
          }
        }
      );

      if (response.success) {
        // Показываем уведомление об успехе
        toast({
          title: "Успех!",
          description: response.message || `Миссия выполнена! Получено ${mission.reward_uni} UNI`,
          variant: "default",
          className: "bg-green-600 text-white"
        });

        // Мгновенно обновляем баланс пользователя
        await refreshUserData();
        
        // Обновляем списки миссий
        await refetchMissions();
        await refetchUserMissions();
        
        // Инвалидируем кэши связанные с балансом
        queryClient.invalidateQueries({ queryKey: ['/api/v2/users/profile'] });
        queryClient.invalidateQueries({ queryKey: ['/api/v2/wallet/balance'] });
        
        // Убираем миссию из списка открытых
        setOpenedMissions(prev => {
          const newSet = new Set(prev);
          newSet.delete(mission.id);
          return newSet;
        });
      } else {
        toast({
          title: "Ошибка",
          description: response.message || "Не удалось выполнить миссию",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Ошибка при проверке задания:', err);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при проверке задания",
        variant: "destructive"
      });
    } finally {
      setCheckingMission(null);
      // Убираем миссию из обработки через небольшую задержку
      setTimeout(() => {
        setProcessingMissions(prev => {
          const newSet = new Set(prev);
          newSet.delete(mission.id);
          return newSet;
        });
      }, 1000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Задания</h2>
        <p className="text-gray-400">Выполняйте задания и получайте награды</p>
      </div>

      <div className="grid gap-4">
        {missions.map((mission) => {
          const isCompleted = completedMissionIds.has(mission.id);
          
          return (
            <Card 
              key={mission.id} 
              className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-sm border border-blue-500/30"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    {mission.title}
                    {isCompleted && <CheckCircle className="w-5 h-5 text-green-400" />}
                  </CardTitle>
                  <Badge 
                    variant={isCompleted ? "default" : "secondary"}
                    className={isCompleted ? "bg-green-600" : "bg-yellow-600"}
                  >
                    {isCompleted ? 'Завершено' : 'Доступно'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">{mission.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Coins className="w-4 h-4" />
                    <span className="font-semibold">{mission.reward_uni} UNI</span>
                  </div>
                  
                  {!isCompleted && (
                    <div className="flex gap-2">
                      {openedMissions.has(mission.id) ? (
                        <Button
                          onClick={() => handleCheckMission(mission)}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={checkingMission === mission.id || processingMissions.has(mission.id)}
                        >
                          {checkingMission === mission.id ? 'Проверка...' : 'Проверить'}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleMissionClick(mission)}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={processingMissions.has(mission.id)}
                        >
                          {mission.link ? 'Перейти' : 'Выполнить'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {missions.length === 0 && (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">Заданий пока нет</p>
        </div>
      )}
    </div>
  );
};

export default SimpleMissionsList;