import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfettiEffect from '@/components/ui/ConfettiEffect';

// Определение типов статусов миссий
export enum MissionStatus {
  AVAILABLE = 'available',
  PROCESSING = 'processing',
  COMPLETED = 'completed'
}

// Тип миссии
interface Mission {
  id: number;
  type: string;
  title: string;
  description: string;
  rewardUni: number;
  status: MissionStatus;
  progress?: number; // прогресс выполнения от 0 до 100
}

// Временные данные для демонстрации
// В реальном приложении эти данные будут получены из API
const demoMissions: Mission[] = [
  {
    id: 1,
    type: 'invite',
    title: 'Пригласи друга',
    description: 'Пригласи друга в UniFarm и получи бонус, когда он начнет фарминг',
    rewardUni: 5,
    status: MissionStatus.AVAILABLE,
  },
  {
    id: 2,
    type: 'social',
    title: 'Подпишись на Telegram канал',
    description: 'Подпишись на наш официальный Telegram канал и получи награду',
    rewardUni: 2.5,
    status: MissionStatus.PROCESSING,
    progress: 50,
  },
  {
    id: 3,
    type: 'check-in',
    title: 'Ежедневный бонус',
    description: 'Заходи в приложение каждый день и получай бонус',
    rewardUni: 1,
    status: MissionStatus.COMPLETED,
  },
  {
    id: 4,
    type: 'deposit',
    title: 'Сделай первый депозит',
    description: 'Сделай свой первый депозит в фарминг и получи бонусные токены',
    rewardUni: 10,
    status: MissionStatus.AVAILABLE,
  },
];

export const MissionsList: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedMissionId, setCompletedMissionId] = useState<number | null>(null);
  
  // Имитация загрузки данных
  useEffect(() => {
    const timer = setTimeout(() => {
      setMissions(demoMissions);
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Эффект для имитации прогресса выполнения миссии
  useEffect(() => {
    const processingMission = missions.find(
      m => m.status === MissionStatus.PROCESSING && m.progress !== undefined && m.progress < 100
    );
    
    if (processingMission) {
      const timer = setInterval(() => {
        setMissions(prevMissions => 
          prevMissions.map(mission => {
            if (mission.id === processingMission.id) {
              const newProgress = (mission.progress || 0) + 10;
              
              // Если прогресс достиг 100%, завершаем миссию
              if (newProgress >= 100) {
                setCompletedMissionId(mission.id);
                setShowConfetti(true);
                clearInterval(timer);
                return { 
                  ...mission, 
                  status: MissionStatus.COMPLETED, 
                  progress: 100 
                };
              }
              
              return { ...mission, progress: newProgress };
            }
            return mission;
          })
        );
      }, 800); // Обновляем прогресс каждые 800мс
      
      return () => clearInterval(timer);
    }
  }, [missions]);
  
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
          color: 'bg-green-500', 
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
  
  // Обработчик клика по кнопке "Выполнить"
  const handleStartMission = (id: number) => {
    setMissions(missions.map(mission => 
      mission.id === id 
        ? { ...mission, status: MissionStatus.PROCESSING, progress: 0 } 
        : mission
    ));
  };
  
  // Обработчик завершения анимации конфетти
  const handleConfettiComplete = () => {
    setShowConfetti(false);
    setCompletedMissionId(null);
  };
  
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="bg-card/50 animate-pulse">
            <CardHeader className="h-16"></CardHeader>
            <CardContent className="h-20"></CardContent>
            <CardFooter className="h-12"></CardFooter>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <AnimatePresence>
      {/* Эффект конфетти при завершении миссии */}
      <ConfettiEffect 
        active={showConfetti} 
        onComplete={handleConfettiComplete} 
        duration={3000} 
        colors={['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b']}
      />
      
      <div className="space-y-4 p-4">
        {missions.map((mission) => {
          const statusInfo = getMissionStatusInfo(mission.status);
          // Применяем эффект свечения к только что завершенной миссии
          const isRecentlyCompleted = completedMissionId === mission.id;
          
          return (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card 
                className={`overflow-hidden transition-all duration-500 ${
                  isRecentlyCompleted 
                    ? 'shadow-[0_0_15px_rgba(139,92,246,0.8)] scale-[1.02]' 
                    : ''
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className={`text-lg ${
                      isRecentlyCompleted ? 'text-primary' : ''
                    }`}>{mission.title}</CardTitle>
                    <Badge className={`${statusInfo.color} text-white ${
                      isRecentlyCompleted ? 'animate-pulse' : ''
                    }`}>
                      <span className="flex items-center">
                        {statusInfo.icon}
                        {statusInfo.text}
                      </span>
                    </Badge>
                  </div>
                  <CardDescription>{mission.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  {mission.status === MissionStatus.PROCESSING && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Прогресс</span>
                        <span>{mission.progress}%</span>
                      </div>
                      <Progress
                        value={mission.progress}
                        className="h-2"
                      />
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="flex justify-between items-center border-t pt-4">
                  <div className="text-primary font-medium">
                    Награда: <span className="text-green-500">{mission.rewardUni} UNI</span>
                  </div>
                  
                  {mission.status === MissionStatus.AVAILABLE && (
                    <Button 
                      size="sm" 
                      onClick={() => handleStartMission(mission.id)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Выполнить
                    </Button>
                  )}
                  
                  {mission.status === MissionStatus.COMPLETED && (
                    <Badge variant="outline" className="border-green-500 text-green-500">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Получено
                    </Badge>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </AnimatePresence>
  );
};

export default MissionsList;