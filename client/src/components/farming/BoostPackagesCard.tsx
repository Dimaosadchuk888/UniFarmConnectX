import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { invalidateQueryWithUserId } from '@/lib/queryClient';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { format } from 'date-fns';
import PaymentMethodDialog from '../ton-boost/PaymentMethodDialog';
import ExternalPaymentStatus from '../ton-boost/ExternalPaymentStatus';
import { useUser } from '@/contexts/userContext';
import { BadgeCheck, Rocket, Sparkles, TrendingUp, Zap } from 'lucide-react';

// Определяем структуру буст-пакета
interface BoostPackage {
  id: number;
  name: string;
  price: string;
  tonDailyYield: string;
  uniBonus: string;
  color?: string;
  icon?: JSX.Element;
  popular?: boolean;
}

// Создаем массив с буст-пакетами и их ценой в UNI
const boostPackages: BoostPackage[] = [
  {
    id: 1,
    name: 'Starter Boost',
    price: '1 TON',
    tonDailyYield: '+0.5%/день',
    uniBonus: '+10,000 UNI',
    color: 'from-blue-500 to-indigo-600',
    icon: <Zap size={18} className="text-blue-100" />
  },
  {
    id: 2,
    name: 'Standard Boost',
    price: '5 TON',
    tonDailyYield: '+1%/день',
    uniBonus: '+75,000 UNI',
    color: 'from-purple-500 to-violet-600',
    icon: <TrendingUp size={18} className="text-purple-100" />,
    popular: true
  },
  {
    id: 3,
    name: 'Advanced Boost',
    price: '15 TON',
    tonDailyYield: '+2%/день',
    uniBonus: '+250,000 UNI',
    color: 'from-pink-500 to-rose-600',
    icon: <Sparkles size={18} className="text-pink-100" />
  },
  {
    id: 4,
    name: 'Premium Boost',
    price: '25 TON',
    tonDailyYield: '+2.5%/день',
    uniBonus: '+500,000 UNI',
    color: 'from-amber-500 to-orange-600',
    icon: <Rocket size={18} className="text-amber-100" />
  }
];

// Соответствие между ID буста и ценой в UNI
const boostPricesUni: Record<number, string> = {
  1: '100000',  // 100,000 UNI за Boost 1
  2: '500000',  // 500,000 UNI за Boost 5
  3: '1500000', // 1,500,000 UNI за Boost 15
  4: '2500000'  // 2,500,000 UNI за Boost 25
};

// Безопасная функция для получения цены буста по ID с защитой от ошибок
const getSafeBoostUniPrice = (boostId: number | null): string => {
  try {
    if (boostId === null || boostId === undefined) {return '0';
    }
    
    if (typeof boostId !== 'number') {return '0';
    }
    
    const price = boostPricesUni[boostId];
    if (price === undefined) {return '0';
    }
    
    return price;
  } catch (error) {return '0';
  }
};

// Безопасная функция для получения информации о буст-пакете по ID с защитой от ошибок
const getSafeBoostPackage = (boostId: number | null): BoostPackage | null => {
  try {
    if (boostId === null || boostId === undefined) {return null;
    }
    
    if (typeof boostId !== 'number') {return null;
    }
    
    const boostPackage = boostPackages.find(bp => bp.id === boostId);
    if (!boostPackage) {return null;
    }
    
    return boostPackage;
  } catch (error) {return null;
  }
};

// Примечание: Интерфейс PaymentTransaction заменен на inline тип выше

// Интерфейс свойств компонента
interface BoostPackagesCardProps {
  userData?: any;
}

