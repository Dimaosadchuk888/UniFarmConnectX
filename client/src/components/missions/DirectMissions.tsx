import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, ChevronRight, Clock } from 'lucide-react';

/**
 * Компонент для отображения списка миссий напрямую через fetch, без использования 
 * React Query или других абстракций. Это позволяет избежать ошибки "w.map is not a function".
 * 
 * Реализует ТЗ: "Настроить вызов именно на `/missions` и обеспечить корректную загрузку карточек"
 */
export const DirectMissionsComponent: React.FC = () => {
  console.log('DirectMissionsComponent: компонент отрисовывается (v6)');
  
  // Состояния для хранения данных
  const [missions, setMissions] = useState<any[]>([]);
  const [userMissions, setUserMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Загрузка данных при монтировании компонента
  useEffect(() => {
    // Функция для прямого обращения к API через fetch
    const directFetch = async (url: string) => {
      try {
        // Получаем данные напрямую через fetch
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        return data;
      } catch (err) {
        console.error(`[DirectMissionsComponent] Ошибка при загрузке ${url}:`, err);
        throw err;
      }
    };
    
    // Функция для загрузки всех необходимых данных
    const loadAllData = async () => {
      try {
        setLoading(true);
        
        // Получаем данные миссий
        const missionsResponse = await directFetch('/api/missions/active');
        
        if (missionsResponse?.success && Array.isArray(missionsResponse.data)) {
          console.log('[DirectMissionsComponent] ✅ Миссии загружены:', missionsResponse.data.length);
          setMissions(missionsResponse.data);
          
          // Получаем статус миссий пользователя
          try {
            const userMissionsResponse = await directFetch('/api/user_missions?user_id=29');
            
            if (userMissionsResponse?.success && Array.isArray(userMissionsResponse.data)) {
              console.log('[DirectMissionsComponent] ✅ Статусы миссий загружены:', userMissionsResponse.data.length);
              setUserMissions(userMissionsResponse.data);
            } else {
              console.warn('[DirectMissionsComponent] ⚠️ Некорректные данные статусов миссий:', userMissionsResponse);
              setUserMissions([]);
            }
          } catch (umError) {
            console.error('[DirectMissionsComponent] ❌ Ошибка при загрузке статусов миссий:', umError);
            setUserMissions([]);
          }
        } else {
          console.error('[DirectMissionsComponent] ❌ Некорректные данные миссий:', missionsResponse);
          setMissions([]);
          setError('Не удалось загрузить миссии. Пожалуйста, попробуйте позже.');
        }
      } catch (err) {
        console.error('[DirectMissionsComponent] ❌ Критическая ошибка при загрузке данных:', err);
        setMissions([]);
        setError('Произошла ошибка при загрузке данных. Пожалуйста, обновите страницу.');
      } finally {
        setLoading(false);
      }
    };
    
    // Запускаем загрузку данных
    loadAllData();
  }, []);
  
  // Отображение индикатора загрузки
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p className="text-sm text-muted-foreground">Загрузка миссий...</p>
      </div>
    );
  }
  
  // Отображение ошибки
  if (error) {
    return (
      <Card className="w-full mb-4 bg-opacity-80 border border-red-500/30 bg-red-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-red-300">
            <AlertCircle className="mr-2 h-5 w-5 text-red-400" />
            Ошибка загрузки
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Попробовать снова
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Отображение сообщения при отсутствии миссий
  if (!missions || missions.length === 0) {
    return (
      <Card className="w-full mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-yellow-400" />
            Нет доступных миссий
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            В данный момент нет доступных миссий. Пожалуйста, проверьте позже.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Функция для получения статуса миссии пользователя
  const getMissionStatus = (missionId: number) => {
    const userMission = userMissions.find(um => um.mission_id === missionId);
    return userMission?.status || 'not_started';
  };
  
  // Функция для отображения иконки статуса
  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="text-green-400 h-5 w-5" />;
      case 'in_progress':
        return <Clock className="text-amber-400 h-5 w-5" />;
      default:
        return <ChevronRight className="text-gray-400 h-5 w-5" />;
    }
  };
  
  // Основной рендер карточек миссий
  return (
    <div className="grid gap-4">
      {missions.map((mission) => {
        const status = getMissionStatus(mission.id);
        
        return (
          <Card 
            key={mission.id} 
            className={`
              hover:border-primary/50 transition-all 
              ${status === 'completed' ? 'border-green-500/30 bg-green-950/10' : ''}
              ${status === 'in_progress' ? 'border-amber-500/30 bg-amber-950/10' : ''}
            `}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-start justify-between">
                <span>{mission.title}</span>
                <span className="text-xl font-bold text-primary whitespace-nowrap">
                  {mission.reward} UNI
                </span>
              </CardTitle>
              <CardDescription>{mission.description}</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {status === 'completed' && 'Выполнено'}
                  {status === 'in_progress' && 'В процессе'}
                  {status === 'not_started' && 'Не начато'}
                </div>
                
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground">Сложность:</span>
                  <span className="font-medium">
                    {mission.difficulty === 'easy' && 'Легко'}
                    {mission.difficulty === 'medium' && 'Средне'}
                    {mission.difficulty === 'hard' && 'Сложно'}
                  </span>
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                className="w-full justify-between" 
                variant={status === 'completed' ? 'outline' : 'default'}
                disabled={status === 'completed'}
              >
                <span>
                  {status === 'completed' && 'Выполнено'}
                  {status === 'in_progress' && 'Продолжить'}
                  {status === 'not_started' && 'Начать'}
                </span>
                {renderStatusIcon(status)}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};