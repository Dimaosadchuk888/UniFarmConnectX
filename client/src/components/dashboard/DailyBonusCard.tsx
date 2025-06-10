import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { invalidateQueryWithUserId } from '@/lib/queryClient';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { useUser } from '@/contexts/userContext';
import ConfettiEffect from '@/components/ui/ConfettiEffect';

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
        // Используем унифицированный метод correctApiRequest
        const endpoint = `/api/v2/daily-bonus/status?user_id=${userId || 1}`;
        console.log('[DailyBonusCard] Запрос статуса бонуса:', endpoint);

        const response = await correctApiRequest(endpoint, 'GET');

        if (!response.success) {
          throw new Error(response.error || 'Ошибка при получении статуса бонуса');
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
        // Используем унифицированный метод correctApiRequest
        const endpoint = '/api/v2/daily-bonus/claim';
        console.log('[DailyBonusCard] Отправка запроса на получение бонуса:', endpoint);

        // Отправляем POST запрос с корректными заголовками
        const response = await correctApiRequest(
          endpoint, 
          'POST',
          { user_id: userId || 1 } // Используем динамический userId
        );

        if (!response.success) {
          throw new Error(response.error || response.message || 'Ошибка при получении бонуса');
        }

        return response;
      } catch (error: any) {
        console.error('[ERROR] DailyBonusCard - Ошибка при получении бонуса:', error);
        throw new Error(`Ошибка при получении бонуса: ${error.message || 'Неизвестная ошибка'}`);
      }
    },
    onSuccess: (data) => {
      try {
        if (data.success) {
          // Показываем анимацию с конфетти
          setShowConfetti(true);
          setReward(`${data.amount || bonusStatus?.bonusAmount || 500} UNI`);

          // Обновляем данные о статусе бонуса с учетом userId
          invalidateQueryWithUserId('/api/v2/daily-bonus/status');

          // Также обновляем данные баланса пользователя и транзакции
          invalidateQueryWithUserId('/api/v2/wallet/balance');
          invalidateQueryWithUserId('/api/v2/transactions');

          // Скрываем конфетти через 4 секунды
          setTimeout(() => {
            try {
              setShowConfetti(false);
              setReward('');
            } catch (error) {
              console.error('[ERROR] DailyBonusCard - Ошибка при удалении анимации:', error);
            }
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
      } catch (error: any) {
        console.error('[ERROR] DailyBonusCard - Ошибка в onSuccess:', error);
        // Даже при ошибке пытаемся обновить данные интерфейса
        try {
          invalidateQueryWithUserId('/api/v2/daily-bonus/status');
          invalidateQueryWithUserId('/api/v2/wallet/balance');

          // Информируем пользователя
          toast({
            title: "Бонус зачислен, но произошла ошибка",
            description: "Бонус был зачислен, но произошла ошибка отображения. Обновите страницу.",
            variant: "default",
          });
        } catch (err) {
          console.error('[ERROR] DailyBonusCard - Критическая ошибка при восстановлении:', err);
        }
      }
    },
    onError: (error) => {
      try {
        console.error('[ERROR] DailyBonusCard - Ошибка при получении бонуса:', error);

        toast({
          title: "Ошибка",
          description: "Не удалось получить бонус. Попробуйте позже.",
          variant: "destructive",
        });

        // В любом случае обновляем данные
        invalidateQueryWithUserId('/api/v2/daily-bonus/status');
      } catch (err) {
        console.error('[ERROR] DailyBonusCard - Ошибка в обработчике onError:', err);
        // Последняя попытка показать уведомление
        try {
          toast({
            title: "Произошла ошибка",
            description: "Не удалось получить бонус. Проверьте соединение.",
            variant: "destructive",
          });
        } catch {}
      }
    },
  });

  // Обработка нажатия на кнопку получения бонуса
  const handleClaimBonus = () => {
    try {
      if (bonusStatus?.canClaim) {
        claimBonusMutation.mutate();
      } else {
        // Если бонус уже получен, показываем уведомление
        toast({
          title: "Бонус уже получен",
          description: "Вы уже получили бонус сегодня. Возвращайтесь завтра!",
        });
      }
    } catch (error: any) {
      console.error('[ERROR] DailyBonusCard - Ошибка при клике на кнопку получения бонуса:', error);

      // Информируем пользователя о проблеме
      toast({
        title: "Ошибка системы",
        description: "Произошла ошибка при получении бонуса. Попробуйте обновить страницу.",
        variant: "destructive",
      });
    }
  };



  // Анимировать индикаторы дней
  const [animateDayIndicator, setAnimateDayIndicator] = useState<number | null>(null);

  useEffect(() => {
    try {
      if (showConfetti) {
        // Поочередно анимируем индикаторы дней
        for (let i = 0; i < 7; i++) {
          setTimeout(() => {
            try {
              setAnimateDayIndicator(i);

              // Убираем анимацию через короткое время
              setTimeout(() => {
                try {
                  if (i === 6) {
                    setAnimateDayIndicator(null);
                  }
                } catch (error) {
                  console.error('[ERROR] DailyBonusCard - Ошибка при сбросе анимации индикатора:', error);
                }
              }, 300);
            } catch (error) {
              console.error('[ERROR] DailyBonusCard - Ошибка в таймере анимации индикатора:', error);
            }
          }, i * 150);
        }
      }
    } catch (error) {
      console.error('[ERROR] DailyBonusCard - Ошибка при настройке анимации:', error);
    }
  }, [showConfetti]);

  // Проверяем статус бонуса каждую полночь с улучшенной обработкой ошибок
  useEffect(() => {
    let timerId: number | NodeJS.Timeout;

    try {
      // Функция для безопасного получения миллисекунд до полуночи
      const getMsUntilMidnight = (): number => {
        try {
          const now = new Date();

          // Проверка, что мы получили корректный объект Date
          if (!(now instanceof Date) || isNaN(now.getTime())) {
            console.error('[ERROR] DailyBonusCard - Некорректная дата:', now);
            // Возвращаем резервное значение - обновление через 1 час (3600000 мс)
            return 3600000;
          }

          try {
            const midnight = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() + 1,
              0, 0, 0
            );

            // Проверка, что мы создали корректную дату полуночи
            if (!(midnight instanceof Date) || isNaN(midnight.getTime())) {
              console.error('[ERROR] DailyBonusCard - Некорректная дата полуночи:', midnight);
              // Резервное значение
              return 3600000;
            }

            const diff = midnight.getTime() - now.getTime();

            // Проверка, что разница имеет смысл
            if (diff <= 0 || diff > 86400000) { // больше 24 часов быть не должно
              console.error('[ERROR] DailyBonusCard - Некорректная разница времени:', diff);
              // Резервное значение
              return 3600000;
            }

            return diff;
          } catch (dateError) {
            console.error('[ERROR] DailyBonusCard - Ошибка при создании даты полуночи:', dateError);
            // Резервное значение
            return 3600000;
          }
        } catch (error) {
          console.error('[ERROR] DailyBonusCard - Глобальная ошибка в getMsUntilMidnight:', error);
          // Резервное значение при любой ошибке
          return 3600000;
        }
      };

      // Функция для обновления бонуса после полуночи с улучшенной обработкой ошибок
      const scheduleRefresh = () => {
        try {
          const msUntilMidnight = getMsUntilMidnight();
          console.log('[DailyBonusCard] Следующее обновление бонуса через:', msUntilMidnight, 'мс');

          // Устанавливаем безопасный таймаут
          try {
            timerId = setTimeout(() => {
              try {
                // Пытаемся обновить данные
                refetch().catch(err => {
                  console.error('[ERROR] DailyBonusCard - Ошибка при обновлении данных бонуса:', err);
                });

                // Запускаем планирование снова
                scheduleRefresh();
              } catch (refreshError) {
                console.error('[ERROR] DailyBonusCard - Ошибка в таймере обновления бонуса:', refreshError);

                // Пытаемся восстановиться даже при ошибке
                try {
                  scheduleRefresh();
                } catch (recoveryError) {
                  console.error('[ERROR] DailyBonusCard - Критическая ошибка при восстановлении расписания бонуса:', recoveryError);
                }
              }
            }, msUntilMidnight);

            return timerId;
          } catch (timeoutError) {
            console.error('[ERROR] DailyBonusCard - Ошибка при установке таймера:', timeoutError);
            return null;
          }
        } catch (scheduleError) {
          console.error('[ERROR] DailyBonusCard - Ошибка в функции scheduleRefresh:', scheduleError);
          return null;
        }
      };

      // Запускаем планирование
      timerId = scheduleRefresh() || setTimeout(() => {}, 0); // Фиктивный таймер если произошла ошибка
    } catch (globalError) {
      console.error('[ERROR] DailyBonusCard - Критическая ошибка в useEffect для обновления бонуса:', globalError);
      // Создаем фиктивный таймер для корректной очистки
      timerId = setTimeout(() => {}, 0);
    }

    // Функция очистки с защитой от ошибок
    return () => {
      try {
        if (timerId) {
          clearTimeout(timerId);
        }
      } catch (cleanupError) {
        console.error('[ERROR] DailyBonusCard - Ошибка при очистке таймера:', cleanupError);
      }
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
        onMouseEnter={(e) => {
          try {
            setIsButtonHovered(true);
          } catch (error) {
            console.error('[ERROR] DailyBonusCard - Ошибка при обработке onMouseEnter:', error);
          }
        }}
        onMouseLeave={(e) => {
          try {
            setIsButtonHovered(false);
          } catch (error) {
            console.error('[ERROR] DailyBonusCard - Ошибка при обработке onMouseLeave:', error);
          }
        }}
        onClick={(e) => {
          try {
            e.preventDefault();
            handleClaimBonus();
          } catch (error) {
            console.error('[ERROR] DailyBonusCard - Ошибка при обработке onClick:', error);
            // Пытаемся обработать клик даже при ошибке
            try {
              handleClaimBonus();
            } catch (secondError) {
              console.error('[ERROR] DailyBonusCard - Повторная ошибка при обработке клика:', secondError);
            }
          }
        }}
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
      <ConfettiEffect 
        active={showConfetti}
        onComplete={() => setShowConfetti(false)}
        duration={3000}
        colors={['#A259FF', '#B368F7', '#6DBFFF', '#4BEF7C', '#FFD700', '#FF6B6B']}
        particleCount={60}
        spread={45}
        gravity={0.4}
      />

      {/* Сообщение о награде поверх конфетти */}
      {showConfetti && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="text-center animate-bounce">
            <div className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
              +{reward || `${bonusStatus?.bonusAmount || 500} UNI`}
            </div>
            <div className="text-sm text-white drop-shadow-md">
              Ежедневный бонус получен!
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DailyBonusCard;