import React, { useState, useRef, useEffect } from 'react';

// Состояния отправки формы
enum SubmitState {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  SUCCESS = 'success',
  ERROR = 'error'
}

const WithdrawalForm: React.FC = () => {
  // Базовые состояния формы
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.IDLE);
  
  // Состояния для анимаций и эффектов
  const [addressFocused, setAddressFocused] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  
  // Refs для фокуса полей
  const addressInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  
  // Обработчик отправки формы с анимацией
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация формы
    if (!address || !amount) {
      // Показываем ошибку в соответствующем поле
      if (!address && addressInputRef.current) {
        addressInputRef.current.focus();
        setAddressFocused(true);
      } else if (!amount && amountInputRef.current) {
        amountInputRef.current.focus();
        setAmountFocused(true);
      }
      return;
    }
    
    // Анимируем процесс отправки
    setSubmitState(SubmitState.SUBMITTING);
    
    // Имитация задержки ответа сервера
    setTimeout(() => {
      setSubmitState(SubmitState.SUCCESS);
      setMessageSent(true);
      
      // Через 3 секунды сбрасываем состояние отправки
      setTimeout(() => {
        setSubmitState(SubmitState.IDLE);
        setAddress('');
        setAmount('');
      }, 3000);
    }, 1500);
  };
  
  // Обработчик для подсказки
  const toggleTooltip = () => {
    setShowTooltip(!showTooltip);
  };
  
  // Эффект для анимации "печатающейся" подсказки при успешной отправке
  const [typedMessage, setTypedMessage] = useState('');
  const successMessage = 'Заявка успешно отправлена! Ожидайте обработки.';
  
  useEffect(() => {
    if (submitState === SubmitState.SUCCESS) {
      setTypedMessage(''); // Сбрасываем текст при каждой отправке
      
      // Анимируем печатание текста по символам
      const typeMessage = async () => {
        for (let i = 0; i < successMessage.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 30)); // Задержка между символами
          setTypedMessage(successMessage.substring(0, i + 1));
        }
      };
      
      typeMessage();
    }
  }, [submitState]);
  
  return (
    <div className="bg-card rounded-xl p-4 shadow-lg card-hover-effect relative overflow-hidden">
      {/* Декоративные элементы фона */}
      <div className="absolute -right-16 -bottom-16 w-32 h-32 bg-primary/5 rounded-full blur-xl"></div>
      
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-md font-medium">Вывод средств</h2>
        
        {/* Иконка вопроса с всплывающей подсказкой */}
        <div className="relative">
          <div 
            className="w-5 h-5 rounded-full bg-muted flex items-center justify-center cursor-pointer text-xs"
            onMouseEnter={toggleTooltip}
            onMouseLeave={toggleTooltip}
          >
            <i className="fas fa-question"></i>
          </div>
          
          {showTooltip && (
            <div className="absolute right-0 top-6 w-64 bg-card p-3 rounded-md shadow-lg text-xs z-20">
              <p className="mb-2">
                <span className="font-medium">Зачем указывать TON-адрес?</span>
              </p>
              <p>TON-адрес нужен для вывода TON напрямую в ваш кошелек через блокчейн TON.</p>
            </div>
          )}
        </div>
      </div>
      
      {messageSent ? (
        // Сообщение об успешной отправке
        <div className="py-10 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <i className="fas fa-check text-green-500 text-2xl"></i>
          </div>
          
          <div className="text-sm text-center relative">
            <span className="inline-block min-h-[3em]">{typedMessage}</span>
            <span 
              className={`absolute -right-2 top-0 animate-pulse h-4 w-0.5 bg-primary ${
                typedMessage.length === successMessage.length ? 'opacity-0' : 'opacity-100'
              }`}
            ></span>
          </div>
          
          <button 
            className="mt-6 px-4 py-2 bg-muted rounded-lg text-sm hover:bg-primary/10 transition-colors"
            onClick={() => setMessageSent(false)}
          >
            Создать новую заявку
          </button>
        </div>
      ) : (
        // Форма вывода средств
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-foreground opacity-70 mb-1">
              TON-адрес получателя
            </label>
            <div className="relative">
              <input 
                ref={addressInputRef}
                type="text" 
                placeholder="Введите TON-адрес" 
                className={`
                  w-full bg-muted text-foreground rounded-lg px-3 py-2 text-sm 
                  transition-all duration-300
                  ${addressFocused ? 'ring-2 ring-primary/30 bg-muted/80' : ''}
                `}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onFocus={() => setAddressFocused(true)}
                onBlur={() => setAddressFocused(false)}
              />
              
              {/* Анимация фокуса */}
              {addressFocused && (
                <div 
                  className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden opacity-20"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    animation: 'shimmer 2s infinite'
                  }}
                ></div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-foreground opacity-70 mb-1">
              Сумма для вывода
            </label>
            <div className="relative">
              <div className="flex">
                <input 
                  ref={amountInputRef}
                  type="number" 
                  placeholder="0.00" 
                  className={`
                    flex-grow bg-muted text-foreground rounded-l-lg px-3 py-2 text-sm
                    transition-all duration-300
                    ${amountFocused ? 'ring-2 ring-primary/30 bg-muted/80' : ''}
                  `}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onFocus={() => setAmountFocused(true)}
                  onBlur={() => setAmountFocused(false)}
                />
                <div className={`
                  bg-muted rounded-r-lg px-3 py-2 text-sm flex items-center
                  transition-all duration-300
                  ${amountFocused ? 'bg-muted/80 border-r-2 border-t-2 border-b-2 border-primary/30' : ''}
                `}>
                  TON
                </div>
              </div>
              
              {/* Анимация фокуса */}
              {amountFocused && (
                <div 
                  className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden opacity-20"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    animation: 'shimmer 2s infinite'
                  }}
                ></div>
              )}
            </div>
          </div>
          
          <button 
            type="submit"
            className={`
              w-full py-3 rounded-lg font-medium mt-4
              relative overflow-hidden
              ${submitState === SubmitState.SUBMITTING ? 'cursor-not-allowed' : 'cursor-pointer'}
              ${submitState === SubmitState.SUBMITTING ? 'bg-primary/70' : 'gradient-button'}
              text-white
            `}
            disabled={submitState === SubmitState.SUBMITTING}
          >
            {/* Анимация загрузки при отправке */}
            {submitState === SubmitState.SUBMITTING ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>Отправка...</span>
              </div>
            ) : (
              // Эффект пульсации кнопки при наведении
              <>
                <div className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100" 
                  style={{
                    background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)',
                    transform: 'translateX(-100%)',
                    animation: 'shimmer 2s infinite'
                  }}
                ></div>
                <span className="relative z-10">Отправить заявку</span>
              </>
            )}
          </button>
          
          <p className="text-xs text-foreground opacity-70 text-center mt-1">
            Заявка будет передана администратору
          </p>
        </form>
      )}
    </div>
  );
};

export default WithdrawalForm;
