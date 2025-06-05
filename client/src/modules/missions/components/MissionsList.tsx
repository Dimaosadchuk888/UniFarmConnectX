/**
 * Список миссий с новой архитектурой
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '../../../core/api';
import { QUERY_KEYS } from '../../../shared/constants';

interface Mission {
  id: number;
  title: string;
  description: string;
  reward_uni: string;
  reward_ton: string;
  type: string;
  is_active: boolean;
}

export const MissionsList: React.FC = () => {
  const { data: missions = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.MISSIONS,
    queryFn: () => apiClient.getMissions(),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Ошибка загрузки миссий</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Доступные миссии</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {missions.length === 0 ? (
          <p className="text-center text-muted-foreground">Нет доступных миссий</p>
        ) : (
          missions.map((mission: Mission) => (
            <div key={mission.id} className="p-4 border rounded-lg">
              <h3 className="font-semibold">{mission.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{mission.description}</p>
              <div className="flex justify-between items-center mt-3">
                <div className="text-sm">
                  <span className="font-medium">Награда: </span>
                  {mission.reward_uni && `${mission.reward_uni} UNI`}
                  {mission.reward_ton && ` ${mission.reward_ton} TON`}
                </div>
                <span className={`px-2 py-1 text-xs rounded ${
                  mission.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {mission.is_active ? 'Активна' : 'Неактивна'}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};