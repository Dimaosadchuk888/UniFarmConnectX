import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [prevUniBalance, setPrevUniBalance] = useState<number | null>(null);
  const [prevTonBalance, setPrevTonBalance] = useState<number | null>(null);
  
  // Храним состояние для отслеживания показанных уведомлений
  const [wsErrorNotificationShown, setWsErrorNotificationShown] = useState<boolean>(false);
  const [wsConnectedOnce, setWsConnectedOnce] = useState<boolean>(false);
  
  // Используем ref для отслеживания состояния подписки и дополнительных флагов
  const isSubscribedRef = useRef<boolean>(false);
  const initialLoadedRef = useRef<boolean>(false);
  
  // ===== WebSocket обработчики =====
  
  // Обработчик открытия соединения
  const handleOpen = useCallback((event: Event) => {
    console.log('[BalanceCard] WebSocket connection opened', event);
    setWsStatus('Соединение установлено');
    setWsConnectedOnce(true);
    setWsErrorNotificationShown(false);
    
    if (!wsConnectedOnce) {
      showNotification('success', {
        message: 'WebSocket соединение установлено',
        duration: 3000
      });
    }
  }, [showNotification, wsConnectedOnce]);
  
  // Обработчик получения сообщения
  const handleMessage = useCallback((data: any) => {
    console.log('[BalanceCard] WebSocket message received', data);
    
    if (data.type === 'update' && data.balanceData) {
      if (userId) {
        refreshBalance();
      }
      
      setUniAnimating(true);
      setTimeout(() => setUniAnimating(false), 800);
      
      setTonAnimating(true);
      setTimeout(() => setTonAnimating(false), 800);
      
      showNotification('info', {
        message: 'Баланс обновлен',
        duration: 2000
      });
    }
  }, [userId, refreshBalance, showNotification]);
  
  // Обработчик закрытия соединения
  const handleClose = useCallback((event: CloseEvent) => {
    console.log('[BalanceCard] WebSocket connection closed', event);
    setWsStatus('Соединение закрыто');
    isSubscribedRef.current = false;
    
    if (!wsErrorNotificationShown && wsConnectedOnce) {
      setWsErrorNotificationShown(true);
      showNotification('error', {
        message: 'WebSocket соединение закрыто',
        duration: 3000
      });
    }
  }, [wsErrorNotificationShown, wsConnectedOnce, showNotification]);
  
  // Обработчик ошибки соединения
  const handleError = useCallback((event: Event) => {
    console.error('[BalanceCard] WebSocket error', event);
    setWsStatus('Ошибка соединения');
    isSubscribedRef.current = false;
    
    if (!wsErrorNotificationShown) {
      setWsErrorNotificationShown(true);
      showNotification('error', {
        message: 'Ошибка WebSocket соединения',
        duration: 3000
      });
    }
  }, [wsErrorNotificationShown, showNotification]);
  
  // Инициализируем WebSocket соединение
  const { 
    isConnected,
    subscribeToUserUpdates,
    errorCount, 
    forceReconnect 
  } = useWebSocket({
    onOpen: handleOpen,
    onMessage: handleMessage,
    onClose: handleClose,
    onError: handleError,
    reconnectInterval: 3000
  });
  
  // ===== Эффекты и обработчики =====
  
  // Подписываемся на обновления пользователя
  useEffect(() => {
    if (!userId || !isConnected || !subscribeToUserUpdates || isSubscribedRef.current) {
      return;
    }
    
    console.log('[BalanceCard] Subscribing to user updates', userId);
    
    // Небольшая задержка перед подпиской для стабильности
    const timeoutId = setTimeout(() => {
      try {
        const success = subscribeToUserUpdates(userId);
        if (success) {
          console.log('[BalanceCard] Successfully subscribed to user updates');
          isSubscribedRef.current = true;
        } else {
          console.warn('[BalanceCard] Failed to subscribe to user updates');
        }
      } catch (error) {
        console.error('[BalanceCard] Error subscribing to user updates', error);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [userId, isConnected, subscribeToUserUpdates]);
  
  // Сбрасываем флаг подписки при потере соединения
  useEffect(() => {
    if (!isConnected) {
      isSubscribedRef.current = false;
    }
  }, [isConnected]);
  
  // Отслеживаем изменения баланса UNI
  useEffect(() => {
    // Инициализируем предыдущее значение баланса при первой загрузке
    if (prevUniBalance === null && uniBalance !== undefined) {
      setPrevUniBalance(uniBalance);
      return;
    }
    
    // Проверяем, изменился ли баланс
    if (prevUniBalance !== null && uniBalance !== prevUniBalance) {
      console.log('[BalanceCard] UNI balance changed', { prev: prevUniBalance, current: uniBalance });
      
      // Включаем анимацию
      setUniAnimating(true);
      setTimeout(() => setUniAnimating(false), 800);
      
      // Показываем уведомление об увеличении баланса
      if (uniBalance > prevUniBalance && initialLoadedRef.current) {
        const increase = uniBalance - prevUniBalance;
        showNotification('success', {
          message: `Получено ${increase.toFixed(8)} UNI`,
          duration: 3000
        });
      }
      
      // Обновляем предыдущее значение баланса
      setPrevUniBalance(uniBalance);
    }
  }, [uniBalance, prevUniBalance, showNotification]);
  
  // Отслеживаем изменения баланса TON
  useEffect(() => {
    // Инициализируем предыдущее значение баланса при первой загрузке
    if (prevTonBalance === null && tonBalance !== undefined) {
      setPrevTonBalance(tonBalance);
      return;
    }
    
    // Проверяем, изменился ли баланс
    if (prevTonBalance !== null && tonBalance !== prevTonBalance) {
      console.log('[BalanceCard] TON balance changed', { prev: prevTonBalance, current: tonBalance });
      
      // Включаем анимацию
      setTonAnimating(true);
      setTimeout(() => setTonAnimating(false), 800);
      
      // Показываем уведомление об увеличении баланса
      if (tonBalance > prevTonBalance && initialLoadedRef.current) {
        const increase = tonBalance - prevTonBalance;
        showNotification('success', {
          message: `Получено ${increase.toFixed(5)} TON`,
          duration: 3000
        });
      }
      
      // Обновляем предыдущее значение баланса
      setPrevTonBalance(tonBalance);
    }
  }, [tonBalance, prevTonBalance, showNotification]);
  
  // Периодическое обновление баланса как запасной вариант
  useEffect(() => {
    if (!userId) return;
    
    // Начальная загрузка баланса после небольшой задержки
    const initialTimeout = setTimeout(() => {
      try {
        console.log('[BalanceCard] Initial balance refresh');
        refreshBalance();
        // После первой загрузки устанавливаем флаг, чтобы показывать уведомления
        initialLoadedRef.current = true;
      } catch (error) {
        console.error('[BalanceCard] Error refreshing balance initially', error);
        showNotification('error', {
          message: 'Не удалось загрузить данные кошелька',
          duration: 4000
        });
      }
    }, 1500);
    
    // Периодическое обновление (резервный вариант)
    const interval = setInterval(() => {
      if (!isBalanceFetching) {
        try {
          console.log('[BalanceCard] Periodic balance refresh');
          refreshBalance();
        } catch (error) {
          console.error('[BalanceCard] Error in periodic balance refresh', error);
        }
      }
    }, 30000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [userId, refreshBalance, showNotification, isBalanceFetching]);
  
  // Расчет скорости фарминга
  useEffect(() => {
    if (uniDepositAmount !== undefined) {
      // Примерная скорость фарминга
      const estimatedRate = 0.000000289351851800 * uniDepositAmount;
      setUniRate(estimatedRate);
    }
  }, [uniDepositAmount]);
  
  // ===== Вспомогательные функции =====
  
  // Форматирование скорости начисления доходов
  const formatRateNumber = useCallback((rate: number): JSX.Element => {
    if (rate > 0.001) {
      // Для ставок больше 0.001 показываем до 5 знаков
      return <span>+{formatTonNumber(rate)}</span>;
    } else if (rate > 0) {
      // Для очень маленьких ставок показываем до 7 знаков уменьшенным шрифтом
      return <span className="text-[0.7em] text-opacity-80">+{formatUniNumber(rate, 7)}</span>;
    } else {
      // Для нулевых ставок
      return <span>+0.00000</span>;
    }
  }, []);
  
  // Обработчик ручного обновления баланса
  const handleManualRefresh = useCallback(() => {
    // Проверка, что не выполняется другое обновление
    if (isBalanceFetching) return;
    
    showNotification('loading', {
      message: 'Обновление баланса...',
      duration: 1500
    });
    
    try {
      refreshBalance();
      
      // Показываем уведомление об успешном обновлении с задержкой
      setTimeout(() => {
        showNotification('success', {
          message: 'Баланс успешно обновлён',
          duration: 2000
        });
      }, 1000);
      
      // Анимация обновления
      setUniAnimating(true);
      setTimeout(() => setUniAnimating(false), 800);
      
      setTonAnimating(true);
      setTimeout(() => setTonAnimating(false), 800);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      showNotification('error', {
        message: `Не удалось обновить баланс: ${errorMessage}`,
        duration: 3000
      });
    }
  }, [refreshBalance, showNotification, isBalanceFetching]);
  
  // Обработчик переподключения WebSocket
  const handleReconnect = useCallback(() => {
    showNotification('loading', {
      message: 'Переподключение...',
      duration: 2000
    });
    
    // Сбрасываем флаг подписки перед переподключением
    isSubscribedRef.current = false;
    forceReconnect();
  }, [forceReconnect, showNotification]);

  // ===== Рендеринг компонента =====
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
          onClick={handleManualRefresh}
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
                  onClick={handleReconnect}
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
                Ошибок соединения: {errorCount}
              </div>
            )}
            
            {/* Кеширование для оффлайн работы */}
            {!isConnected && wsErrorNotificationShown && (
              <div className="mt-2 bg-blue-500/10 text-blue-100 rounded-md px-2 py-1.5 text-xs">
                <i className="fas fa-info-circle mr-1 text-blue-300"></i>
                Кэшированные данные могут быть не актуальными
              </div>
            )}
          </div>
          
          {/* Фарминг-баланс, если активен */}
          {uniFarmingActive && (
            <div className="mt-4 border-t border-gray-700/30 pt-3">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Баланс фарминга:</span>
                <span className="text-white">{formatUniNumber(uniFarmingBalance)} UNI</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-400">Доходность:</span>
                <span className="text-success">
                  ~{formatRateNumber(uniRate * 86400)} UNI/день
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* TON Token */}
        <div className="bg-black/20 rounded-lg p-4 backdrop-blur-sm relative overflow-hidden">
          {/* Декоративный слой */}
          <div className="absolute inset-0 opacity-20">
            <div 
              className="w-24 h-24 rounded-full absolute -right-8 -top-8 blur-xl"
              style={{ background: 'linear-gradient(45deg, #0088CC, #29B8FF)' }}
            ></div>
          </div>
          
          {/* Заголовок токена */}
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-2">
              <i className="fas fa-gem text-blue-500"></i>
            </div>
            <div>
              <h3 className="text-md font-medium text-white">TON</h3>
              <p className="text-xs text-gray-400">нативный токен блокчейна</p>
            </div>
          </div>
          
          {/* Баланс с анимацией */}
          <div className="mb-2">
            <div className="text-2xl font-bold text-white flex items-center">
              <span className={`transition-all duration-300 ${tonAnimating ? 'text-blue-400 scale-105' : ''}`}>
                {formatTonNumber(tonBalance)}
              </span>
              <span className="text-sm ml-1 text-gray-400">TON</span>
            </div>
            <div className="text-xs text-gray-400">
              {getUSDEquivalent(tonBalance, 'TON')}
            </div>
          </div>
          
          {/* Скорость начисления */}
          <div className="bg-blue-400/10 text-blue-400 rounded-md px-2 py-1 mt-3 text-xs inline-flex items-center">
            <i className="fas fa-arrow-trend-up mr-1"></i>
            <span className={tonAnimating ? 'text-blue-300 font-bold' : ''}>
              {formatRateNumber(tonRate)}
            </span>
            <span className="text-gray-400 ml-1">TON / сек</span>
          </div>
          
          {/* Дополнительная информация для TON */}
          <div className="mt-4 border-t border-gray-700/30 pt-3 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Доступно для вывода:</span>
              <span className="text-white">{formatTonNumber(tonBalance)} TON</span>
            </div>
            
            <div className="flex items-center mt-3">
              <i className="fas fa-info-circle mr-2 text-blue-400"></i>
              <span>Выводы в сеть TON доступны в разделе Вывод</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Информационная панель внизу */}
      <div className="mt-4 text-xs text-gray-500 border-t border-gray-700/30 pt-3">
        <div className="flex justify-between">
          <span>Последнее обновление: {new Date().toLocaleTimeString()}</span>
          {isBalanceFetching && (
            <span className="text-gray-400 flex items-center">
              <i className="fas fa-circle-notch animate-spin mr-1"></i>
              Обновление...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BalanceCard;