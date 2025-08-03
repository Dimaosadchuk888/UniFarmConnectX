import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useUser } from '@/contexts/userContext';
import { useWebSocket } from '@/contexts/webSocketContext';
import { useNotification } from '@/contexts/NotificationContext';
import { formatAmount, formatUniNumber, formatTonNumber, getUSDEquivalent } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

/**
 * Компонент карточки баланса согласно UX спецификации
 * Отображает UNI и TON балансы с правильными градиентами и визуальными эффектами
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
  
  // Отладочное логирование балансов
  console.log('[BalanceCard] Текущие балансы:', {
    userId,
    uniBalance,
    tonBalance,
    uniFarmingActive,
    uniDepositAmount,
    uniFarmingBalance
  });
  
  // Получаем доступ к системе уведомлений
  const { success, error: showError, info, loading } = useNotification();
  
  // Состояния для визуальных эффектов
  const [uniAnimating, setUniAnimating] = useState<boolean>(false);
  const [tonAnimating, setTonAnimating] = useState<boolean>(false);
  
  // Состояния для текущего прироста
  const [uniRate, setUniRate] = useState<number>(0);
  
  // Статус WebSocket подключения
  const [wsStatus, setWsStatus] = useState<string>('Подключение...');
  
  // Предыдущее значение баланса для отслеживания изменений
  const [prevUniBalance, setPrevUniBalance] = useState<number | null>(null);
  const [prevTonBalance, setPrevTonBalance] = useState<number | null>(null);
  
  // Храним состояние для отслеживания показанных уведомлений
  const [wsErrorNotificationShown, setWsErrorNotificationShown] = useState<boolean>(false);
  const [wsConnectedOnce, setWsConnectedOnce] = useState<boolean>(false);
  
  // Получаем WebSocket статус из централизованного контекста
  const { connectionStatus, lastMessage, subscribeToUserUpdates } = useWebSocket();
  
  // Обновляем статус соединения
  useEffect(() => {
    switch (connectionStatus) {
      case 'connected':
        setWsStatus('Соединение установлено');
        setWsConnectedOnce(true);
        setWsErrorNotificationShown(false);
        break;
      case 'connecting':
        setWsStatus('Переподключение...');
        break;
      case 'disconnected':
        setWsStatus('Ожидание соединения');
        break;
    }
  }, [connectionStatus]);
  
  // Подписываемся на обновления пользователя при подключении
  useEffect(() => {
    if (connectionStatus === 'connected' && userId) {
      subscribeToUserUpdates(userId);
    }
  }, [connectionStatus, userId, subscribeToUserUpdates]);
  
  // Обрабатываем входящие сообщения об обновлении баланса
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'balance_update') {
      console.log('[BalanceCard] Получено обновление баланса:', lastMessage);
      
      if (lastMessage.userId === userId && lastMessage.balanceData) {
        const { balanceData } = lastMessage;
        
        // Обновляем баланс через refreshBalance
        info(`Обновление баланса: +${balanceData.changes.uni.toFixed(6)} UNI, +${balanceData.changes.ton.toFixed(6)} TON`);
        
        // Принудительно обновляем данные пользователя
        setTimeout(() => {
          refreshBalance();
          
          // Показываем анимацию изменения
          if (balanceData.changes.uni > 0) {
            setUniAnimating(true);
            setTimeout(() => setUniAnimating(false), 800);
          }
          if (balanceData.changes.ton > 0) {
            setTonAnimating(true);
            setTimeout(() => setTonAnimating(false), 800);
          }
        }, 500);
      }
    }
  }, [lastMessage, userId, info, refreshBalance]);
  
  // Расчет скорости фарминга
  const calculateRate = useCallback(() => {
    if (uniDepositAmount) {
      // Скорость фарминга: 0.5% в день
      const estimatedRate = 0.000000289351851800 * uniDepositAmount;
      setUniRate(estimatedRate);
    }
  }, [uniDepositAmount]);
  
  // ===== Вспомогательные функции =====
  
  // Форматирование скорости начисления доходов
  const formatRateNumber = useCallback((rate: number): JSX.Element => {
    if (rate > 0.001) {
      return <span>+{formatAmount(rate, 'UNI')}</span>;
    } else if (rate > 0) {
      return <span className="text-[0.7em] text-opacity-80">+{formatUniNumber(rate, 7)}</span>;
    } else {
      return <span>+0.00000</span>;
    }
  }, []);
  
  // Обработчик ручного обновления баланса
  const handleManualRefresh = useCallback(() => {
    if (isBalanceFetching) return;
    
    console.log('[BalanceCard] 🔄 Принудительное обновление баланса (forceRefresh=true)');
    loading('Обновление баланса...');
    
    try {
      setTimeout(() => {
        refreshBalance(true); // Принудительное обновление без кеша
        calculateRate();
        
        success('Баланс успешно обновлён');
        
        // Анимация обновления
        setUniAnimating(true);
        setTimeout(() => setUniAnimating(false), 800);
        
        setTonAnimating(true);
        setTimeout(() => setTonAnimating(false), 800);
        
        setPrevUniBalance(uniBalance);
        setPrevTonBalance(tonBalance);
      }, 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      showError(`Не удалось обновить баланс: ${errorMessage}`);
    }
  }, [
    refreshBalance, 
    showError, 
    isBalanceFetching, 
    uniBalance, 
    tonBalance, 
    calculateRate
  ]);
  
  // Обработчик полного обновления
  const handleFullRefresh = useCallback(() => {
    if (isBalanceFetching) return;
    
    loading('Обновление данных...');
    
    try {
      refreshUserData();
      
      setTimeout(() => {
        refreshBalance();
        calculateRate();
        
        success('Данные профиля и баланс обновлены');
        
        setUniAnimating(true);
        setTimeout(() => setUniAnimating(false), 800);
        
        setTonAnimating(true);
        setTimeout(() => setTonAnimating(false), 800);
      }, 500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      showError(`Не удалось обновить данные: ${errorMessage}`);
    }
  }, [
    refreshUserData, 
    refreshBalance, 
    showError, 
    isBalanceFetching, 
    calculateRate
  ]);
  
  // Обработчик переподключения WebSocket
  const handleReconnect = useCallback(() => {
    loading('Переподключение...');
    // WebSocket переподключается автоматически через контекст
  }, [loading]);
  
  // Проверка и обновление баланса при первом рендере
  useEffect(() => {
    if (userId && uniBalance === 0) {
      
      loading('Загрузка баланса...');
      
      console.log('[BalanceCard] Первичная загрузка баланса');
      
      setTimeout(() => {
        refreshBalance(true);
        calculateRate();
        
        setTimeout(() => {
          setUniAnimating(true);
          setTimeout(() => setUniAnimating(false), 800);
          
          setTonAnimating(true);
          setTimeout(() => setTonAnimating(false), 800);
        }, 1000);
      }, 500);
    }
  }, [userId, uniBalance, refreshBalance, calculateRate, loading]);

  // ===== Рендеринг согласно UX спецификации =====
  return (
    <div className="bg-card rounded-xl p-3 sm:p-5 mb-5 shadow-lg overflow-hidden relative">
      {/* Неоновая рамка */}
      <div className="absolute inset-0 rounded-xl border border-primary/30"></div>
      
      {/* Заголовок с кнопками управления */}
      <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 relative z-10 flex items-center justify-between">
        <div className="flex items-center">
          <i className="fas fa-wallet text-primary mr-2 text-sm sm:text-base"></i>
          <span className="truncate">Ваш баланс</span>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isBalanceFetching}
            className="text-gray-400 hover:text-primary hover:bg-primary/10 p-2 h-8 w-8"
            title="Обновить баланс"
          >
            <RefreshCw className={`h-4 w-4 ${isBalanceFetching ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFullRefresh}
            disabled={isBalanceFetching}
            className="text-gray-400 hover:text-primary hover:bg-primary/10 p-2 h-8 w-8"
            title="Полное обновление"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </h2>
      
      {/* Сетка карточек токенов */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
        {/* UNI Token - фиолетово-синий градиент */}
        <div className="bg-black/20 rounded-lg p-3 sm:p-4 backdrop-blur-sm relative overflow-hidden border border-primary/20">
          {/* Декоративный градиентный фон UNI */}
          <div className="absolute inset-0 opacity-20">
            <div 
              className="w-24 h-24 rounded-full absolute -right-8 -top-8 blur-xl"
              style={{ background: 'linear-gradient(45deg, #A259FF, #5945FA)' }}
            ></div>
          </div>
          
          {/* Заголовок UNI секции */}
          <div className="flex items-center mb-3 relative z-10">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
              <i className="fas fa-coins text-primary"></i>
            </div>
            <div>
              <h3 className="text-md font-medium text-white">UNI Token</h3>
              <p className="text-xs text-gray-400">внутренний токен</p>
            </div>
          </div>
          
          {/* Баланс UNI с анимацией */}
          <div className="mb-2 relative z-10">
            <div className="text-xl sm:text-2xl font-bold text-white flex items-center">
              <span className={`transition-all duration-300 ${uniAnimating ? 'text-green-400 scale-105' : ''}`}>
                {formatUniNumber(Number(uniBalance) || 0)}
              </span>
              <span className="text-sm ml-1 text-gray-400">UNI</span>
            </div>
            <div className="text-xs text-gray-400">
              {getUSDEquivalent(typeof uniBalance === 'string' ? parseFloat(uniBalance) || 0 : uniBalance || 0, 'UNI')}
            </div>
          </div>
          
          {/* Индикатор скорости фарминга */}
          <div className="bg-success/10 text-success rounded-md px-2 py-1 mt-3 text-xs inline-flex items-center relative z-10">
            <i className="fas fa-arrow-trend-up mr-1"></i>
            <span className={uniAnimating ? 'text-green-400 font-bold' : ''}>
              {formatRateNumber(uniRate)}
            </span>
            <span className="text-gray-400 ml-1">UNI / сек</span>
          </div>
        </div>
        
        {/* TON Balance - сине-голубой градиент */}
        <div className="bg-black/20 rounded-lg p-3 sm:p-4 backdrop-blur-sm relative overflow-hidden border border-blue-500/20">
          {/* Декоративный градиентный фон TON */}
          <div className="absolute inset-0 opacity-20">
            <div 
              className="w-24 h-24 rounded-full absolute -right-8 -top-8 blur-xl"
              style={{ background: 'linear-gradient(45deg, #0088CC, #00B2FF)' }}
            ></div>
          </div>
          
          {/* Заголовок TON секции */}
          <div className="flex items-center mb-3 relative z-10">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-2">
              <i className="fab fa-telegram text-blue-400"></i>
            </div>
            <div>
              <h3 className="text-md font-medium text-white">TON Balance</h3>
              <p className="text-xs text-gray-400">блокчейн токен</p>
            </div>
          </div>
          
          {/* Баланс TON с анимацией */}
          <div className="mb-2 relative z-10">
            <div className="text-xl sm:text-2xl font-bold text-white flex items-center">
              <span className={`transition-all duration-300 ${tonAnimating ? 'text-green-400 scale-105' : ''}`}>
                {formatTonNumber(Number(tonBalance) || 0)}
              </span>
              <span className="text-sm ml-1 text-gray-400">TON</span>
            </div>
            <div className="text-xs text-gray-400">
              {getUSDEquivalent(typeof tonBalance === 'string' ? parseFloat(tonBalance) || 0 : tonBalance || 0, 'TON')}
            </div>
          </div>
          
          {/* Статус доступности */}
          <div className="bg-green-500/10 text-green-400 rounded-md px-2 py-1 mt-3 text-xs inline-flex items-center relative z-10">
            <i className="fas fa-check-circle mr-1"></i>
            <span>Доступно для вывода</span>
          </div>
        </div>
      </div>
      
      {/* WebSocket статус для отладки (скрыт от пользователей) */}
      {process.env.NODE_ENV === 'development' && connectionStatus !== 'connected' && (
        <div className="mt-3 text-xs text-gray-500/50 relative z-10">
          <div className="flex items-center justify-between">
            <span>WebSocket: Отключено</span>
            <button 
              onClick={handleReconnect}
              className="text-blue-400 hover:text-blue-300 transition-colors text-xs"
              title="Переподключиться к WebSocket"
            >
              <i className="fas fa-redo-alt mr-1"></i>
              Переподключить
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceCard;