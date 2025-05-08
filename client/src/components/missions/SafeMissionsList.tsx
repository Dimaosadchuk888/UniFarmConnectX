import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calendar, CheckCircle, Coins, MessageCircle, UserPlus } from 'lucide-react';
import { useNotification } from '@/contexts/notificationContext';
import { useMissionsSafe } from '@/hooks/use-missions-safe';

/**
 * Безопасная версия компонента списка миссий, использующая хук useMissionsSafe
 * который предотвращает проблемы с Map и методами map()
 */
export const SafeMissionsList: React.FC = () => {
  console.log('SafeMissionsList: компонент отрисовывается');
  
  // Используем безопасный хук для миссий
  const { 
    missions, 
    completedMissionIds, 
    loading, 
    error, 
    completeMission,
    isCompleted
  } = useMissionsSafe();
  
  // Получаем доступ к системе уведомлений
  const { showNotification } = useNotification();

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
      for (let i = 0; i < missions.length; i++) {
        if (missions[i].id === missionId) {
          missionTitle = missions[i].title || missionTitle;
          break;
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
  
  // Отображение пустого списка
  if (!missions || missions.length === 0) {
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
    
    for (let i = 0; i < missions.length; i++) {
      const mission = missions[i];
      const isCompletedMission = isCompleted(mission.id);
      
      cards.push(
        <Card key={mission.id} className="w-full">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center">
                  {getMissionIcon(mission.type)}
                </div>
                <CardTitle className="text-lg">{mission.title}</CardTitle>
              </div>
              <Badge className={isCompletedMission ? 'bg-teal-500/70' : 'bg-blue-500'}>
                <span className="flex items-center">
                  {isCompletedMission ? (
                    <React.Fragment>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Выполнено
                    </React.Fragment>
                  ) : (
                    <React.Fragment>
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Доступно
                    </React.Fragment>
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

export default SafeMissionsList;