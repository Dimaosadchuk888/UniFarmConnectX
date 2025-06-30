import React from 'react';
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

  const { data: missionsData } = useQuery({
    queryKey: ['/api/missions', validUserId],
    queryFn: () => correctApiRequest(`/api/missions?user_id=${validUserId}`),
    refetchInterval: 10000,
  });

  const { data: userMissionsData } = useQuery({
    queryKey: ['/api/user-missions', validUserId],
    queryFn: () => correctApiRequest(`/api/user-missions?user_id=${validUserId}`),
    refetchInterval: 10000,
  });

  const missions: Mission[] = missionsData?.data || [];
  const userMissions: UserMission[] = userMissionsData?.data || [];
  const completedMissionIds = new Set(userMissions.map(um => um.mission_id));

  const handleMissionClick = (mission: Mission) => {
    if (mission.link) {
      window.open(mission.link, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Задания</h2>
        <p className="text-gray-400">Выполняйте задания и получайте награды</p>
      </div>

      <div className="grid gap-4">
        {missions.filter(mission => mission.is_active).map((mission) => {
          const isCompleted = completedMissionIds.has(mission.id);
          
          return (
            <Card 
              key={mission.id} 
              className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 backdrop-blur-sm border border-purple-500/30"
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
                    <Button
                      onClick={() => handleMissionClick(mission)}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                      disabled={isCompleted}
                    >
                      {mission.link ? 'Перейти' : 'Выполнить'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {missions.filter(mission => mission.is_active).length === 0 && (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">Заданий пока нет</p>
        </div>
      )}
    </div>
  );
};

export default SimpleMissionsList;