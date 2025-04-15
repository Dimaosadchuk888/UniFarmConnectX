import React, { useState, useEffect } from 'react';

// Интерфейс для статуса кошелька
enum WalletStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
}

const WalletConnectionCard: React.FC = () => {
  // Состояния для анимаций и взаимодействий
  const [walletStatus, setWalletStatus] = useState<WalletStatus>(WalletStatus.DISCONNECTED);
  const [walletAddress, setWalletAddress] = useState<string>("UQxxxxxxxxxxxxxxxxxxxxxxxxx");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [confettiVisible, setConfettiVisible] = useState<boolean>(false);
  
  // Имитация копирования в буфер обмена
  const copyToClipboard = () => {
    // В реальном приложении здесь будет копирование: navigator.clipboard.writeText(walletAddress)
    setIsCopied(true);
    
    // Через 2 секунды сбрасываем состояние
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };
  
  // Имитация подключения кошелька
  const connectWallet = () => {
    if (walletStatus === WalletStatus.DISCONNECTED) {
      setWalletStatus(WalletStatus.CONNECTING);
      
      // Имитация задержки при подключении
      setTimeout(() => {
        setWalletStatus(WalletStatus.CONNECTED);
        setWalletAddress("UQDm5PFQEgoqh9wFXqYFgEuAk3rL5oQd8S6b1xA5t_7Ykqsj");
        
        // Показываем конфетти при успешном подключении
        setConfettiVisible(true);
        
        // Скрываем конфетти через 3 секунды
        setTimeout(() => {
          setConfettiVisible(false);
        }, 3000);
      }, 1500);
    }
  };
  
  // Отключение кошелька
  const disconnectWallet = () => {
    if (walletStatus === WalletStatus.CONNECTED) {
      setWalletStatus(WalletStatus.DISCONNECTED);
      setWalletAddress("UQxxxxxxxxxxxxxxxxxxxxxxxxx");
    }
  };
  
  // Генерация конфетти для праздничного эффекта
  const renderConfetti = () => {
    // Создаем 15 шт. конфетти с разными цветами, размерами и задержкой
    return Array.from({ length: 15 }, (_, i) => {
      const colors = ['#A259FF', '#7E1AFF', '#5945FA', '#4A75FF', '#8959FF'];
      const size = Math.random() * 8 + 4; // от 4px до 12px
      const x = Math.random() * 100; // случайная позиция по X
      const delay = Math.random() * 0.5; // задержка до 0.5s
      const duration = Math.random() * 2 + 1; // длительность от 1s до 3s
      
      return (
        <div
          key={i}
          className="absolute rounded-sm"
          style={{
            left: `${x}%`,
            top: '-5%',
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: colors[i % colors.length],
            animation: `fall ${duration}s ease-in`,
            animationDelay: `${delay}s`,
          }}
        ></div>
      );
    });
  };
  
  // Форматирование TON-адреса для отображения (скрытие средней части)
  const formatAddress = (address: string) => {
    if (address === "UQxxxxxxxxxxxxxxxxxxxxxxxxx") return address;
    
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  };
  
  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-lg card-hover-effect relative overflow-hidden">
      {/* Декоративные элементы фона */}
      <div className="absolute -left-16 -top-16 w-32 h-32 bg-primary/5 rounded-full blur-xl"></div>
      
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-md font-medium">Адрес кошелька</h2>
        
        {/* Статус подключения кошелька */}
        {walletStatus !== WalletStatus.DISCONNECTED && (
          <div className={`
            flex items-center px-2 py-1 rounded-full text-xs
            ${walletStatus === WalletStatus.CONNECTING 
              ? 'bg-yellow-500/20 text-yellow-500' 
              : 'bg-green-500/20 text-green-500'
            }
          `}>
            <div className={`
              w-2 h-2 rounded-full mr-1
              ${walletStatus === WalletStatus.CONNECTING ? 'bg-yellow-500' : 'bg-green-500'}
              ${walletStatus === WalletStatus.CONNECTING ? 'animate-pulse' : ''}
            `}></div>
            {walletStatus === WalletStatus.CONNECTING ? 'Подключение...' : 'Подключено'}
          </div>
        )}
      </div>
      
      {/* Поле адреса с эффектами */}
      <div className="flex mb-4 relative">
        <div className="flex-grow relative">
          <input 
            type="text" 
            value={formatAddress(walletAddress)} 
            readOnly
            className={`
              w-full bg-muted text-foreground rounded-l-lg px-3 py-2 text-sm 
              transition-all duration-300
              ${isHovered ? 'bg-muted/80' : ''}
              ${walletStatus === WalletStatus.CONNECTING ? 'animate-pulse' : ''}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          />
          
          {/* Эффект выделения при наведении */}
          {isHovered && (
            <div className="absolute inset-0 border border-primary/30 rounded-l-lg pointer-events-none"></div>
          )}
          
          {/* Анимация при подключении */}
          {walletStatus === WalletStatus.CONNECTING && (
            <div 
              className="absolute inset-0 rounded-l-lg overflow-hidden opacity-20 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                animation: 'shimmer 1s infinite'
              }}
            ></div>
          )}
        </div>
        
        <button 
          className={`
            px-3 py-2 rounded-r-lg relative overflow-hidden
            transition-all duration-300
            ${isCopied ? 'bg-accent' : 'bg-primary'}
          `}
          onClick={copyToClipboard}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Анимированный фон для кнопки */}
          <div 
            className="absolute inset-0" 
            style={{
              background: isCopied 
                ? 'linear-gradient(45deg, #00FF99, #00CC77)' 
                : 'linear-gradient(45deg, #A259FF, #B368F7)',
              opacity: isHovered ? 1 : 0.9,
              transition: 'opacity 0.3s ease'
            }}
          ></div>
          
          {/* Иконка в кнопке */}
          <i className={`
            fas ${isCopied ? 'fa-check' : 'fa-copy'} 
            relative z-10 text-white
            ${isCopied ? 'scale-110' : ''}
            transition-transform duration-300
          `}></i>
        </button>
        
        {/* Тултип о статусе копирования */}
        {isCopied && (
          <div className="absolute -top-8 right-0 bg-accent/90 text-white text-xs px-2 py-1 rounded shadow-md animate-bounce">
            Скопировано!
          </div>
        )}
      </div>
      
      {/* Кнопка подключения/отключения кошелька */}
      <button 
        className={`
          w-full py-3 rounded-lg font-medium
          transition-all duration-300
          relative overflow-hidden
          ${walletStatus === WalletStatus.CONNECTED 
            ? 'border border-primary/50 text-foreground hover:bg-primary/10' 
            : 'gradient-button text-white'}
          ${walletStatus === WalletStatus.CONNECTING ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
        `}
        onClick={walletStatus === WalletStatus.CONNECTED ? disconnectWallet : connectWallet}
        disabled={walletStatus === WalletStatus.CONNECTING}
      >
        {/* Анимация загрузки при подключении */}
        {walletStatus === WalletStatus.CONNECTING && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Эффект свечения кнопки */}
        {walletStatus !== WalletStatus.CONNECTING && (
          <div 
            className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100" 
            style={{
              background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)',
              transform: 'translateX(-100%)',
              animation: 'shimmer 2s infinite'
            }}
          ></div>
        )}
        
        <span className="relative z-10">
          {walletStatus === WalletStatus.CONNECTED 
            ? 'Отключить кошелёк' 
            : walletStatus === WalletStatus.CONNECTING 
              ? 'Подключение...' 
              : 'Подключить кошелёк'
          }
        </span>
      </button>
      
      {/* Контейнер для конфетти */}
      {confettiVisible && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {renderConfetti()}
        </div>
      )}
      
      {/* Информационная подсказка */}
      <p className="text-xs text-foreground opacity-50 text-center mt-3">
        {walletStatus === WalletStatus.CONNECTED 
          ? 'Ваш кошелёк успешно подключен!'
          : 'Подключите TON кошелёк для вывода средств'
        }
      </p>
    </div>
  );
};

export default WalletConnectionCard;
