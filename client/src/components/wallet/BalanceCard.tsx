import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/contexts/userContext';
import useWebSocket from '@/hooks/useWebSocket';
import { useNotification } from '@/contexts/notificationContext';
import { 
  formatUniNumber, 
  formatTonNumber, 
  getUSDEquivalent 
} from '@/utils/formatters';

/**
 * Компонент для отображения баланса пользователя
 * Использует userContext для получения данных пользователя и баланса
 */
const BalanceCard: React.FC = () => {
  // Получаем данные пользователя и баланса из контекста
  const { 
    userId,
    uniBalance, 
    tonBalance, 
    uniFarmingActive, 
    uniDepositAmount, 
    uniFarmingBalance,
    refreshBalance,
    isBalanceFetching
  } = useUser();
  
  // Получаем доступ к системе уведомлений
  const { showNotification } = useNotification();
  
  // Состояния для визуальных эффектов
  const [uniAnimating, setUniAnimating] = useState<boolean>(false);
  const [tonAnimating, setTonAnimating] = useState<boolean>(false);
  
  // Состояния для текущего прироста (получаем из API)
  const [uniRate, setUniRate] = useState<number>(0);
  const [tonRate, setTonRate] = useState<number>(0);
  
  // Статус WebSocket подключения
  const [wsStatus, setWsStatus] = useState<string>('Подключение...');
  
  // Предыдущее значение баланса для отслеживания изменений
  const [prevUniBalance, setPrevUniBalance] = useState<number>(0);
  const [prevTonBalance, setPrevTonBalance] = useState<number>(0);
  
  // Храним состояние для отслеживания показанных уведомлений, чтобы не показывать слишком часто
  const [wsErrorNotificationShown, setWsErrorNotificationShown] = useState<boolean>(false);
  const [wsConnectedOnce, setWsConnectedOnce] = useState<boolean>(false);
  
  // Используем WebSocket хук для обновления в реальном времени
  const { isConnected, subscribeToUserUpdates, errorCount, forceReconnect } = useWebSocket({
    onOpen: () => {
      setWsStatus('Соединение установлено');
      setWsConnectedOnce(true);
      setWsErrorNotificationShown(false); // Сбрасываем флаг показа ошибок при успешном подключении
      
      // Показываем уведомление о подключении только один раз
      if (!wsConnectedOnce) {
        showNotification('success', {
          message: 'WebSocket соединение установлено',
          duration: 3000
        });
      }
      
      // Подписываемся на обновления для пользователя, если userId доступен
      if (userId) {
        subscribeToUserUpdates(userId);
      }
    },
    onMessage: (data) => {
      // Обрабатываем сообщения от сервера
      if (data.type === 'update' && data.balanceData) {
        // Обновляем баланс через контекст
        refreshBalance();
        
        // Устанавливаем анимации для визуального эффекта
        setUniAnimating(true);
        setTimeout(() => setUniAnimating(false), 800);
        
        setTonAnimating(true);
        setTimeout(() => setTonAnimating(false), 800);
        
        // Показываем уведомление об обновлении баланса
        showNotification('info', {
          message: 'Баланс обновлен',
          duration: 2000
        });
      }
    },
    onClose: () => {
      setWsStatus('Соединение закрыто');
      
      // Не показываем уведомления о закрытии соединения, если оно уже показано
      // или если соединение никогда не устанавливалось (чтобы избежать спама)
      if (!wsErrorNotificationShown && wsConnectedOnce) {
        setWsErrorNotificationShown(true);
        showNotification('error', {
          message: 'WebSocket соединение закрыто',
          duration: 3000
        });
      }
    },
    onError: () => {
      setWsStatus('Ошибка соединения');
      
      // Показываем уведомление об ошибке только один раз
      if (!wsErrorNotificationShown) {
        setWsErrorNotificationShown(true);
        showNotification('error', {
          message: 'Ошибка WebSocket соединения',
          duration: 3000
        });
      }
    },
    reconnectInterval: 2000 // Интервал переподключения в миллисекундах
  });
  
  // Функция для обновления баланса UNI с анимацией
  const updateUniBalanceWithAnimation = useCallback((newValue: number, oldValue: number) => {
    if (newValue !== oldValue) {
      setUniAnimating(true);
      setTimeout(() => setUniAnimating(false), 800);
    }
  }, []);
  
  // Отслеживаем изменения балансов для анимаций
  useEffect(() => {
    if (prevUniBalance !== uniBalance) {
      updateUniBalanceWithAnimation(uniBalance, prevUniBalance);
      setPrevUniBalance(uniBalance);
      
      // Если баланс увеличился, показываем уведомление
      if (uniBalance > prevUniBalance && prevUniBalance !== 0) {
        const increase = uniBalance - prevUniBalance;
        showNotification('success', {
          message: `Получено ${increase.toFixed(8)} UNI`,
          duration: 3000
        });
      }
    }
  }, [uniBalance, prevUniBalance, updateUniBalanceWithAnimation, showNotification]);
  
  useEffect(() => {
    if (prevTonBalance !== tonBalance) {
      setTonAnimating(true);
      setTimeout(() => setTonAnimating(false), 800);
      setPrevTonBalance(tonBalance);
      
      // Если баланс TON увеличился, показываем уведомление
      if (tonBalance > prevTonBalance && prevTonBalance !== 0) {
        const increase = tonBalance - prevTonBalance;
        showNotification('success', {
          message: `Получено ${increase.toFixed(5)} TON`,
          duration: 3000
        });
      }
    }
  }, [tonBalance, prevTonBalance, showNotification]);
  
  // Автоматически запрашиваем обновление баланса каждые 10 секунд
  // Обратите внимание: в userContext уже есть автообновление, 
  // поэтому интервал может быть больше
  useEffect(() => {
    // Начальное обновление при монтировании
    try {
      refreshBalance();
    } catch (error) {
      // Обработка ошибки при начальной загрузке баланса
      showNotification('error', {
        message: 'Не удалось загрузить данные кошелька',
        duration: 4000
      });
    }
    
    const interval = setInterval(() => {
      try {
        refreshBalance();
      } catch (error) {
        // Обработка ошибки при автоматическом обновлении баланса
        showNotification('error', {
          message: 'Ошибка обновления баланса',
          duration: 3000
        });
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [refreshBalance, showNotification]);
  
  // Устанавливаем значение скорости фарминга на основе суммы депозита и общей ставки
  useEffect(() => {
    // Примерная скорость: 0.000000289351851800 per second (из общего описания проекта)
    const estimatedRate = 0.000000289351851800 * uniDepositAmount;
    setUniRate(estimatedRate);
  }, [uniDepositAmount]);

  // Форматирование скорости начисления доходов
  const formatRateNumber = (rate: number): JSX.Element => {
    if (rate > 0.001) {
      // Для ставок больше 0.001 показываем до 5 знаков
      return (
        <span>
          +{formatTonNumber(rate)}
        </span>
      );
    } else if (rate > 0) {
      // Для очень маленьких ставок показываем до 7 знаков уменьшенным шрифтом
      return (
        <span className="text-[0.7em] text-opacity-80">
          +{formatUniNumber(rate, 7)}
        </span>
      );
    } else {
      // Для нулевых ставок
      return <span>+0.00000</span>;
    }
  };

  return (
    <div className="bg-card rounded-xl p-5 mb-5 shadow-lg overflow-hidden relative">
      {/* Декоративный градиентный фон */}
      <div 
        className="absolute inset-0 opacity-20" 
        style={{
          background: 'radial-gradient(circle at 10% 20%, rgba(162, 89, 255, 0.2) 0%, transparent 70%), radial-gradient(circle at 80% 70%, rgba(92, 120, 255, 0.2) 0%, transparent 70%)'
        }}
      ></div>
      
      {/* Неоновая рамка */}
      <div className="absolute inset-0 rounded-xl border border-primary/30"></div>
      
      <h2 className="text-lg font-semibold text-white mb-4 relative z-10 flex items-center justify-between">
        <div className="flex items-center">
          <i className="fas fa-wallet text-primary mr-2"></i>
          Ваш баланс
        </div>
        <button 
          onClick={() => {
            // Показываем уведомление о процессе обновления баланса
            showNotification('loading', {
              message: 'Обновление баланса...',
              duration: 1500
            });
            
            try {
              // Обновляем баланс через контекст
              refreshBalance();
              
              // Устанавливаем таймер на показ уведомления об успешном обновлении
              // (таймаут нужен чтобы дать время на запрос)
              setTimeout(() => {
                showNotification('success', {
                  message: 'Баланс успешно обновлён',
                  duration: 2000
                });
              }, 1000);
            } catch (err) {
              // Уведомление об ошибке
              const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
              showNotification('error', {
                message: `Не удалось обновить баланс: ${errorMessage}`,
                duration: 3000
              });
            }
            
            // Анимируем обновление UNI и TON
            setUniAnimating(true);
            setTimeout(() => setUniAnimating(false), 800);
            
            setTonAnimating(true);
            setTimeout(() => setTonAnimating(false), 800);
          }}
          className="text-sm text-gray-400 hover:text-primary transition-colors"
          disabled={isBalanceFetching}
          title="Обновить баланс"
        >
          <i className={`fas fa-sync-alt ${isBalanceFetching ? 'animate-spin' : ''}`}></i>
        </button>
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* UNI Token */}
        <div className="bg-black/20 rounded-lg p-4 backdrop-blur-sm relative overflow-hidden">
          {/* Декоративный слой */}
          <div className="absolute inset-0 opacity-20">
            <div 
              className="w-24 h-24 rounded-full absolute -right-8 -top-8 blur-xl"
              style={{ background: 'linear-gradient(45deg, #A259FF, #5945FA)' }}
            ></div>
          </div>
          
          {/* Заголовок токена */}
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
              <i className="fas fa-coins text-primary"></i>
            </div>
            <div>
              <h3 className="text-md font-medium text-white">UNI Token</h3>
              <p className="text-xs text-gray-400">внутренний токен</p>
            </div>
          </div>
          
          {/* Баланс с анимацией */}
          <div className="mb-2">
            <div className="text-2xl font-bold text-white flex items-center">
              <span className={`transition-all duration-300 ${uniAnimating ? 'text-green-400 scale-105' : ''}`}>
                {formatUniNumber(uniBalance)}
              </span>
              <span className="text-sm ml-1 text-gray-400">UNI</span>
            </div>
            <div className="text-xs text-gray-400">
              {getUSDEquivalent(uniBalance, 'UNI')}
            </div>
          </div>
          
          {/* Скорость начисления */}
          <div className="bg-success/10 text-success rounded-md px-2 py-1 mt-3 text-xs inline-flex items-center">
            <i className="fas fa-arrow-trend-up mr-1"></i>
            <span className={uniAnimating ? 'text-green-400 font-bold' : ''}>
              {formatRateNumber(uniRate)}
            </span>
            <span className="text-gray-400 ml-1">UNI / сек</span>
          </div>
          
          {/* WebSocket статус */}
          <div className="mt-2 text-xs text-gray-500/50">
            <div className="flex items-center justify-between">
              <div>
                WebSocket: 
                <span className={`ml-1 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? 'Подключено' : wsStatus}
                </span>
              </div>
              
              {/* Кнопка повторного подключения, если соединение в ошибке */}
              {errorCount > 0 && (
                <button 
                  onClick={() => {
                    showNotification('loading', {
                      message: 'Переподключение...',
                      duration: 2000
                    });
                    forceReconnect();
                  }}
                  className="text-blue-400 hover:text-blue-300 transition-colors text-xs flex items-center"
                  title="Переподключиться к WebSocket"
                >
                  <i className="fas fa-redo-alt mr-1"></i>
                  Переподключиться
                </button>
              )}
            </div>
            
            {uniFarmingActive && (
              <div className="text-green-400">• Фарминг активен</div>
            )}
            
            {uniDepositAmount > 0 && (
              <div className="text-gray-400">
                Депозит в фарминге: {formatUniNumber(uniDepositAmount)} UNI
              </div>
            )}
            
            {/* Статус ошибок WebSocket */}
            {errorCount > 0 && (
              <div className="text-yellow-400 mt-1">
                <i className="fas fa-exclamation-triangle mr-1 text-yellow-400"></i>
                Проблемы соединения: {errorCount} {errorCount === 1 ? 'ошибка' : 'ошибки'}
              </div>
            )}
            
            {/* Инструкция по обновлению при отсутствии WebSocket */}
            {!isConnected && wsErrorNotificationShown && (
              <div className="mt-2 bg-blue-500/10 text-blue-100 rounded-md px-2 py-1.5 text-xs">
                <i className="fas fa-info-circle mr-1 text-blue-300"></i>
                Соединение прервано. Используйте кнопку обновления для ручного обновления баланса или нажмите "Переподключиться".
              </div>
            )}
          </div>
        </div>
        
        {/* TON Token */}
        <div className="bg-black/20 rounded-lg p-4 backdrop-blur-sm relative overflow-hidden">
          {/* Декоративный слой */}
          <div className="absolute inset-0 opacity-20">
            <div 
              className="w-24 h-24 rounded-full absolute -right-8 -top-8 blur-xl"
              style={{ background: 'linear-gradient(45deg, #3C86FF, #63B4FF)' }}
            ></div>
          </div>
          
          {/* Заголовок токена */}
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-2">
              <i className="fas fa-diamond text-blue-500"></i>
            </div>
            <div>
              <h3 className="text-md font-medium text-white">TON Token</h3>
              <p className="text-xs text-gray-400">блокчейн TON</p>
            </div>
          </div>
          
          {/* Баланс с расширенной анимацией */}
          <div className="mb-2">
            <div className={`relative ${tonAnimating ? 'before:absolute before:inset-0 before:bg-blue-500/5 before:rounded-md before:animate-pulse' : ''}`}>
              <div className="text-2xl font-bold text-white flex items-center relative z-10">
                <span className={`transition-all duration-500 ${
                  tonAnimating 
                    ? 'text-blue-400 scale-105 animate-tonGlow' 
                    : ''
                }`}>
                  {formatTonNumber(tonBalance)}
                </span>
                <span className="text-sm ml-1 text-gray-400">TON</span>
                
                {/* Индикатор изменения */}
                {tonAnimating && tonBalance > prevTonBalance && (
                  <span className="text-xs ml-2 text-blue-400 animate-fade-up absolute -top-3 right-0">
                    <i className="fas fa-caret-up mr-1"></i>
                    +{formatTonNumber(tonBalance - prevTonBalance)}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {getUSDEquivalent(tonBalance, 'TON')}
              </div>
            </div>
            
            {/* Доход TON отображается только если больше 0 */}
            {tonRate > 0 && (
              <div className="bg-blue-500/10 text-blue-500 rounded-md px-2 py-1 mt-3 text-xs inline-flex items-center">
                <i className="fas fa-arrow-trend-up mr-1"></i>
                <span className={tonAnimating ? 'text-blue-400 font-bold' : ''}>
                  {formatRateNumber(tonRate)}
                </span>
                <span className="text-gray-400 ml-1">TON / сек</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceCard;