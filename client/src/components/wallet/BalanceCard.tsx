import React, { useState, useCallback, useRef } from 'react';
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
 * Исправленная версия без автоматических обновлений через useEffect
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
    refreshUserData,
    isBalanceFetching
  } = useUser();
  
  // Получаем доступ к системе уведомлений
  const { showNotification } = useNotification();
  
  // Состояния для визуальных эффектов
  const [uniAnimating, setUniAnimating] = useState<boolean>(false);
  const [tonAnimating, setTonAnimating] = useState<boolean>(false);
  
  // Состояния для текущего прироста (получаем из API)
  const [uniRate, setUniRate] = useState<number>(0);
  
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
        // НЕ вызываем refreshBalance() автоматически, чтобы избежать циклов
        // Просто показываем уведомление о необходимости обновления
        showNotification('info', {
          message: 'Доступно обновление баланса',
          duration: 3000
        });
      }
    }
  }, [userId, showNotification]);
  
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
  
  // Ручная подписка на обновления пользователя
  const handleSubscribe = useCallback(() => {
    if (!userId || !isConnected || !subscribeToUserUpdates || isSubscribedRef.current) {
      return;
    }
    
    console.log('[BalanceCard] Manually subscribing to user updates', userId);
    
    try {
      const success = subscribeToUserUpdates(userId);
      if (success) {
        console.log('[BalanceCard] Successfully subscribed to user updates');
        isSubscribedRef.current = true;
        showNotification('success', {
          message: 'Подписка на обновления активирована',
          duration: 2000
        });
      } else {
        console.warn('[BalanceCard] Failed to subscribe to user updates');
        showNotification('error', {
          message: 'Не удалось подписаться на обновления',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('[BalanceCard] Error subscribing to user updates', error);
      showNotification('error', {
        message: 'Ошибка при подписке на обновления',
        duration: 3000
      });
    }
  }, [userId, isConnected, subscribeToUserUpdates, showNotification]);
  
  // Расчет скорости фарминга
  const calculateRate = useCallback(() => {
    if (uniDepositAmount) {
      // Примерная скорость фарминга
      const estimatedRate = 0.000000289351851800 * uniDepositAmount;
      setUniRate(estimatedRate);
    }
  }, [uniDepositAmount]);
  
  // Инициализация баланса при первой загрузке
  React.useEffect(() => {
    // Делаем только один раз при первой загрузке компонента
    if (!initialLoadedRef.current && userId) {
      console.log("[BalanceCard] Начальная инициализация баланса для userId:", userId);
      
      initialLoadedRef.current = true;
      
      // Делаем полное обновление при первом рендере
      refreshBalance();
      
      // Рассчитываем уровень доходности
      calculateRate();
    }
  }, [userId, refreshBalance, calculateRate]);
  
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
      // Обновляем с небольшой задержкой для предотвращения множественных вызовов
      setTimeout(() => {
        // Принудительно обновляем баланс (forceRefresh = true)
        refreshBalance(true);
        
        // Вычисляем уровень доходности после обновления баланса
        calculateRate();
        
        // Показываем уведомление об успешном обновлении
        showNotification('success', {
          message: 'Баланс успешно обновлён',
          duration: 2000
        });
        
        // Анимация обновления
        setUniAnimating(true);
        setTimeout(() => setUniAnimating(false), 800);
        
        setTonAnimating(true);
        setTimeout(() => setTonAnimating(false), 800);
        
        // Устанавливаем предыдущие значения для сравнения
        setPrevUniBalance(uniBalance);
        setPrevTonBalance(tonBalance);
      }, 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      showNotification('error', {
        message: `Не удалось обновить баланс: ${errorMessage}`,
        duration: 3000
      });
    }
  }, [
    refreshBalance, 
    showNotification, 
    isBalanceFetching, 
    uniBalance, 
    tonBalance, 
    calculateRate
  ]);
  
  // Обработчик обновления профиля и баланса
  const handleFullRefresh = useCallback(() => {
    if (isBalanceFetching) return;
    
    showNotification('loading', {
      message: 'Обновление данных...',
      duration: 1500
    });
    
    try {
      // Сначала обновляем данные пользователя
      refreshUserData();
      
      // Затем с небольшой задержкой обновляем баланс
      setTimeout(() => {
        // Принудительно обновляем баланс (forceRefresh = true)
        refreshBalance(true);
        calculateRate();
        
        showNotification('success', {
          message: 'Данные профиля и баланс обновлены',
          duration: 3000
        });
        
        setUniAnimating(true);
        setTimeout(() => setUniAnimating(false), 800);
        
        setTonAnimating(true);
        setTimeout(() => setTonAnimating(false), 800);
      }, 500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      showNotification('error', {
        message: `Не удалось обновить данные: ${errorMessage}`,
        duration: 3000
      });
    }
  }, [
    refreshUserData, 
    refreshBalance, 
    showNotification, 
    isBalanceFetching, 
    calculateRate
  ]);
  
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
        <div className="flex space-x-2">
          <button 
            onClick={handleManualRefresh}
            className="text-sm text-gray-400 hover:text-primary transition-colors"
            disabled={isBalanceFetching}
            title="Обновить баланс"
          >
            <i className={`fas fa-sync-alt ${isBalanceFetching ? 'animate-spin' : ''}`}></i>
          </button>
          
          {/* Добавлен дополнительный вариант для полного обновления */}
          <button 
            onClick={handleFullRefresh}
            className="text-sm text-gray-400 hover:text-primary transition-colors"
            disabled={isBalanceFetching}
            title="Полное обновление данных"
          >
            <i className="fas fa-redo-alt"></i>
          </button>
        </div>
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
              
              {/* Добавлены кнопки для подписки и переподключения */}
              <div className="flex space-x-2">
                {!isSubscribedRef.current && isConnected && (
                  <button 
                    onClick={handleSubscribe}
                    className="text-blue-400 hover:text-blue-300 transition-colors text-xs"
                    title="Подписаться на обновления"
                  >
                    <i className="fas fa-bell mr-1"></i>
                    Подписаться
                  </button>
                )}
                
                {errorCount > 0 && (
                  <button 
                    onClick={handleReconnect}
                    className="text-blue-400 hover:text-blue-300 transition-colors text-xs"
                    title="Переподключиться к WebSocket"
                  >
                    <i className="fas fa-redo-alt mr-1"></i>
                    Переподключиться
                  </button>
                )}
              </div>
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
            
            {/* Кнопка обновления расчета ставки для фарминга */}
            {uniDepositAmount > 0 && (
              <button 
                onClick={calculateRate}
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors"
              >
                <i className="fas fa-calculator mr-1"></i>
                Рассчитать доходность
              </button>
            )}
          </div>
        </div>
        
        {/* TON Balance */}
        <div className="bg-black/20 rounded-lg p-4 backdrop-blur-sm relative overflow-hidden">
          {/* Декоративный слой */}
          <div className="absolute inset-0 opacity-20">
            <div 
              className="w-24 h-24 rounded-full absolute -right-8 -top-8 blur-xl"
              style={{ background: 'linear-gradient(45deg, #0088CC, #00B2FF)' }}
            ></div>
          </div>
          
          {/* Заголовок токена */}
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-2">
              <i className="fas fa-gem text-blue-500"></i>
            </div>
            <div>
              <h3 className="text-md font-medium text-white">TON</h3>
              <p className="text-xs text-gray-400">нативный токен</p>
            </div>
          </div>
          
          {/* Баланс с анимацией */}
          <div className="mb-2">
            <div className="text-2xl font-bold text-white flex items-center">
              <span className={`transition-all duration-300 ${tonAnimating ? 'text-green-400 scale-105' : ''}`}>
                {formatTonNumber(tonBalance)}
              </span>
              <span className="text-sm ml-1 text-gray-400">TON</span>
            </div>
            <div className="text-xs text-gray-400">
              {getUSDEquivalent(tonBalance, 'TON')}
            </div>
          </div>
          
          {/* Дополнительная информация */}
          <div className="mt-4 text-xs">
            <div className="rounded-md bg-blue-900/30 p-2 border border-blue-800/30">
              <p className="text-gray-300 mb-1">
                <i className="fas fa-info-circle mr-2 text-blue-400"></i>
                TON можно вывести на любой кошелек в сети TON.
              </p>
              <p className="text-gray-400">
                Минимальная сумма вывода: 0.05 TON
              </p>
            </div>
          </div>
          
          {/* Фарминг TON */}
          <div className="mt-3 text-xs text-gray-500/70">
            {uniFarmingBalance > 0 && (
              <div>
                Баланс фарминга: {formatUniNumber(uniFarmingBalance)} UNI
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Обновить сейчас - Большая кнопка внизу */}
      <button
        onClick={handleManualRefresh}
        disabled={isBalanceFetching}
        className="w-full mt-4 py-2 bg-gradient-to-r from-primary/80 to-primary/60 hover:from-primary hover:to-primary/80 rounded-md text-white font-medium transition-all duration-300 flex items-center justify-center"
      >
        {isBalanceFetching ? (
          <>
            <i className="fas fa-spinner animate-spin mr-2"></i>
            Обновление...
          </>
        ) : (
          <>
            <i className="fas fa-sync-alt mr-2"></i>
            Обновить сейчас
          </>
        )}
      </button>
    </div>
  );
};

export default BalanceCard;