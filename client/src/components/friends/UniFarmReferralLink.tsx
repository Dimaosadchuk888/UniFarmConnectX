import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';
import { User } from '@/services/userService';
import { buildReferralLink } from '@/utils/referralUtils';

/**
 * Основной компонент для отображения реферальной ссылки 
 * с упрощенной логикой и улучшенным UI
 * 
 * АУДИТ: Компонент специально оптимизирован для работы независимо от Telegram WebApp.
 * Показывает ссылку только на основе наличия ref_code в данных пользователя,
 * что решает проблему отображения ссылки при отсутствии Telegram API.
 */
const UniFarmReferralLink: React.FC = () => {
  // Состояния UI
  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Прямой запрос к API с отключенным кэшированием для актуальных данных
  const { 
    data, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['/api/me'],
    queryFn: () => userService.getCurrentUser(true), // force reload
    staleTime: 5000, // Обновлять данные каждые 5 секунд
  });
  
  // Безопасное приведение типов для избежания ошибок
  const safeUser = data as User | undefined;
  const refCode = safeUser?.ref_code;
  
  // Формируем ссылку с помощью утилиты
  const referralLink = buildReferralLink(refCode);
  
  // Дополнительная отладочная функция для логирования ссылки
  useEffect(() => {
    if (refCode) {
      console.log('✅ [UniFarmReferralLink] РЕФ КОД НАЙДЕН:', refCode);
      console.log('📋 [UniFarmReferralLink] ССЫЛКА:', referralLink);
    } else if (!isLoading) {
      console.log('❌ [UniFarmReferralLink] РЕФ КОД ОТСУТСТВУЕТ', { 
        isLoading, 
        isError,
        userData: safeUser 
      });
    }
  }, [refCode, referralLink, isLoading, isError, safeUser]);
  
  // Копирование ссылки в буфер обмена
  const copyToClipboard = () => {
    if (!referralLink) return;
    
    try {
      navigator.clipboard.writeText(referralLink);
      setIsCopied(true);
      
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Не удалось скопировать текст в буфер обмена', err);
      
      // Fallback для устройств без поддержки clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = referralLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy тоже не сработал:', fallbackErr);
        alert('Не удалось скопировать. Пожалуйста, выделите ссылку вручную и скопируйте.');
      }
    }
  };
  
  // Упрощенный рендеринг согласно ТЗ:
  // 1. Если загрузка - показываем лоадер
  // 2. Если есть ref_code - показываем ссылку
  // 3. Если нет ref_code (после загрузки) - показываем сообщение об ошибке
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
          
          {/* Реферальный код - показываем, если он есть */}
          {!isLoading && refCode && (
            <div className="flex items-center text-sm text-muted-foreground mt-1 sm:mt-0">
              <span className="mr-2">Ваш код:</span>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">{refCode}</span>
            </div>
          )}
        </div>
        
        {/* ОСНОВНАЯ ЛОГИКА ОТОБРАЖЕНИЯ - только две ветки: загрузка или содержимое */}
        {/* 1. Загрузка - показываем лоадер */}
        {isLoading && (
          <div className="flex justify-center items-center py-3">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
            <span className="text-sm text-muted-foreground">Получение ссылки...</span>
          </div>
        )}
        
        {/* 2. Данные загружены - показываем либо ссылку, либо сообщение об ошибке */}
        {!isLoading && (
          <>
            {/* Если есть refCode - показываем ссылку */}
            {refCode ? (
              <div className="flex relative">
                <div className="flex-grow relative">
                  <input 
                    type="text" 
                    value={referralLink} 
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
                  <div className="absolute -top-8 right-0 bg-accent/90 text-white text-xs px-2 py-1 rounded shadow-md animate-fadeIn">
                    Ссылка скопирована
                  </div>
                )}
              </div>
            ) : (
              /* Если нет refCode - показываем сообщение об ошибке */
              <div className="flex flex-col justify-center items-center py-3 px-2 bg-amber-500/10 rounded-lg">
                <div className="flex items-center mb-2">
                  <i className="fas fa-exclamation-circle text-amber-500/80 mr-2"></i>
                  <span className="text-sm text-amber-500/80">Не удалось получить реферальную ссылку.</span>
                </div>
                <button
                  onClick={() => refetch()}
                  className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded-full transition-colors flex items-center mt-1"
                >
                  <i className="fas fa-sync-alt mr-1 text-xs"></i>
                  Обновить
                </button>
              </div>
            )}
          </>
        )}
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