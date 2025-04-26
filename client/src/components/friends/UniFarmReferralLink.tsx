import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';
import { User } from '@/services/userService';
import { buildReferralLink, buildDirectBotReferralLink } from '@/utils/referralUtils';

/**
 * Упрощенный компонент для отображения реферальной ссылки 
 * Версия 4.0: Добавлен режим AirDrop с отображением состояния загрузки
 */
const UniFarmReferralLink: React.FC = () => {
  // Состояния UI
  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false); // Состояние процесса регистрации в AirDrop режиме
  
  // Состояние для отслеживания выбранного типа ссылки
  const [linkType, setLinkType] = useState<'app' | 'bot'>('app');
  
  // Запрос данных пользователя напрямую из API
  const { 
    data, 
    isLoading, 
    isError
  } = useQuery({
    queryKey: ['/api/me'],
    queryFn: () => userService.getCurrentUser(),
    staleTime: 10000, // Кэшируем на 10 секунд
  });
  
  // Безопасное приведение типов
  const safeUser = data as User | undefined;
  const refCode = safeUser?.ref_code;
  const hasRefCode = !!refCode;
  
  // Логирование при отсутствии ref_code согласно п.3.1
  useEffect(() => {
    if (safeUser && !refCode) {
      console.log('[AUDIT] UniFarmReferralLink: Пользователь получен, но ref_code отсутствует', {
        userId: safeUser.id,
        telegramId: safeUser.telegram_id,
        username: safeUser.username
      });
    } else if (refCode) {
      console.log('[AUDIT] UniFarmReferralLink: ref_code получен успешно:', refCode);
    }
  }, [safeUser, refCode]);
  
  // Формируем ссылки с помощью утилит
  const referralLink = hasRefCode ? buildReferralLink(refCode) : "";
  const directBotLink = hasRefCode ? buildDirectBotReferralLink(refCode) : "";
  
  // Копирование ссылки в буфер обмена
  const copyToClipboard = (type: 'app' | 'bot' = linkType) => {
    const linkToCopy = type === 'app' ? referralLink : directBotLink;
    if (!linkToCopy) return;
    
    try {
      navigator.clipboard.writeText(linkToCopy);
      setIsCopied(true);
      
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      // Fallback для устройств без поддержки clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = linkToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      } catch (fallbackErr) {
        console.error('Не удалось скопировать ссылку:', fallbackErr);
        alert('Не удалось скопировать. Пожалуйста, выделите ссылку вручную и скопируйте.');
      }
    }
  };
  
  // Простая логика отображения согласно ТЗ п.3.2:
  // 1. Если идет загрузка - показываем лоадер
  // 2. Если ref_code отсутствует - показываем сообщение
  // 3. Если ref_code есть - показываем ссылку с UI

  // Загрузка данных
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-5 mb-5 shadow-lg relative">
        <div className="flex justify-center items-center flex-col py-4">
          <div className="flex items-center mb-3">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
            <span className="text-sm text-muted-foreground">Загрузка партнерской программы...</span>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Реферальная ссылка будет доступна после загрузки данных
          </p>
        </div>
      </div>
    );
  }
  
  // Ошибка или отсутствие ref_code
  if (isError || !hasRefCode) {
    // Автоматически запускаем регистрацию в режиме AirDrop без ожидания клика
    // Это устраняет заглушку и позволяет пользователю всегда получить реферальный код
    if (!isRegistering) {
      console.log("[AUDIT] Автоматическая регистрация в режиме AirDrop для получения ref_code");
      setIsRegistering(true);
      
      // Запускаем регистрацию в режиме AirDrop автоматически
      userService.registerInAirDropMode()
        .then((success) => {
          if (success) {
            console.log("✅ Автоматическая регистрация в режиме AirDrop успешна!");
            // После успешной регистрации обновляем данные принудительно
            window.location.href = window.location.pathname + "?t=" + Date.now();
          } else {
            console.error("❌ Автоматическая регистрация в режиме AirDrop не удалась");
            setIsRegistering(false);
          }
        })
        .catch((err: Error) => {
          console.error("❌ Ошибка автоматической регистрации в режиме AirDrop:", err);
          setIsRegistering(false);
        });
    }
  
    // Показываем индикатор загрузки
    return (
      <div className="bg-card rounded-xl p-5 mb-5 shadow-lg relative">
        <div className="flex justify-center items-center flex-col py-4">
          <div className="flex items-center mb-3">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
            <span className="text-sm text-muted-foreground">Генерация реферального кода...</span>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Подождите, система создает для вас уникальный реферальный код
          </p>
        </div>
      </div>
    );
  }
  
  // Основной UI с реферальной ссылкой (только если есть refCode)
  return (
    <div className="bg-card rounded-xl p-5 mb-5 shadow-lg card-hover-effect relative overflow-hidden">
      {/* Декоративные элементы фона */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-xl"></div>
      <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-accent/5 rounded-full blur-xl"></div>
      
      {/* Заголовок секции */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <i className="fas fa-share-alt text-primary mr-2"></i>
          Ваша партнёрская программа
        </h2>
      </div>
      
      {/* Секция с реферальной ссылкой */}
      <div className="mb-6 bg-black/20 p-4 rounded-lg backdrop-blur-sm relative">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
          <h3 className="text-md font-medium text-white/90 flex items-center">
            <i className="fas fa-link text-primary/90 mr-2 text-sm"></i>
            Реферальная ссылка
          </h3>
          
          {/* Реферальный код */}
          <div className="flex items-center text-sm text-muted-foreground mt-1 sm:mt-0">
            <span className="mr-2">Ваш код:</span>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">{refCode}</span>
          </div>
        </div>
        
        {/* Переключатель типа ссылки */}
        <div className="flex justify-center mb-3">
          <div className="bg-black/30 rounded-full p-1 flex text-xs">
            <button
              className={`px-3 py-1.5 rounded-full transition-all ${
                linkType === 'app' 
                  ? 'bg-primary text-white' 
                  : 'text-white/70 hover:text-white'
              }`}
              onClick={() => setLinkType('app')}
            >
              <i className="fas fa-mobile-alt mr-1"></i>
              Mini App
            </button>
            <button
              className={`px-3 py-1.5 rounded-full transition-all ${
                linkType === 'bot' 
                  ? 'bg-primary text-white' 
                  : 'text-white/70 hover:text-white'
              }`}
              onClick={() => setLinkType('bot')}
            >
              <i className="fas fa-robot mr-1"></i>
              Telegram Bot
            </button>
          </div>
        </div>

        {/* Отображение выбранной ссылки */}
        <div className="flex relative">
          <div className="flex-grow relative">
            <input 
              type="text" 
              value={linkType === 'app' ? referralLink : directBotLink} 
              readOnly
              className={`
                w-full bg-muted text-foreground rounded-l-lg px-3 py-2 text-sm
                transition-all duration-300
                ${isHovered ? 'bg-muted/80' : ''}
              `}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            />
            
            {/* Эффект выделения при наведении */}
            {isHovered && (
              <div className="absolute inset-0 border border-primary/30 rounded-l-lg pointer-events-none"></div>
            )}
          </div>
          
          <button 
            className={`
              px-3 py-2 rounded-r-lg relative overflow-hidden
              ${isCopied ? 'bg-accent' : 'bg-primary'}
              transition-all duration-300
            `}
            onClick={() => copyToClipboard(linkType)}
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
            <div className="absolute -top-8 right-0 bg-accent/90 text-white text-xs px-2 py-1 rounded shadow-md animate-fadeIn">
              Ссылка скопирована
            </div>
          )}
        </div>

        {/* Подсказка о типе ссылки */}
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {linkType === 'app' 
            ? "Ссылка для запуска Mini App в Telegram" 
            : "Ссылка для перехода к диалогу с ботом"
          }
        </p>
      </div>
      
      {/* Подсказка о принципе работы */}
      <div className="text-xs text-foreground opacity-70 mt-4 bg-primary/5 p-3 rounded-lg">
        <p className="font-medium mb-1 text-center text-primary/90">
          Приглашайте друзей и зарабатывайте до 100% от их дохода в UNI и TON!
        </p>
        <p className="mb-1">
          С первого уровня — вы получаете 100% от фарминга приглашённого.
        </p>
        <p className="mb-1">
          Стройте глубокую сеть до 20 уровней и получайте стабильный доход с каждого уровня.
        </p>
        <p>
          Пассивный доход растёт вместе с вашей командой!
        </p>
      </div>
    </div>
  );
};

export default UniFarmReferralLink;