import { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  MessageCircle, 
  Calendar, 
  Coins, 
  Tv,
  UserPlus
} from 'lucide-react';
import { motion } from 'framer-motion';
import ConfettiEffect from '@/components/ui/ConfettiEffect';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/userContext';
import { invalidateQueryWithUserId } from '@/lib/queryClient';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { 
  useMissionData, 
  Mission, 
  MissionStatus 
} from '@/hooks/use-mission-data';

// Тип для ответа от API при выполнении миссии
interface CompleteMissionResponse {
  success: boolean;
  message: string;
  reward?: number;
}

export const MissionsList: React.FC = () => {
  const queryClient = useQueryClient();
  const { userId } = useUser();
  const { missions, setMissions, isLoading, hasError } = useMissionData();
  
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedMissionId, setCompletedMissionId] = useState<number | null>(null);
  const [rewardAmount, setRewardAmount] = useState<number | null>(null);
  const [processingMissionId, setProcessingMissionId] = useState<number | null>(null);
  const [timerIntervalId, setTimerIntervalId] = useState<number | null>(null);
  
  // Очистка интервала при размонтировании компонента
  useEffect(() => {
    return () => {
      if (timerIntervalId !== null) {
        clearInterval(timerIntervalId);
      }
    };
  }, [timerIntervalId]);
  
  // Обработчик клика по кнопке "Выполнить"
  const handleCompleteMission = async (missionId: number) => {
    try {
      // Отмечаем миссию как обрабатываемую
      setProcessingMissionId(missionId);
      
      // Обновляем состояние миссий, обязательно проверяя missions
      if (missions) {
        setMissions(missions.map(mission => 
          mission.id === missionId 
            ? { ...mission, status: MissionStatus.PROCESSING, progress: 0 } 
            : mission
        ));
      }
      
      // Выполняем API запрос через correctApiRequest
      console.log(`📤 Отправка запроса на выполнение миссии ${missionId}`);
      
      const result = await correctApiRequest('/api/missions/complete', 'POST', {
        user_id: userId || 1,
        mission_id: missionId
      }) as CompleteMissionResponse;
      
      console.log(`📥 Ответ получен:`, result);
      
      if (result.success) {
        // Имитируем прогресс заполнения прогресс-бара
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          
          setMissions(prevMissions => {
            if (!prevMissions) return prevMissions;
            
            return prevMissions.map(mission => 
              mission.id === missionId 
                ? { ...mission, progress } 
                : mission
            );
          });
          
          if (progress >= 100) {
            clearInterval(interval);
            
            // Показываем эффект конфетти и сообщение о награде
            setCompletedMissionId(missionId);
            setRewardAmount(result.reward || 0);
            setShowConfetti(true);
            
            // Обновляем статус миссии
            setMissions(prevMissions => {
              if (!prevMissions) return prevMissions;
              
              return prevMissions.map(mission => 
                mission.id === missionId 
                  ? { ...mission, status: MissionStatus.COMPLETED, progress: 100 } 
                  : mission
              );
            });
            
            // Показываем уведомление
            toast({
              title: "Миссия выполнена!",
              description: `${result.message}`
            });
            
            // Сбрасываем ID обрабатываемой миссии
            setProcessingMissionId(null);
            
            // Обновляем данные о выполненных миссиях
            invalidateQueryWithUserId('/api/user_missions');
          }
        }, 200);
      } else {
        // Обрабатываем ошибку
        toast({
          title: "Ошибка",
          description: result.message || "Не удалось выполнить миссию"
        });
        
        // Возвращаем миссию в исходное состояние
        setMissions(prevMissions => {
          if (!prevMissions) return prevMissions;
          
          return prevMissions.map(mission => 
            mission.id === missionId 
              ? { ...mission, status: MissionStatus.AVAILABLE, progress: undefined } 
              : mission
          );
        });
        
        setProcessingMissionId(null);
      }
    } catch (error) {
      console.error('Error completing mission:', error);
      
      // Показываем уведомление об ошибке
      toast({
        title: "Ошибка",
        description: "Не удалось выполнить миссию. Пожалуйста, попробуйте снова."
      });
      
      // Возвращаем миссию в исходное состояние
      setMissions(prevMissions => {
        if (!prevMissions) return prevMissions;
        
        return prevMissions.map(mission => 
          mission.id === missionId 
            ? { ...mission, status: MissionStatus.AVAILABLE, progress: undefined } 
            : mission
        );
      });
      
      setProcessingMissionId(null);
    }
  };
  
  // Компонент для отображения награды
  const RewardIndicator = ({ reward }: { reward: number }) => {
    const rewardRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      const element = rewardRef.current;
      if (element) {
        element.animate(
          [
            { opacity: 0, transform: 'translateY(20px) scale(0.8)' },
            { opacity: 1, transform: 'translateY(-20px) scale(1.2)' },
            { opacity: 0, transform: 'translateY(-50px) scale(1)' }
          ],
          {
            duration: 1500,
            easing: 'ease-out'
          }
        );
      }
    }, []);
    
    return (
      <div 
        ref={rewardRef}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-2 bg-purple-900/70 backdrop-blur-sm px-5 py-3 rounded-xl shadow-xl"
      >
        <Coins className="h-6 w-6 text-purple-300" />
        <span className="text-purple-200 font-bold text-2xl">+{reward} UNI</span>
      </div>
    );
  };
  
  // Функция для получения иконки в зависимости от типа миссии
  const getMissionTypeIcon = (type: string) => {
    switch (type) {
      case 'social':
        return <MessageCircle className="h-5 w-5 text-blue-400" />;
      case 'partner':
      case 'invite':
        return <UserPlus className="h-5 w-5 text-indigo-400" />;
      case 'daily':
      case 'check-in':
        return <Calendar className="h-5 w-5 text-amber-400" />;
      case 'deposit':
        return <Coins className="h-5 w-5 text-emerald-400" />;
      default:
        return <Tv className="h-5 w-5 text-purple-400" />;
    }
  };

  // Функция для получения цвета и иконки в зависимости от статуса миссии
  const getMissionStatusInfo = (status: MissionStatus) => {
    switch (status) {
      case MissionStatus.AVAILABLE:
        return { 
          color: 'bg-blue-500', 
          text: 'Доступно', 
          icon: <AlertCircle className="h-4 w-4 mr-1" /> 
        };
      case MissionStatus.PROCESSING:
        return { 
          color: 'bg-amber-500', 
          text: 'В процессе', 
          icon: <Clock className="h-4 w-4 mr-1" /> 
        };
      case MissionStatus.COMPLETED:
        return { 
          color: 'bg-teal-500/70 backdrop-blur-sm', 
          text: 'Выполнено', 
          icon: <CheckCircle className="h-4 w-4 mr-1" /> 
        };
      default:
        return { 
          color: 'bg-gray-500', 
          text: 'Неизвестно', 
          icon: null 
        };
    }
  };
  
  // Функция для получения URL из описания миссии
  const extractUrlFromDescription = (description: string): string | null => {
    // Регулярное выражение для поиска URL в тексте
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = description.match(urlRegex);
    
    if (matches && matches.length > 0) {
      return matches[0];
    }
    
    return null;
  };
  
  // Обработчик начала выполнения социальной миссии
  const handleStartSocialMission = (missionId: number, url: string) => {
    // Открываем ссылку в новой вкладке
    window.open(url, '_blank');
    
    // Обновляем статус миссии
    setMissions(prevMissions => {
      if (!prevMissions) return prevMissions;
      
      return prevMissions.map(mission => 
        mission.id === missionId 
          ? { 
              ...mission, 
              visitStartTime: Date.now(),
              status: MissionStatus.PROCESSING,
              progress: 0,
              verificationAvailable: false
            } 
          : mission
      );
    });
    
    // Если есть предыдущий интервал, очищаем его
    if (timerIntervalId !== null) {
      clearInterval(timerIntervalId);
    }
    
    // Запускаем таймер обновления обратного отсчета и активации кнопки
    const intervalId = window.setInterval(() => {
      const currentTime = Date.now();
      
      setMissions(prevMissions => {
        if (!prevMissions) return prevMissions;
        
        return prevMissions.map(mission => {
          if (mission.id === missionId && mission.status === MissionStatus.PROCESSING) {
            const startTime = mission.visitStartTime || currentTime;
            const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
            const remainingSeconds = Math.max(0, 5 - elapsedSeconds);
            
            // Если таймер истек, активируем кнопку проверки
            if (remainingSeconds === 0 && !mission.verificationAvailable) {
              return { ...mission, verificationAvailable: true };
            }
            
            return mission;
          }
          return mission;
        });
      });
      
      // Проверяем, есть ли активные социальные миссии в процессе
      const hasActiveSocialMissions = missions && missions.some(
        m => m.type === 'social' && m.status === MissionStatus.PROCESSING && !m.verificationAvailable
      );
      
      // Если нет активных миссий, останавливаем интервал
      if (!hasActiveSocialMissions) {
        clearInterval(intervalId);
        setTimerIntervalId(null);
      }
    }, 1000);
    
    setTimerIntervalId(intervalId);
    
    // Устанавливаем таймер на 5 секунд для активации кнопки проверки
    setTimeout(() => {
      setMissions(prevMissions => {
        if (!prevMissions) return prevMissions;
        
        return prevMissions.map(mission => 
          mission.id === missionId && mission.status === MissionStatus.PROCESSING
            ? { ...mission, verificationAvailable: true } 
            : mission
        );
      });
    }, 5000);
  };
  
  // Обработчик проверки выполнения социальной миссии
  const handleVerifySocialMission = (missionId: number) => {
    handleCompleteMission(missionId);
  };
  
  // Обработчик завершения анимации конфетти
  const handleConfettiComplete = () => {
    setShowConfetti(false);
    setCompletedMissionId(null);
    setRewardAmount(null);
  };
  
  // Если идет загрузка, показываем плейсхолдеры карточек
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="text-center mb-4 text-muted-foreground text-sm">
          Загрузка заданий...
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="w-full opacity-70 animate-pulse">
            <CardHeader className="pb-2 h-16"></CardHeader>
            <CardContent className="h-20"></CardContent>
            <CardFooter className="h-12"></CardFooter>
          </Card>
        ))}
      </div>
    );
  }
  
  // Если есть ошибка загрузки
  if (hasError) {
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
              onClick={() => {
                // Инвалидируем запросы для перезагрузки данных
                queryClient.invalidateQueries({ queryKey: ['/api/missions/active'] });
                queryClient.invalidateQueries({ queryKey: ['/api/user_missions', userId] });
              }}
            >
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Если нет миссий для отображения
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
              onClick={() => {
                // Инвалидируем запросы для перезагрузки данных
                queryClient.invalidateQueries({ queryKey: ['/api/missions/active'] });
                queryClient.invalidateQueries({ queryKey: ['/api/user_missions', userId] });
              }}
            >
              Обновить
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="relative">
      {/* Эффект конфетти при завершении миссии */}
      <ConfettiEffect 
        active={showConfetti} 
        onComplete={handleConfettiComplete} 
        duration={3500} 
        colors={['#c4b5fd', '#8b5cf6', '#a855f7', '#7c3aed', '#6366f1', '#d946ef']}
        particleCount={100}
        spread={90}
        gravity={0.65}
      />
      
      <div className="space-y-4 p-4">
        {missions.map((mission) => {
          const statusInfo = getMissionStatusInfo(mission.status);
          const isRecentlyCompleted = completedMissionId !== null && completedMissionId === mission.id;
          const isProcessing = processingMissionId !== null && processingMissionId === mission.id;
          
          return (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              {/* Индикатор награды при завершении миссии */}
              {isRecentlyCompleted && rewardAmount !== null && (
                <RewardIndicator reward={rewardAmount} />
              )}
              
              <Card 
                className={`overflow-hidden transition-all duration-500 ${
                  isRecentlyCompleted 
                    ? 'shadow-[0_0_15px_rgba(139,92,246,0.8)] scale-[1.02]' 
                    : ''
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center">
                        {getMissionTypeIcon(mission.type)}
                      </div>
                      <CardTitle className={`text-lg ${
                        isRecentlyCompleted ? 'text-primary' : ''
                      }`}>{mission.title}</CardTitle>
                    </div>
                    <Badge className={`${statusInfo.color} text-white opacity-80 ${
                      isRecentlyCompleted ? 'animate-pulse' : ''
                    }`}>
                      <span className="flex items-center">
                        {statusInfo.icon}
                        {statusInfo.text}
                      </span>
                    </Badge>
                  </div>
                  <CardDescription className="mt-2">{mission.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  {mission.status === MissionStatus.PROCESSING && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Прогресс</span>
                        <span>{mission.progress || 0}%</span>
                      </div>
                      <Progress
                        value={mission.progress}
                        className="h-2"
                      />
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="flex justify-between items-center border-t pt-4">
                  <div className="flex items-center">
                    <div className="text-purple-300/80 font-medium mr-2">Награда:</div>
                    <div className="flex items-center px-2 py-1 bg-purple-900/30 rounded-md">
                      <Coins className="h-4 w-4 text-purple-400 mr-1.5" />
                      <span className="text-purple-300 font-semibold">{mission.rewardUni} UNI</span>
                    </div>
                  </div>
                  
                  {/* Социальные миссии с кнопкой Перейти и Проверить задание */}
                  {mission.status === MissionStatus.AVAILABLE && mission.type === 'social' && (
                    <Button 
                      size="sm"
                      onClick={() => {
                        const url = extractUrlFromDescription(mission.description) || 'https://t.me/unifarm';
                        handleStartSocialMission(mission.id, url);
                      }}
                      className="bg-primary hover:bg-primary/90"
                      disabled={isProcessing}
                    >
                      Перейти
                    </Button>
                  )}
                  
                  {/* Кнопка проверки для социальной миссии в процессе */}
                  {mission.status === MissionStatus.PROCESSING && mission.type === 'social' && (
                    <div className="flex flex-col gap-2">
                      {!mission.verificationAvailable && (
                        <div className="text-xs text-center text-muted-foreground mb-1">
                          Кнопка будет доступна через {5 - Math.floor((Date.now() - (mission.visitStartTime || 0)) / 1000)} сек.
                        </div>
                      )}
                      <Button 
                        size="sm"
                        onClick={() => handleVerifySocialMission(mission.id)}
                        className="bg-primary hover:bg-primary/90"
                        disabled={!mission.verificationAvailable || isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent"></span>
                            Проверка...
                          </>
                        ) : (
                          "Проверить задание"
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {/* Обычные миссии с кнопкой "Выполнить" */}
                  {mission.status === MissionStatus.AVAILABLE && mission.type !== 'social' && (
                    <Button 
                      size="sm"
                      onClick={() => handleCompleteMission(mission.id)}
                      className="bg-primary hover:bg-primary/90"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent"></span>
                          Выполнение...
                        </>
                      ) : (
                        "Выполнить"
                      )}
                    </Button>
                  )}
                  
                  {/* Индикатор выполненной миссии */}
                  {mission.status === MissionStatus.COMPLETED && (
                    <Badge variant="outline" className="border-purple-400/60 text-purple-300 px-3 py-1">
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Получено
                    </Badge>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default MissionsList;