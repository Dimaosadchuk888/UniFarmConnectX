import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Coins } from 'lucide-react';
import { useUser } from '@/contexts/userContext';
import { correctApiRequest } from '@/lib/correctApiRequest';

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
  const { userId } = useUser();
  const validUserId = userId || '1';
  const [openedMissions, setOpenedMissions] = useState<Set<number>>(new Set());
  const [checkingMission, setCheckingMission] = useState<number | null>(null);

  const { data: missionsData, refetch: refetchMissions } = useQuery({
    queryKey: ['/api/v2/missions/list', validUserId],
    queryFn: () => correctApiRequest(`/api/v2/missions/list?user_id=${validUserId}`),
    refetchInterval: 10000,
  });

  const { data: userMissionsData, refetch: refetchUserMissions } = useQuery({
    queryKey: ['/api/v2/missions/user', validUserId],
    queryFn: () => correctApiRequest(`/api/v2/missions/user/${validUserId}`),
    refetchInterval: 10000,
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
    try {
      setCheckingMission(mission.id);
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
        // Обновляем списки после успешного выполнения
        await refetchMissions();
        await refetchUserMissions();
        setOpenedMissions(prev => {
          const newSet = new Set(prev);
          newSet.delete(mission.id);
          return newSet;
        });
      }
    } catch (err) {
      console.error('Ошибка при проверке задания:', err);
    } finally {
      setCheckingMission(null);
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
                          className="bg-green-600 hover:bg-green-700"
                          disabled={checkingMission === mission.id}
                        >
                          {checkingMission === mission.id ? 'Проверка...' : 'Проверить'}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleMissionClick(mission)}
                          className="bg-blue-600 hover:bg-blue-700"
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