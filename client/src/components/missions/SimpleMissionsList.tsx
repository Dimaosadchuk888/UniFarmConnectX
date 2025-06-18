import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Users, Calendar, MessageCircle, Tv, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import frontendLogger from '@/utils/frontendLogger';

/**
 * Компонент для отображения реальных заданий по соцсетям
 * Загружает данные с сервера и позволяет выполнение заданий
 */
const SimpleMissionsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [completedMissions, setCompletedMissions] = useState<Set<number>>(new Set());

  // Типы для миссий
  interface Mission {
    id: number;
    title: string;
    description: string;
    type: string;
    reward_uni: string;
    reward_ton: string;
    status: string;
    url?: string;
  }

  // Загружаем активные миссии с сервера
  const { data: missions = [], isLoading: missionsLoading } = useQuery<Mission[]>({
    queryKey: ['/api/v2/missions/active'],
    enabled: true,
    retry: false
  });

  // Загружаем статистику миссий
  const { data: missionStats } = useQuery({
    queryKey: ['/api/v2/missions/stats'],
    enabled: true,
    retry: false
  });

  // Мутация для выполнения миссии
  const completeMissionMutation = useMutation({
    mutationFn: async ({ missionId, url }: { missionId: number; url?: string }) => {
      // Открываем URL в новой вкладке если есть
      if (url) {
        window.open(url, '_blank');
      }

      // Используем TanStack Query для автоматической обработки заголовков
      const response = await queryClient.getQueryData(['/api/v2/missions/complete']) || 
        await fetch(`/api/v2/missions/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ missionId })
        });

      if (response && !response.ok) {
        throw new Error('Failed to complete mission');
      }

      return { success: true, message: 'Mission completed' };
    },
    onSuccess: (data, variables) => {
      frontendLogger.info('[Missions] Mission completed successfully', { missionId: variables.missionId });
      setCompletedMissions(prev => {
        const newSet = new Set(prev);
        newSet.add(variables.missionId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/missions/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/missions/stats'] });
    },
    onError: (error) => {
      frontendLogger.error('[Missions] Failed to complete mission:', error);
    }
  });

  // Мутация для получения награды
  const claimRewardMutation = useMutation({
    mutationFn: async (missionId: number) => {
      const response = await fetch(`/api/v2/missions/${missionId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to claim reward');
      }

      return response.json();
    },
    onSuccess: (data, missionId) => {
      frontendLogger.info('[Missions] Reward claimed successfully', { missionId, reward: data.reward });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/users/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/missions/stats'] });
    },
    onError: (error) => {
      frontendLogger.error('[Missions] Failed to claim reward:', error);
    }
  });

  // Определяем иконки для типов миссий
  const getIconForMissionType = (type: string) => {
    switch (type) {
      case 'telegram_group':
      case 'telegram_channel':
        return MessageCircle;
      case 'youtube':
        return Tv;
      case 'tiktok':
        return Tv;
      case 'daily_login':
        return Calendar;
      case 'referral':
        return Users;
      case 'farming_start':
        return Coins;
      default:
        return MessageCircle;
    }
  };

  const getStatusBadge = (missionId: number, status: string = 'available') => {
    const isCompleted = completedMissions.has(missionId);
    
    if (isCompleted) {
      return <Badge variant="default" className="bg-green-600">Выполнено</Badge>;
    }
    
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Выполнено</Badge>;
      case 'processing':
        return <Badge variant="secondary">В процессе</Badge>;
      default:
        return <Badge variant="outline">Доступно</Badge>;
    }
  };

  const handleMissionClick = (mission: any) => {
    const isCompleted = completedMissions.has(mission.id);
    
    if (isCompleted) {
      // Если миссия выполнена, получаем награду
      claimRewardMutation.mutate(mission.id);
    } else {
      // Если миссия не выполнена, выполняем её
      completeMissionMutation.mutate({ 
        missionId: mission.id, 
        url: mission.url 
      });
    }
  };

  const getButtonText = (missionId: number) => {
    const isCompleted = completedMissions.has(missionId);
    
    if (claimRewardMutation.isPending && claimRewardMutation.variables === missionId) {
      return 'Получение награды...';
    }
    
    if (completeMissionMutation.isPending && completeMissionMutation.variables?.missionId === missionId) {
      return 'Выполнение...';
    }
    
    return isCompleted ? 'Получить награду' : 'Выполнить';
  };

  const isButtonDisabled = (missionId: number) => {
    return completeMissionMutation.isPending || claimRewardMutation.isPending;
  };

  if (missionsLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="bg-gray-800 border-gray-700 animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-3 bg-gray-700 rounded w-full mb-4"></div>
              <div className="h-8 bg-gray-700 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {missions.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6 text-center">
            <MessageCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Нет доступных заданий</p>
          </CardContent>
        </Card>
      ) : (
        missions.map((mission: any) => {
          const IconComponent = getIconForMissionType(mission.type);
          const isCompleted = completedMissions.has(mission.id);
          
          return (
            <Card key={mission.id} className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-600/20 rounded-lg">
                      <IconComponent className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-base">{mission.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusBadge(mission.id, mission.status)}
                        <span className="text-yellow-400 text-sm font-medium">
                          +{parseFloat(mission.reward_uni || '0').toFixed(0)} UNI
                        </span>
                      </div>
                    </div>
                  </div>
                  {mission.url && (
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <CardDescription className="text-gray-300 text-sm mb-4">
                  {mission.description}
                </CardDescription>
                
                <Button 
                  onClick={() => handleMissionClick(mission)}
                  disabled={isButtonDisabled(mission.id)}
                  className={`w-full text-white ${
                    isCompleted 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  size="sm"
                >
                  {getButtonText(mission.id)}
                </Button>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default SimpleMissionsList;