const BoostPackagesCard: React.FC<BoostPackagesCardProps> = ({ userData }) => {
  // Состояния
  const [purchasingBoostId, setPurchasingBoostId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Состояния для диалогов
  const [paymentDialogOpen, setPaymentDialogOpen] = useState<boolean>(false);
  const [paymentStatusDialogOpen, setPaymentStatusDialogOpen] = useState<boolean>(false);
  
  // Состояния для выбранного буста
  const [selectedBoostId, setSelectedBoostId] = useState<number | null>(null);
  const [selectedBoostName, setSelectedBoostName] = useState<string>('');
  
  // Состояние для данных о транзакции - обновленная версия с корректными типами для LSP
  const [paymentTransaction, setPaymentTransaction] = useState<{
    transactionId: number;
    paymentLink: string;
    paymentMethod: 'internal_balance' | 'external_wallet';
  }>({
    transactionId: 0,
    paymentLink: '',
    paymentMethod: 'internal_balance'
  });
  
  const queryClient = useQueryClient();
  
  // Получаем ID пользователя из контекста
  const { userId } = useUser();

  // Функция для обработки сообщений об ошибках
  const handleErrorMessage = (message?: string) => {
    try {
      // Проверяем наличие ключевых слов, чтобы определить тип ошибки
      if (!message) {
        setErrorMessage('Произошла ошибка при покупке буста');
        return;
      }
      
      // Если сообщение содержит информацию о недостаточном балансе
      if (message.toLowerCase().includes('недостаточно') ||
          message.toLowerCase().includes('баланс') ||
          message.toLowerCase().includes('balance') ||
          message.toLowerCase().includes('insufficient')) {
        setErrorMessage('Недостаточно средств на балансе для покупки буста');
        return;
      }
      
      // Если это другая ошибка, показываем упрощенное сообщение
      setErrorMessage(message);
    } catch (error: any) {// В крайнем случае показываем стандартное сообщение
      try {
        setErrorMessage('Произошла ошибка. Пожалуйста, попробуйте позже.');
      } catch (err) {}
    }
  };
  
  // Мутация для покупки TON буста
  const buyTonBoostMutation = useMutation({
    mutationFn: async ({ boostId, paymentMethod }: { boostId: number, paymentMethod: 'internal_balance' | 'external_wallet' }) => {
      try {
        // Используем correctApiRequest вместо apiRequest для корректной обработки заголовков
        return await correctApiRequest('/api/v2/ton-farming/purchase', 'POST', {
          user_id: userId,
          boost_id: boostId,
          payment_method: paymentMethod
        });
      } catch (error: any) {throw error;
      }
    },
    onMutate: ({ boostId }) => {
      try {
        // Сохраняем ID буста, который покупается
        setPurchasingBoostId(boostId);
        // Сбрасываем сообщения
        setErrorMessage(null);
        setSuccessMessage(null);
      } catch (error: any) {// Не выбрасываем ошибку, чтобы не прерывать процесс
      }
    },
    onSuccess: (data) => {
      try {
        if (data.success) {
          // Если оплата через внутренний баланс - показываем сообщение об успехе
          if (data.data.paymentMethod === 'internal_balance') {
            setSuccessMessage(data.message || 'Буст успешно приобретен!');
            
            // Инвалидируем кэш для обновления баланса и транзакций
            invalidateQueryWithUserId(`/api/v2/users`);
            invalidateQueryWithUserId('/api/v2/wallet/balance');
            invalidateQueryWithUserId('/api/v2/transactions');
            invalidateQueryWithUserId('/api/v2/ton-farming/active');
          }
          // Если оплата через внешний кошелек - показываем диалог статуса платежа
          else if (data.data.paymentMethod === 'external_wallet') {
            // Сохраняем данные о транзакции
            setPaymentTransaction({
              transactionId: data.data.transactionId,
              paymentLink: data.data.paymentLink,
              paymentMethod: 'external_wallet'
            });
            
            // Открываем диалог статуса платежа
            setPaymentStatusDialogOpen(true);
            
            // Закрываем диалог выбора способа оплаты
            setPaymentDialogOpen(false);
          }
        } else {
          // Показываем пользовательское сообщение об ошибке
          handleErrorMessage(data.message);
        }
      } catch (error: any) {// Пытаемся восстановиться
        try {
          // Показываем общее сообщение об успехе (предполагаем, что покупка всё же прошла)
          setSuccessMessage('Операция выполнена. Обновите страницу для проверки статуса.');
          
          // Пытаемся обновить кэш
          invalidateQueryWithUserId('/api/v2/wallet/balance');
          invalidateQueryWithUserId('/api/v2/ton-farming/active');
        } catch (err) {}
      }
    },
    onError: (error: any) => {
      try {// Пробуем распарсить JSON из ошибки, если он там есть
        if (error.message && error.message.includes('{')) {
          try {
            const errorJson = error.message.substring(error.message.indexOf('{'));
            const parsedError = JSON.parse(errorJson);
            if (parsedError && parsedError.message) {
              handleErrorMessage(parsedError.message);
              return;
            }
          } catch (parseError) {// Продолжаем обработку
          }
        }

        // Показываем общее сообщение об ошибке
        handleErrorMessage(error.message);
      } catch (err: any) {// Последняя попытка показать хоть какое-то сообщение
        try {
          setErrorMessage('Не удалось выполнить операцию. Пожалуйста, попробуйте позже.');
        } catch {}
      }
    },
    onSettled: () => {
      try {
        // Сбрасываем ID буста после завершения операции
        setPurchasingBoostId(null);
        
        // Закрываем модальное окно выбора способа оплаты, если оно открыто
        // Но не закрываем диалог статуса платежа
        if (!paymentStatusDialogOpen) {
          setPaymentDialogOpen(false);
        }
      } catch (error: any) {// В крайнем случае сбрасываем флаг (попытка)
        try {
          setPurchasingBoostId(null);
        } catch {}
      }
    }
  });
  
  // Проверяем, может ли пользователь купить буст с улучшенной обработкой ошибок
  const canBuyBoost = (boostId: number): boolean => {
    try {
      // Проверка валидности ID буста
      if (boostId === undefined || boostId === null || isNaN(boostId)) {return false;
      }
      
      // Если данные пользователя отсутствуют, все равно разрешаем покупку
      // так как может быть внешняя оплата
      if (!userData) {return true;
      }
      
      // Проверка, что userData является объектом
      if (typeof userData !== 'object') {return true; // Все равно разрешаем
      }
      
      // Всегда разрешаем покупку, так как есть возможность внешней оплаты
      return true;
    } catch (error: any) {// В случае ошибки разрешаем покупку
      return true;
    }
  };
  
  // Обработчик нажатия на кнопку "Buy Boost" с улучшенной обработкой ошибок
  const handleBuyBoost = (boostId: number) => {
    try {
      // Проверка валидности ID буста
      if (boostId === undefined || boostId === null || isNaN(boostId)) {setErrorMessage('Недействительный ID буста. Пожалуйста, обновите страницу и попробуйте снова.');
        return;
      }
      
      // Используем безопасную функцию для получения информации о бусте
      const selectedBoost = getSafeBoostPackage(boostId);
      
      // Если буст не найден
      if (!selectedBoost) {setErrorMessage('Выбранный буст недоступен. Пожалуйста, выберите другой.');
        return;
      }
      
      try {
        // Устанавливаем ID выбранного буста
        setSelectedBoostId(boostId);
        
        // Устанавливаем имя выбранного буста с проверкой на undefined
        setSelectedBoostName(selectedBoost.name || `Boost ${boostId}`);
        
        // Открываем диалог выбора способа оплаты
        setPaymentDialogOpen(true);
      } catch (stateError) {setErrorMessage('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
      }
    } catch (error: any) {// Безопасно показываем сообщение об ошибке
      try {
        setErrorMessage('Не удалось открыть окно покупки. Пожалуйста, попробуйте еще раз.');
      } catch (messageError) {}
    }
  };
  
  // Обработчик выбора способа оплаты с усиленной обработкой ошибок
  const handleSelectPaymentMethod = (boostId: number, paymentMethod: 'internal_balance' | 'external_wallet') => {
    try {
      // Проверка валидности ID буста
      if (boostId === undefined || boostId === null || isNaN(boostId)) {setErrorMessage('Недействительный ID буста. Пожалуйста, попробуйте снова.');
        setPaymentDialogOpen(false);
        return;
      }
      
      // Проверка валидности способа оплаты
      if (!paymentMethod || (paymentMethod !== 'internal_balance' && paymentMethod !== 'external_wallet')) {setErrorMessage('Выбран недействительный способ оплаты. Пожалуйста, попробуйте снова.');
        setPaymentDialogOpen(false);
        return;
      }
      
      // Проверка ID пользователя
      if (!userId) {setErrorMessage('Сессия пользователя не найдена. Пожалуйста, обновите страницу.');
        setPaymentDialogOpen(false);
        return;
      }
      
      try {
        // Запускаем мутацию покупки буста
        buyTonBoostMutation.mutate({ boostId, paymentMethod });
      } catch (mutationError) {setErrorMessage('Не удалось выполнить платеж. Пожалуйста, попробуйте еще раз.');
        setPaymentDialogOpen(false);
      }
    } catch (error: any) {// Безопасно показываем сообщение об ошибке и закрываем диалог
      try {
        setErrorMessage('Не удалось выполнить платеж. Пожалуйста, попробуйте еще раз.');
        setPaymentDialogOpen(false);
      } catch (stateError) {}
    }
  };
  
  // Обработчик завершения внешнего платежа с защитой от ошибок
  const handlePaymentComplete = () => {
    try {
      // Проверка ID пользователя
      if (!userId) {// Даже если ID пользователя отсутствует, мы всё равно попытаемся обновить кэш
      }
      
      // Обновляем данные последовательно с обработкой ошибок для каждого вызова
      const invalidatePromises: Promise<void>[] = [];
      
      try {
        invalidatePromises.push(invalidateQueryWithUserId('/api/v2/users'));
      } catch (userError) {}
      
      try {
        invalidatePromises.push(invalidateQueryWithUserId('/api/v2/wallet/balance'));
      } catch (balanceError) {}
      
      try {
        invalidatePromises.push(invalidateQueryWithUserId('/api/v2/transactions'));
      } catch (transactionsError) {}
      
      try {
        invalidatePromises.push(invalidateQueryWithUserId('/api/v2/ton-farming/active'));
      } catch (boostsError) {}
      
      // Ждем завершения всех запросов (даже если некоторые из них завершатся с ошибкой)
      Promise.allSettled(invalidatePromises).then(() => {
        try {
          // Закрываем диалог статуса платежа
          setPaymentStatusDialogOpen(false);
          
          // Показываем сообщение об успехе
          setSuccessMessage('TON Boost успешно активирован! Бонусные UNI зачислены на ваш баланс.');
        } catch (stateError) {// Последняя попытка закрыть диалог
          try {
            setPaymentStatusDialogOpen(false);
            setSuccessMessage('Платеж выполнен, обновите страницу для проверки результата.');
          } catch {}
        }
      });
    } catch (error: any) {// Пытаемся всё же закрыть диалог и показать сообщение об успехе
      try {
        setPaymentStatusDialogOpen(false);
        setSuccessMessage('Платеж выполнен, но возникла ошибка при обновлении данных. Пожалуйста, обновите страницу.');
      } catch (err) {}
    }
  };
  
  return (
    <div className="mt-8 px-2 min-h-full scrollable">
      <h2 className="text-xl font-semibold mb-6 text-center">
        <span className="inline-flex items-center gap-2">
          <Sparkles size={20} className="text-indigo-400" />
          <span>Airdrop Boost Пакеты</span>
        </span>
      </h2>
      
      {/* Модальное окно выбора способа оплаты с защитой от ошибок */}
      <PaymentMethodDialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          try {
            setPaymentDialogOpen(open);
          } catch (error) {}
        }}
        boostId={selectedBoostId || 1}
        boostName={selectedBoostName || "Boost"}
        boostPriceTon={(() => {
          try {
            if (!selectedBoostId) return "1";
            
            const selectedBoost = getSafeBoostPackage(selectedBoostId);
            if (!selectedBoost || !selectedBoost.price) return "1";
            
            const priceParts = selectedBoost.price.split(' ');
            return priceParts[0] || "1";
          } catch (error) {return "1";
          }
        })()}
        onSelectPaymentMethod={(boostId, paymentMethod) => {
          try {
            handleSelectPaymentMethod(boostId, paymentMethod);
          } catch (error) {// Пытаемся показать сообщение об ошибке
            try {
              setErrorMessage('Не удалось выполнить платеж. Пожалуйста, попробуйте позже.');
              setPaymentDialogOpen(false);
            } catch {}
          }
        }}
      />
      
      {/* Модальное окно статуса внешнего платежа с защитой от ошибок */}
      <ExternalPaymentStatus
        open={paymentStatusDialogOpen}
        onOpenChange={(open) => {
          try {
            setPaymentStatusDialogOpen(open);
          } catch (error) {}
        }}
        userId={userId !== undefined && userId !== null ? userId : 0}
        transactionId={(() => {
          try {
            return paymentTransaction?.transactionId || 0;
          } catch (error) {return 0;
          }
        })()}
        paymentLink={(() => {
          try {
            return paymentTransaction?.paymentLink || "";
          } catch (error) {return "";
          }
        })()}
        boostName={selectedBoostName || "Boost"}
        onPaymentComplete={() => {
          try {
            handlePaymentComplete();
          } catch (error) {// Пытаемся закрыть диалог в любом случае
            try {
              setPaymentStatusDialogOpen(false);
              setSuccessMessage('Платеж обработан. Пожалуйста, проверьте результат.');
            } catch {}
          }
        }}
      />
      
      {/* Сообщение об успехе */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded-lg text-green-300 text-center">
          {successMessage}
        </div>
      )}
      
      {/* Сообщение об ошибке */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-300 text-center">
          {errorMessage}
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-8 max-w-2xl mx-auto">
        {boostPackages.map((boost) => {
          // Защищенный доступ к цене в UNI с обработкой потенциальных ошибок
          let uniPriceDisplay = '0 UNI';
          try {
            const boostUniPrice = getSafeBoostUniPrice(boost.id);
            if (boostUniPrice && boostUniPrice !== '0') {
              try {
                const priceValue = parseInt(boostUniPrice);
                if (!isNaN(priceValue)) {
                  uniPriceDisplay = `${priceValue.toLocaleString()} UNI`;
                } else {uniPriceDisplay = `${boostUniPrice} UNI`;
                }
              } catch (parseError) {uniPriceDisplay = `${boostUniPrice} UNI`;
              }
            }
          } catch (priceError) {}
          
          return (
            <div 
              key={boost.id} 
              className={`relative bg-gradient-to-br ${boost.color || 'from-blue-500 to-indigo-600'} rounded-xl overflow-hidden transition-all duration-300 hover:transform hover:scale-[1.02] group shadow-lg ${boost.popular ? 'ring-2 ring-white/30 ring-offset-2 ring-offset-background z-10' : ''}`}
            >
              {/* Shine effect overlay */}
              <div className="absolute inset-0 bg-white opacity-[0.03] transform rotate-45 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              
              {/* Popular badge */}
              {boost.popular && (
                <div className="absolute -top-1 -right-1 bg-white/90 text-xs font-medium px-2 py-1 rounded-bl-lg rounded-tr-xl text-purple-700 shadow-md backdrop-blur-sm z-10 transform rotate-12 animate-pulse">
                  Популярный 🔥
                </div>
              )}
              
              <div className="relative p-8 flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                      {boost.icon}
                    </div>
                    <h3 className="font-bold text-xl text-white">{boost.name}</h3>
                  </div>
                  <div className="bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="text-white font-bold">{boost.price}</span>
                  </div>
                </div>
                
                {/* Content */}
                <div className="mb-5 space-y-4 flex-grow backdrop-blur-[2px]">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/10">
                    <span className="text-sm text-white/80 flex items-center gap-2 min-w-[120px]">
                      <TrendingUp size={14} className="text-white/70" />
                      Доход в TON:
                    </span>
                    <span className="text-white font-semibold text-right">{boost.tonDailyYield}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/10">
                    <span className="text-sm text-white/80 flex items-center gap-2 min-w-[120px]">
                      <Sparkles size={14} className="text-white/70" />
                      Бонус UNI:
                    </span>
                    <span className="text-white font-semibold text-right">{boost.uniBonus}</span>
                  </div>

                </div>
                
                {/* Button */}
                <button 
                  className="w-full py-3 px-4 rounded-lg font-medium bg-white/20 backdrop-blur-sm text-white transition-all duration-300 hover:bg-white/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/20 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  disabled={purchasingBoostId === boost.id}
                  onClick={() => handleBuyBoost(boost.id)}
                >
                  {purchasingBoostId === boost.id ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Покупка...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="opacity-80" />
                      <span>Buy Boost</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BoostPackagesCard;