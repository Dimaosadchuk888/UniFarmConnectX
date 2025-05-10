import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/contexts/userContext';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { CheckCircle, Award, Clock } from 'lucide-react';

// Тип для статистики миссий
interface MissionStats {
  totalMissions: number;
  completedMissions: number;
  availableMissions: number;
  totalEarned: number;
}

/**
 * Компонент для отображения статистики выполнения миссий пользователя
 */
const MissionStats: React.FC = () => {
  const { userId } = useUser();
  
  // Запрос статистики миссий пользователя
  const { data, isLoading, error } = useQuery<MissionStats>({
    queryKey: ['/api/missions/stats', userId],
    queryFn: async () => {
      try {
        if (!userId) {
          throw new Error('ID пользователя не определен');
        }
        
        const result = await correctApiRequest(`/api/missions/stats?user_id=${userId}`, 'GET');
        
        if (result.success && result.data) {
          return result.data;
        }
        
        throw new Error('Некорректный формат данных');
      } catch (err) {
        console.error('Ошибка при получении статистики миссий:', err);
        
        // Возвращаем шаблонные данные в случае ошибки
        return {
          totalMissions: 0,
          completedMissions: 0,
          availableMissions: 0,
          totalEarned: 0
        };
      }
    },
    enabled: !!userId, // Запрос выполняется только если userId определен
    refetchOnWindowFocus: false,
    staleTime: 300000 // 5 минут
  });
  
  // Процент выполненных миссий
  const completionPercentage = data 
    ? Math.round((data.completedMissions / (data.totalMissions || 1)) * 100) 
    : 0;
  
  return (
    <Card className="mb-6 bg-card/60 backdrop-blur-sm border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Award className="mr-2 h-5 w-5 text-primary" />
          Статистика миссий
        </CardTitle>
        <CardDescription>
          Ваш прогресс выполнения миссий
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full bg-gray-700/50" />
            <Skeleton className="h-4 w-3/4 bg-gray-700/50" />
            <Skeleton className="h-6 w-full bg-gray-700/50" />
            <Skeleton className="h-20 w-full rounded-md bg-gray-700/50" />
          </div>
        ) : error ? (
          <div className="p-4 text-red-400 text-center">
            <p>Не удалось загрузить статистику миссий</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Линия прогресса */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Прогресс выполнения</span>
                <span className="font-medium text-primary">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
            
            {/* Карточки со статистикой */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center text-blue-400 mb-1">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="text-xs">Доступно</span>
                </div>
                <div className="text-xl font-semibold">{data?.availableMissions || 0}</div>
              </div>
              
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center text-green-400 mb-1">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span className="text-xs">Выполнено</span>
                </div>
                <div className="text-xl font-semibold">{data?.completedMissions || 0}</div>
              </div>
            </div>
            
            {/* Общая статистика */}
            <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 p-4 rounded-lg mt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Всего заработано UNI</p>
                  <p className="text-2xl font-bold text-primary">
                    {data?.totalEarned ? data.totalEarned.toLocaleString('ru-RU') : '0'}
                  </p>
                </div>
                <Award className="h-10 w-10 text-primary opacity-30" />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MissionStats;