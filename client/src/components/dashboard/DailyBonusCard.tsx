import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getQueryFn } from '@/lib/queryClient';

// Типы для статуса бонуса
type DailyBonusStatus = {
  canClaim: boolean;
  streak: number;
  bonusAmount: number;
}

// Типы для результата клейма бонуса
type ClaimBonusResult = {
  success: boolean;
  message: string;
  amount?: number;
  streak?: number;
}

const DailyBonusCard: React.FC = () => {
  // Получаем доступ к toast для уведомлений
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Состояние для анимаций и эффектов
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [reward, setReward] = useState('');
  
  // Получаем статус ежедневного бонуса
  const { data: bonusStatus, isLoading } = useQuery<DailyBonusStatus>({
    queryKey: ['/api/daily-bonus/status'],
    queryFn: async () => {
      const result = await apiRequest('/api/daily-bonus/status?user_id=1');
      return result as DailyBonusStatus;
    }
  });
  
  // Получаем значение стрика (серии дней) из данных API или показываем 0
  const streak = bonusStatus?.streak || 0;
  
  // Мутация для получения ежедневного бонуса
  const claimBonusMutation = useMutation<ClaimBonusResult, Error>({
    mutationFn: async () => {
      const result = await apiRequest('/api/daily-bonus/claim', {
        method: 'POST',
        json: { user_id: 1 } // Временно используем ID = 1
      });
      return result as ClaimBonusResult;
    },
    onSuccess: (data) => {
      if (data.success) {
        // Показываем анимацию с конфетти
        setShowConfetti(true);
        setReward(`${data.amount} UNI`);
        
        // Обновляем данные о статусе бонуса
        queryClient.invalidateQueries({ queryKey: ['/api/daily-bonus/status'] });
        
        // Скрываем конфетти через 4 секунды
        setTimeout(() => {
          setShowConfetti(false);
          setReward('');
        }, 4000);
        
        // Показываем уведомление
        toast({
          title: "Успех!",
          description: data.message,
        });
      } else {
        // Показываем уведомление об ошибке
        toast({
          title: "Ошибка",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось получить бонус. Попробуйте позже.",
        variant: "destructive",
      });
    },
  });
  
  // Создаем частицы-конфетти (только визуальный эффект)
  const confettiParticles = Array(20).fill(0).map((_, i) => ({
    id: i,
    size: Math.random() * 6 + 4,
    x: Math.random() * 90 + 5,
    y: -10 - Math.random() * 20,
    color: i % 3 === 0 ? '#A259FF' : (i % 3 === 1 ? '#00FF99' : '#B368F7'),
    velocity: {
      x: (Math.random() - 0.5) * 4,
      y: 5 + Math.random() * 3
    },
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 8
  }));
  
  // Обработка нажатия на кнопку получения бонуса
  const handleClaimBonus = () => {
    if (bonusStatus?.canClaim) {
      claimBonusMutation.mutate();
    } else {
      // Если бонус уже получен, показываем уведомление
      toast({
        title: "Уже получено",
        description: "Вы уже получили бонус сегодня. Возвращайтесь завтра!",
      });
    }
  };
  
  // Анимировать индикаторы дней
  const [animateDayIndicator, setAnimateDayIndicator] = useState<number | null>(null);
  
  useEffect(() => {
    if (showConfetti) {
      // Поочередно анимируем индикаторы дней
      for (let i = 0; i < 7; i++) {
        setTimeout(() => {
          setAnimateDayIndicator(i);
          
          // Убираем анимацию через короткое время
          setTimeout(() => {
            if (i === 6) {
              setAnimateDayIndicator(null);
            }
          }, 300);
        }, i * 150);
      }
    }
  }, [showConfetti]);
  
  // Если данные загружаются, показываем скелетон
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 mb-5 shadow-lg">
        <Skeleton className="h-6 w-1/3 mb-2" />
        <Skeleton className="h-4 w-full mb-4" />
        <div className="flex justify-between mb-4">
          {Array(7).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }
  
  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-lg card-hover-effect relative overflow-hidden">
      {/* Фоновые декоративные элементы */}
      <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary/5 rounded-full blur-xl"></div>
      <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-primary/5 rounded-full blur-xl"></div>
      
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-md font-medium">Check-in</h2>
        <div className="flex items-center">
          <span className="text-xs text-foreground opacity-70 mr-2">Серия: </span>
          <span className="text-sm font-medium text-primary">{streak} дн.</span>
        </div>
      </div>
      
      <p className="text-xs text-foreground opacity-70 mb-4">
        Возвращайся каждый день, чтобы собирать бонусы!
      </p>
      
      {/* Дни недели */}
      <div className="flex justify-between mb-4">
        {Array(7).fill(0).map((_, index) => {
          const isActive = index < streak;
          const isAnimating = animateDayIndicator === index;
          
          return (
            <div 
              key={index} 
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs
                transition-all duration-300
                ${isActive 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-foreground opacity-60'
                }
                ${isAnimating ? 'scale-125' : ''}
              `}
            >
              {index + 1}
            </div>
          );
        })}
      </div>
      
      <button 
        className={`
          w-full py-3 rounded-lg font-medium relative overflow-hidden
          ${isButtonHovered 
            ? 'shadow-lg translate-y-[-2px]' 
            : 'shadow'
          }
          transition-all duration-300
          ${!bonusStatus?.canClaim ? 'opacity-70' : ''}
        `}
        style={{
          background: isButtonHovered 
            ? 'linear-gradient(90deg, #A259FF 0%, #B368F7 100%)' 
            : 'linear-gradient(45deg, #A259FF 0%, #B368F7 100%)'
        }}
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
        onClick={handleClaimBonus}
        disabled={claimBonusMutation.isPending || !bonusStatus?.canClaim}
      >
        {/* Эффект блеска на кнопке при наведении */}
        {isButtonHovered && bonusStatus?.canClaim && (
          <div 
            className="absolute inset-0 w-full h-full" 
            style={{
              background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)',
              transform: 'translateX(-100%)',
              animation: 'shimmer 1.5s infinite'
            }}
          ></div>
        )}
        
        <span className="relative z-10 text-white">
          {claimBonusMutation.isPending ? 'Загрузка...' : 
           bonusStatus?.canClaim ? `Получить ${bonusStatus.bonusAmount} UNI` : 'Уже получено сегодня'}
        </span>
      </button>
      
      {/* Конфетти при получении бонуса */}
      {showConfetti && (
        <>
          {/* Сообщение о награде */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center animate-bounce">
              <div className="text-2xl font-bold text-primary mb-2">
                +{reward}
              </div>
              <div className="text-sm text-white">
                Ежедневный бонус получен!
              </div>
            </div>
          </div>
          
          {/* Конфетти-частицы */}
          {confettiParticles.map((particle) => (
            <div
              key={particle.id}
              className="absolute"
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                backgroundColor: particle.color,
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                transform: `rotate(${particle.rotation}deg)`,
                borderRadius: '2px',
                zIndex: 20,
                animation: `fall 3s forwards`,
                animationTimingFunction: 'ease-out',
                animationDelay: `${particle.id * 0.05}s`,
              }}
            ></div>
          ))}
        </>
      )}
    </div>
  );
};

export default DailyBonusCard;
