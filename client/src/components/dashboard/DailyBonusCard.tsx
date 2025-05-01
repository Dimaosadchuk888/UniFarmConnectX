import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { invalidateQueryWithUserId } from '@/lib/queryClient';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { useUser } from '@/contexts/userContext';

// Типы для статуса бонуса
type DailyBonusStatus = {
  canClaim: boolean;
  streak: number;
  bonusAmount: number;
}

// Типы для результата получения бонуса
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
  const { userId } = useUser(); // Получаем ID пользователя из контекста
  
  // Состояние для анимаций и эффектов
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [reward, setReward] = useState('');
  
  // Запрос на получение статуса ежедневного бонуса
  const { data: bonusStatus, isLoading, refetch } = useQuery({
    queryKey: ['dailyBonusStatus', userId], // Добавляем userId в ключ запроса
    queryFn: async () => {
      try {
        // Исправляем подход к запросу с использованием correctApiRequest
        const endpoint = `/api/daily-bonus/status?user_id=${userId || 1}`;
        console.log('[DailyBonusCard] Запрос статуса бонуса:', endpoint);
        
        const response = await correctApiRequest<{success: boolean, data: DailyBonusStatus}>(endpoint, 'GET');
        
        if (!response.success) {
          throw new Error('Ошибка при получении статуса бонуса');
        }
        
        return response.data as DailyBonusStatus;
      } catch (error: any) {
        console.error('[ERROR] DailyBonusCard - Ошибка при получении статуса бонуса:', error);
        throw new Error(`Ошибка при получении статуса бонуса: ${error.message || 'Неизвестная ошибка'}`);
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !!userId // Запрос активен только если есть userId
  });
  
  // Получаем значение стрика (серии дней) из данных API или показываем 0
  const streak = bonusStatus?.streak || 0;
  
  // Мутация для получения ежедневного бонуса
  const claimBonusMutation = useMutation({
    mutationFn: async () => {
      try {
        // Используем correctApiRequest вместо прямого fetch
        const endpoint = '/api/daily-bonus/claim';
        console.log('[DailyBonusCard] Отправка запроса на получение бонуса:', endpoint);
        
        // Отправляем POST запрос с корректными заголовками
        const response = await correctApiRequest<ClaimBonusResult>(
          endpoint, 
          'POST', 
          { user_id: userId || 1 } // Используем динамический userId
        );
        
        if (!response.success) {
          throw new Error(response.message || 'Ошибка при получении бонуса');
        }
        
        return response;
      } catch (error: any) {
        console.error('[ERROR] DailyBonusCard - Ошибка при получении бонуса:', error);
        throw new Error(`Ошибка при получении бонуса: ${error.message || 'Неизвестная ошибка'}`);
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        // Показываем анимацию с конфетти
        setShowConfetti(true);
        setReward(`${data.amount || bonusStatus?.bonusAmount || 500} UNI`);
        
        // Обновляем данные о статусе бонуса с учетом userId
        invalidateQueryWithUserId('/api/daily-bonus/status');
        
        // Также обновляем данные баланса пользователя и транзакции
        invalidateQueryWithUserId('/api/wallet/balance');
        invalidateQueryWithUserId('/api/transactions');
        
        // Скрываем конфетти через 4 секунды
        setTimeout(() => {
          setShowConfetti(false);
          setReward('');
        }, 4000);
        
        // Показываем уведомление
        toast({
          title: "Бонус получен!",
          description: data.message || "Ежедневный бонус успешно зачислен.",
        });
      } else {
        // Показываем уведомление об ошибке
        toast({
          title: "Ошибка",
          description: data.message || "Не удалось получить бонус.",
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
  
  // Обработка нажатия на кнопку получения бонуса
  const handleClaimBonus = () => {
    if (bonusStatus?.canClaim) {
      claimBonusMutation.mutate();
    } else {
      // Если бонус уже получен, показываем уведомление
      toast({
        title: "Бонус уже получен",
        description: "Вы уже получили бонус сегодня. Возвращайтесь завтра!",
      });
    }
  };
  
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
  
  // Проверяем статус бонуса каждую полночь
  useEffect(() => {
    // Функция для получения миллисекунд до полуночи
    const getMsUntilMidnight = () => {
      const now = new Date();
      const midnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 0
      );
      return midnight.getTime() - now.getTime();
    };
    
    // Функция для обновления бонуса после полуночи
    const scheduleRefresh = () => {
      const msUntilMidnight = getMsUntilMidnight();
      
      const timerId = setTimeout(() => {
        refetch();
        scheduleRefresh(); // Запускаем снова для следующего дня
      }, msUntilMidnight);
      
      return timerId;
    };
    
    const timerId = scheduleRefresh();
    
    return () => {
      clearTimeout(timerId);
    };
  }, [refetch]);
  
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
          ${isButtonHovered && bonusStatus?.canClaim
            ? 'shadow-lg translate-y-[-2px]' 
            : 'shadow'
          }
          transition-all duration-300
          ${!bonusStatus?.canClaim ? 'opacity-70 cursor-not-allowed' : ''}
        `}
        style={{
          background: bonusStatus?.canClaim
            ? (isButtonHovered 
                ? 'linear-gradient(90deg, #A259FF 0%, #B368F7 100%)' 
                : 'linear-gradient(45deg, #A259FF 0%, #B368F7 100%)')
            : 'linear-gradient(45deg, #666666, #888888)'
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
          {claimBonusMutation.isPending 
            ? 'Загрузка...' 
            : bonusStatus?.canClaim 
              ? `Получить ${bonusStatus.bonusAmount} UNI` 
              : 'Уже получено сегодня'}
        </span>
      </button>
      
      {/* Конфетти при получении бонуса */}
      {showConfetti && (
        <>
          {/* Сообщение о награде */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
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
