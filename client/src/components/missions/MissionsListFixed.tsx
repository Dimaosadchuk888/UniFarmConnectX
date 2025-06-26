import { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  FiCheckCircle, 
  FiClock, 
  FiAlertCircle, 
  FiMessageCircle, 
  FiUsers, 
  FiCalendar, 
  FiDollarSign, 
  FiTv,
  FiUserPlus,
  FiTarget
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import ConfettiEffect from '@/components/ui/ConfettiEffect';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/userContext';
import { correctApiRequest } from '@/lib/correctApiRequest';

// Определение типов статусов миссий
export enum MissionStatus {
  AVAILABLE = 'available',
  PROCESSING = 'processing',
  COMPLETED = 'completed'
}

// Тип миссии из БД
interface DbMission {
  id: number;
  type: string;
  title: string;
  description: string;
  reward_uni: string; // В БД это numeric как строка
  is_active: boolean;
  link?: string; // Добавляем поле для ссылки
}

// Тип для выполненной миссии пользователя
interface UserMission {
  id: number;
  user_id: number;
  mission_id: number;
  completed_at: string;
}

// Тип для ответа от API при выполнении миссии
interface CompleteMissionResponse {
  success: boolean;
  message: string;
  reward?: number;
}

// Тип миссии для UI
interface Mission {
  id: number;
  type: string;
  title: string;
  description: string;
  rewardUni: number;
  status: MissionStatus;
  progress?: number; // прогресс выполнения от 0 до 100
  visitStartTime?: number; // время начала выполнения социальной миссии
  verificationAvailable?: boolean; // доступна ли кнопка проверки
  link?: string; // ссылка для перехода
}

export const MissionsListFixed: React.FC = () => {
  const queryClient = useQueryClient();
  const { userId } = useUser(); // Получаем ID пользователя из контекста
  const [missions, setMissions] = useState<Mission[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedMissionId, setCompletedMissionId] = useState<number | null>(null);
  const [rewardAmount, setRewardAmount] = useState<number | null>(null);
  const [processingMissionId, setProcessingMissionId] = useState<number | null>(null);
  const [timerIntervalId, setTimerIntervalId] = useState<number | null>(null);
  
  // Загружаем активные миссии через API с правильным endpoint
  const { data: dbMissions, isLoading: missionsLoading, error: missionsError } = useQuery<DbMission[]>({
    queryKey: ['/api/v2/missions/list'],
    queryFn: async () => {
      console.log('🚀 Запрос активных миссий');
      
      try {
        const nocache = Date.now();
        const data = await correctApiRequest(`/api/v2/missions/list?nocache=${nocache}`, 'GET');
        
        console.log(`📥 Ответ получен через correctApiRequest:`, data);
        
        if (data && data.success && Array.isArray(data.data)) {
          console.log(`✅ Получены активные миссии (${data.data.length} шт.)`);
          return data.data;
        } else {
          console.log('⚠️ Неожиданный формат данных:', data);
          return [];
        }
      } catch (error) {
        console.error('⚠️ Ошибка при запросе миссий:', error);
        return [];
      }
    },
    retry: false,
    staleTime: 0
  });
  
  // Загружаем выполненные миссии пользователя с правильным endpoint
  const { data: userCompletedMissions, isLoading: userMissionsLoading, error: userMissionsError } = useQuery<UserMission[]>({
    queryKey: ['/api/v2/missions/user', userId],
    queryFn: async () => {
      console.log('🚀 Запрос выполненных миссий пользователя ID:', userId);
      
      try {
        const nocache = Date.now();
        const data = await correctApiRequest(`/api/v2/missions/user/${userId || 48}?nocache=${nocache}`, 'GET');
        
        console.log(`📥 Ответ получен через correctApiRequest:`, data);
        
        if (data && data.success && Array.isArray(data.data)) {
          console.log(`✅ Получены выполненные миссии (${data.data.length} шт.)`);
          return data.data;
        } else {
          console.log('⚠️ Неожиданный формат данных:', data);
          return [];
        }
      } catch (error) {
        console.error('⚠️ Ошибка при запросе выполненных миссий:', error);
        return [];
      }
    },
    retry: false,
    staleTime: 0,
    enabled: !!userId
  });
  
  // Очистка интервала при размонтировании компонента
  useEffect(() => {
    return () => {
      if (timerIntervalId !== null) {
        clearInterval(timerIntervalId);
      }
    };
  }, [timerIntervalId]);

  // Преобразуем данные из БД в формат для UI
  useEffect(() => {
    try {
      console.log('MissionsList: dbMissions загружены:', dbMissions ? 'данные получены' : 'нет данных');
      
      if (!dbMissions) {
        console.log('MissionsList: dbMissions отсутствуют, устанавливаем пустой массив миссий');
        setMissions([]);
        return;
      }
      
      if (!Array.isArray(dbMissions)) {
        console.log('MissionsList: dbMissions не является массивом, устанавливаем пустой массив миссий');
        setMissions([]);
        return;
      }
      
      console.log(`MissionsList: обрабатываем ${dbMissions.length} миссий из базы данных`);
      
      const completedMissionsMap = new Map<number, UserMission>();
      
      if (userCompletedMissions && Array.isArray(userCompletedMissions)) {
        console.log(`MissionsList: обрабатываем ${userCompletedMissions.length} выполненных миссий`);
        
        userCompletedMissions.forEach(mission => {
          if (mission && typeof mission === 'object' && 'mission_id' in mission && typeof mission.mission_id === 'number') {
            completedMissionsMap.set(mission.mission_id, mission);
          }
        });
        
        console.log(`MissionsList: в карту добавлено ${completedMissionsMap.size} выполненных миссий`);
      } else {
        console.log('MissionsList: выполненные миссии отсутствуют или формат некорректен');
      }
      
      const mappedMissions: Mission[] = dbMissions
        .filter(dbMission => dbMission && typeof dbMission === 'object' && dbMission.id !== undefined)
        .map(dbMission => {
          const isCompleted = dbMission.id !== undefined && completedMissionsMap.has(dbMission.id);
          
          return {
            id: dbMission.id as number,
            type: dbMission.type || 'default',
            title: dbMission.title || 'Миссия',
            description: dbMission.description || 'Описание отсутствует',
            rewardUni: typeof dbMission.reward_uni === 'string' ? parseFloat(dbMission.reward_uni) || 0 : 0,
            status: isCompleted ? MissionStatus.COMPLETED : MissionStatus.AVAILABLE,
            link: dbMission.link
          };
        });
      
      console.log(`MissionsList: сформировано ${mappedMissions.length} миссий для отображения`);
      
      setMissions(mappedMissions);
    } catch (error) {
      console.error('MissionsList: ошибка при обработке данных миссий:', error);
      setMissions([]);
    }
  }, [dbMissions, userCompletedMissions]);
  
  // Обработчик клика по кнопке "Выполнить" с правильными параметрами API
  const handleCompleteMission = async (missionId: number) => {
    try {
      setProcessingMissionId(missionId);
      setMissions(missions.map(mission => 
        mission.id === missionId 
          ? { ...mission, status: MissionStatus.PROCESSING, progress: 0 } 
          : mission
      ));
      
      console.log(`📤 Отправка запроса на выполнение миссии ${missionId} с использованием correctApiRequest`);
      
      const result = await correctApiRequest('/api/v2/missions/complete', 'POST', {
        missionId: missionId
      }) as CompleteMissionResponse;
      
      console.log(`📥 Ответ получен через correctApiRequest:`, result);
      
      if (result.success) {
        // Имитируем прогресс заполнения прогресс-бара
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setMissions(prevMissions => 
            prevMissions.map(mission => 
              mission.id === missionId 
                ? { ...mission, progress } 
                : mission
            )
          );
          
          if (progress >= 100) {
            clearInterval(interval);
            
            setCompletedMissionId(missionId);
            
            const currentMission = missions.find(m => m.id === missionId);
            const rewardValue = result.reward !== undefined ? result.reward : 
                                (currentMission ? currentMission.rewardUni : 0);
            
            console.log(`[DEBUG] Награда за миссию: API=${result.reward}, UI=${currentMission?.rewardUni}, Итог=${rewardValue}`);
            
            setRewardAmount(rewardValue);
            setShowConfetti(true);
            
            setMissions(prevMissions => 
              prevMissions.map(mission => 
                mission.id === missionId 
                  ? { ...mission, status: MissionStatus.COMPLETED, progress: 100 } 
                  : mission
              )
            );
            
            toast({
              title: "Миссия выполнена!",
              description: `${result.message}`
            });
            
            setProcessingMissionId(null);
            
            // Обновляем кэш с правильными endpoints
            queryClient.invalidateQueries({ queryKey: ['/api/v2/missions/list'] });
            queryClient.invalidateQueries({ queryKey: ['/api/v2/missions/user', userId] });
          }
        }, 200);
      } else {
        toast({
          title: "Ошибка",
          description: result.message
        });
        
        setMissions(prevMissions => 
          prevMissions.map(mission => 
            mission.id === missionId 
              ? { ...mission, status: MissionStatus.AVAILABLE, progress: undefined } 
              : mission
          )
        );
        
        setProcessingMissionId(null);
      }
    } catch (error) {
      console.error('Error completing mission:', error);
      
      toast({
        title: "Ошибка",
        description: "Не удалось выполнить миссию. Пожалуйста, попробуйте снова."
      });
      
      setMissions(prevMissions => 
        prevMissions.map(mission => 
          mission.id === missionId 
            ? { ...mission, status: MissionStatus.AVAILABLE, progress: undefined } 
            : mission
        )
      );
      
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
        <FiDollarSign className="h-6 w-6 text-purple-300" />
        <span className="text-purple-200 font-bold text-2xl">+{reward} UNI</span>
      </div>
    );
  };
  
  // Функция для получения иконки в зависимости от типа миссии
  const getMissionTypeIcon = (type: string) => {
    switch (type) {
      case 'social':
        return <FiMessageCircle className="h-5 w-5 text-blue-400" />;
      case 'partner':
      case 'invite':
        return <FiUserPlus className="h-5 w-5 text-indigo-400" />;
      case 'daily':
      case 'check-in':
        return <FiCalendar className="h-5 w-5 text-amber-400" />;
      case 'deposit':
        return <FiDollarSign className="h-5 w-5 text-emerald-400" />;
      default:
        return <FiTv className="h-5 w-5 text-purple-400" />;
    }
  };

  // Функция для получения цвета и иконки в зависимости от статуса миссии
  const getMissionStatusInfo = (status: MissionStatus) => {
    switch (status) {
      case MissionStatus.AVAILABLE:
        return { 
          color: 'bg-blue-500/80 backdrop-blur-sm', 
          text: 'Доступно', 
          icon: <FiAlertCircle className="h-4 w-4 mr-1" /> 
        };
      case MissionStatus.PROCESSING:
        return { 
          color: 'bg-amber-500/80 backdrop-blur-sm', 
          text: 'В процессе', 
          icon: <FiClock className="h-4 w-4 mr-1" /> 
        };
      case MissionStatus.COMPLETED:
        return { 
          color: 'bg-emerald-500/80 backdrop-blur-sm', 
          text: 'Выполнено', 
          icon: <FiCheckCircle className="h-4 w-4 mr-1" /> 
        };
      default:
        return { 
          color: 'bg-muted/80', 
          text: 'Неизвестно', 
          icon: null 
        };
    }
  };
  
  // Обработчик завершения анимации конфетти
  const handleConfettiComplete = () => {
    setShowConfetti(false);
    setCompletedMissionId(null);
    setRewardAmount(null);
  };
  
  const isLoading = missionsLoading || userMissionsLoading;
  
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

  // Обработка ошибок запросов
  if (missionsError || userMissionsError) {
    return (
      <div className="space-y-4 p-4">
        <Card className="w-full bg-card/95 backdrop-blur-sm border border-red-500/20 shadow-lg relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-red-500/5 rounded-full blur-xl"></div>
          <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-red-500/5 rounded-full blur-xl"></div>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <FiAlertCircle className="mr-2 h-5 w-5 text-red-400" />
              Ошибка загрузки заданий
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {missionsError 
                ? `Ошибка при загрузке активных заданий: ${(missionsError as Error).message}` 
                : `Ошибка при загрузке выполненных заданий: ${(userMissionsError as Error).message}`}
            </p>
            <Button 
              className="mt-4 w-full"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/v2/missions/list'] });
                queryClient.invalidateQueries({ queryKey: ['/api/v2/missions/user', userId] });
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
        <Card className="w-full bg-card/95 backdrop-blur-sm border border-amber-500/20 shadow-lg relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/5 rounded-full blur-xl"></div>
          <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-amber-500/5 rounded-full blur-xl"></div>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <FiAlertCircle className="mr-2 h-5 w-5 text-amber-400" />
              Задания не найдены
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              В данный момент нет доступных заданий. Попробуйте обновить страницу или зайти позже.
            </p>
            <Button 
              className="w-full"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/v2/missions/list'] });
                queryClient.invalidateQueries({ queryKey: ['/api/v2/missions/user', userId] });
              }}
            >
              Обновить список заданий
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 relative">
      {/* Эффект конфетти */}
      {showConfetti && completedMissionId && (
        <ConfettiEffect 
          active={true}
          onComplete={handleConfettiComplete}
          particleCount={100}
          duration={3000}
        />
      )}
      
      {/* Отображение награды */}
      {showConfetti && completedMissionId && rewardAmount && (
        <RewardIndicator reward={rewardAmount} />
      )}
      
      {/* Карточки миссий */}
      {missions.map((mission, index) => {
        const statusInfo = getMissionStatusInfo(mission.status);
        const isProcessing = processingMissionId === mission.id;
        
        return (
          <motion.div
            key={mission.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="w-full bg-card/95 backdrop-blur-sm border border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              {/* Декоративные элементы фона */}
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/5 rounded-full blur-xl"></div>
              <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-primary/5 rounded-full blur-xl"></div>
              
              <CardHeader className="pb-2 relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getMissionTypeIcon(mission.type)}
                    <div>
                      <CardTitle className="text-lg font-bold text-white flex items-center">
                        {mission.title}
                      </CardTitle>
                      <CardDescription className="text-sm text-muted-foreground mt-1">
                        {mission.description}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <Badge 
                    className={`${statusInfo.color} text-white border-0 text-xs px-2 py-1 flex items-center`}
                  >
                    {statusInfo.icon}
                    {statusInfo.text}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="py-3 relative">
                {/* Прогресс-бар для выполняющихся миссий */}
                {mission.status === MissionStatus.PROCESSING && mission.progress !== undefined && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Выполнение...</span>
                      <span>{mission.progress}%</span>
                    </div>
                    <Progress value={mission.progress} className="h-2" />
                  </div>
                )}
                
                {/* Информация о награде */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FiDollarSign className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Награда:</span>
                    <span className="font-bold text-primary">{mission.rewardUni} UNI</span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="pt-2 relative">
                {mission.status === MissionStatus.AVAILABLE && (
                  <Button 
                    className="w-full bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90 transition-all duration-300"
                    onClick={() => handleCompleteMission(mission.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Выполняется...</span>
                      </div>
                    ) : (
                      'Выполнить задание'
                    )}
                  </Button>
                )}
                
                {mission.status === MissionStatus.PROCESSING && (
                  <Button 
                    className="w-full bg-amber-500/80 hover:bg-amber-500 transition-all duration-300" 
                    disabled
                  >
                    <FiClock className="h-4 w-4 mr-2" />
                    В процессе выполнения...
                  </Button>
                )}
                
                {mission.status === MissionStatus.COMPLETED && (
                  <Button 
                    className="w-full bg-emerald-500/80 hover:bg-emerald-500 transition-all duration-300" 
                    disabled
                  >
                    <FiCheckCircle className="h-4 w-4 mr-2" />
                    Задание выполнено
                  </Button>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};