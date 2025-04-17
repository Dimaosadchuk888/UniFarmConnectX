import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { format } from 'date-fns';
import PaymentMethodDialog from '../ton-boost/PaymentMethodDialog';

// Определяем структуру буст-пакета
interface BoostPackage {
  id: number;
  name: string;
  price: string;
  tonDailyYield: string;
  uniBonus: string;
}

// Создаем массив с буст-пакетами и их ценой в UNI
const boostPackages: BoostPackage[] = [
  {
    id: 1,
    name: 'Boost 1',
    price: '1 TON',
    tonDailyYield: '+0.5%/день',
    uniBonus: '+10,000 UNI'
  },
  {
    id: 2,
    name: 'Boost 5',
    price: '5 TON',
    tonDailyYield: '+1%/день',
    uniBonus: '+75,000 UNI'
  },
  {
    id: 3,
    name: 'Boost 15',
    price: '15 TON',
    tonDailyYield: '+2%/день',
    uniBonus: '+250,000 UNI'
  },
  {
    id: 4,
    name: 'Boost 25',
    price: '25 TON',
    tonDailyYield: '+2.5%/день',
    uniBonus: '+500,000 UNI'
  }
];

// Соответствие между ID буста и ценой в UNI
const boostPricesUni: Record<number, string> = {
  1: '100000',  // 100,000 UNI за Boost 1
  2: '500000',  // 500,000 UNI за Boost 5
  3: '1500000', // 1,500,000 UNI за Boost 15
  4: '2500000'  // 2,500,000 UNI за Boost 25
};

// Интерфейс свойств компонента для ребята пропсов
interface BoostPackagesCardProps {
  userData?: any;
}

const BoostPackagesCard: React.FC<BoostPackagesCardProps> = ({ userData }) => {
  const [purchasingBoostId, setPurchasingBoostId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState<boolean>(false);
  const [selectedBoostId, setSelectedBoostId] = useState<number | null>(null);
  const [selectedBoostName, setSelectedBoostName] = useState<string>('');
  
  const queryClient = useQueryClient();
  
  // Пользовательский ID (хардкод для демонстрации)
  const userId = 1;
  
  // Мутация для покупки TON буста
  const buyTonBoostMutation = useMutation({
    mutationFn: async ({ boostId, paymentMethod }: { boostId: number, paymentMethod: 'internal_balance' | 'external_wallet' }) => {
      const response = await apiRequest('POST', '/api/ton-boosts/purchase', {
        user_id: userId,
        boost_id: boostId,
        payment_method: paymentMethod
      });
      return response.json();
    },
    onMutate: ({ boostId }) => {
      // Сохраняем ID буста, который покупается
      setPurchasingBoostId(boostId);
      // Сбрасываем сообщения
      setErrorMessage(null);
      setSuccessMessage(null);
    },
    onSuccess: (data) => {
      if (data.success) {
        // Показываем сообщение об успехе
        setSuccessMessage(data.message || 'Буст успешно приобретен!');
        
        // Если оплата через внешний кошелек, отображаем ссылку на оплату
        if (data.data.paymentMethod === 'external_wallet' && data.data.paymentLink) {
          window.open(data.data.paymentLink, '_blank');
        }
        
        // Инвалидируем кэш для обновления баланса и транзакций
        queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: [`/api/ton-boosts/active`] });
      } else {
        // Показываем сообщение об ошибке
        setErrorMessage(data.message || 'Произошла ошибка при покупке буста');
      }
    },
    onError: (error: any) => {
      // Показываем сообщение об ошибке
      setErrorMessage(error.message || 'Произошла ошибка при покупке буста');
    },
    onSettled: () => {
      // Сбрасываем ID буста после завершения операции
      setPurchasingBoostId(null);
      // Закрываем модальное окно
      setPaymentDialogOpen(false);
    }
  });
  
  // Проверяем, может ли пользователь купить буст
  const canBuyBoost = (boostId: number): boolean => {
    if (!userData || !userData.balance_ton) return false;
    
    // Для упрощения, считаем, что пользователь всегда может купить буст
    // В реальном приложении здесь будет проверка баланса TON
    return true;
  };
  
  // Обработчик нажатия на кнопку "Buy Boost"
  const handleBuyBoost = (boostId: number) => {
    // Находим имя выбранного буста
    const selectedBoost = boostPackages.find(boost => boost.id === boostId);
    if (selectedBoost) {
      setSelectedBoostId(boostId);
      setSelectedBoostName(selectedBoost.name);
      setPaymentDialogOpen(true);
    }
  };
  
  // Обработчик выбора способа оплаты
  const handleSelectPaymentMethod = (boostId: number, paymentMethod: 'internal_balance' | 'external_wallet') => {
    buyTonBoostMutation.mutate({ boostId, paymentMethod });
  };
  
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-6 text-center">Airdrop Boost Пакеты</h2>
      
      {/* Модальное окно выбора способа оплаты */}
      <PaymentMethodDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        boostId={selectedBoostId}
        boostName={selectedBoostName}
        onSelectPaymentMethod={handleSelectPaymentMethod}
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
      
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
        {boostPackages.map((boost) => (
          <div 
            key={boost.id} 
            className="bg-card rounded-xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl border border-indigo-200 dark:border-indigo-800 flex flex-col h-full w-full"
            style={{ boxShadow: '0 8px 20px rgba(162, 89, 255, 0.15)' }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl text-white">{boost.name}</h3>
              <span className="text-[#6DBFFF] font-bold">{boost.price}</span>
            </div>
            
            <div className="mb-6 space-y-4 flex-grow">
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground opacity-70">Доход в TON:</span>
                <span className="text-[#6DBFFF] font-semibold">{boost.tonDailyYield}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground opacity-70">Бонус UNI:</span>
                <span className="text-[#00D364] font-semibold">{boost.uniBonus}</span>
              </div>
              
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-foreground opacity-70">Цена в UNI:</span>
                <span className="text-primary font-semibold">
                  {parseInt(boostPricesUni[boost.id]).toLocaleString()} UNI
                </span>
              </div>
            </div>
            
            {/* Кнопка Buy Boost */}
            <button 
              className="w-full py-3 px-4 rounded-lg font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white transition-all duration-300 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={purchasingBoostId !== null || !userData || !canBuyBoost(boost.id)}
              onClick={() => handleBuyBoost(boost.id)}
            >
              {purchasingBoostId === boost.id ? 'Покупка...' : 'Buy Boost'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoostPackagesCard;