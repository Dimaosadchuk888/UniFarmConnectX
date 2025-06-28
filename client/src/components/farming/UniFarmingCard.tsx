import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { useToast } from '../../hooks/use-toast';
import { useUser } from '../../contexts/userContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import QueryErrorBoundary from '../../components/common/QueryErrorBoundary';

interface UniFarmingCardProps {
  userData?: any;
}

/**
 * Компонент карточки UNI фарминга
 */
const UniFarmingCardComponent: React.FC<UniFarmingCardProps> = ({ userData }) => {
  const { userId } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Получение данных фарминга
  const { data: farmingData } = useQuery({
    queryKey: userId ? [`/api/v2/farming/status`] : [],
    enabled: !!userId,
  });

  // Мутация для депозита
  const depositMutation = useMutation({
    mutationFn: async (amount: number) => {
      return apiRequest('/api/v2/farming/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Успешно',
        description: 'Депозит успешно создан',
        variant: 'default',
      });
      setDepositAmount('');
      queryClient.invalidateQueries({ queryKey: [`/api/v2/farming/status`] });
      queryClient.invalidateQueries({ queryKey: [`/api/v2/users/${userId}`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать депозит',
        variant: 'destructive',
      });
    },
  });

  // Мутация для сбора наград
  const harvestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/v2/farming/harvest', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Успешно',
        description: 'Награды собраны',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/v2/farming/status`] });
      queryClient.invalidateQueries({ queryKey: [`/api/v2/users/${userId}`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось собрать награды',
        variant: 'destructive',
      });
    },
  });

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Ошибка',
        description: 'Введите корректную сумму',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      await depositMutation.mutateAsync(amount);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHarvest = async () => {
    setIsProcessing(true);
    try {
      await harvestMutation.mutateAsync();
    } finally {
      setIsProcessing(false);
    }
  };

  const activeDeposit = (farmingData as any)?.data?.active_deposit || 0;
  const pendingRewards = (farmingData as any)?.data?.pending_rewards || 0;
  const dailyRate = 0.01; // 1% в день
  const dailyIncome = activeDeposit * dailyRate;

  // Если нет userId, показываем информационную карточку
  if (!userId) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">
            <i className="fas fa-seedling text-green-400 mr-2"></i>
            UNI Фарминг
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-yellow-500/10 border-yellow-500/20">
            <AlertDescription className="text-yellow-400">
              <i className="fas fa-info-circle mr-2"></i>
              Авторизуйтесь для начала фарминга
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white">
          <i className="fas fa-seedling text-green-400 mr-2"></i>
          UNI Фарминг
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Статус фарминга */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-400">Активный депозит</p>
              <p className="text-2xl font-bold text-white">{activeDeposit.toFixed(2)} UNI</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Доход в день</p>
              <p className="text-2xl font-bold text-green-400">+{dailyIncome.toFixed(2)} UNI</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-400">Накопленные награды</p>
            <p className="text-xl font-bold text-yellow-400">{pendingRewards.toFixed(2)} UNI</p>
          </div>
        </div>

        {/* Форма депозита */}
        <div className="space-y-3">
          <Label className="text-gray-300">Сумма депозита</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.00"
              className="bg-gray-800 border-gray-700 text-white"
              disabled={isProcessing}
            />
            <Button
              onClick={handleDeposit}
              disabled={isProcessing || depositMutation.isPending}
              className="bg-primary hover:bg-primary/80"
            >
              {isProcessing || depositMutation.isPending ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                'Депозит'
              )}
            </Button>
          </div>
        </div>

        {/* Кнопка сбора наград */}
        {pendingRewards > 0 && (
          <Button
            onClick={handleHarvest}
            disabled={isProcessing || harvestMutation.isPending}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
          >
            {isProcessing || harvestMutation.isPending ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Обработка...
              </>
            ) : (
              <>
                <i className="fas fa-hand-holding-usd mr-2"></i>
                Собрать награды ({pendingRewards.toFixed(2)} UNI)
              </>
            )}
          </Button>
        )}

        {/* Информация о доходности */}
        <Alert className="bg-blue-500/10 border-blue-500/20">
          <AlertDescription className="text-blue-400 text-sm">
            <i className="fas fa-info-circle mr-2"></i>
            Доходность: {(dailyRate * 100).toFixed(1)}% в день
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

// Обёртка с ErrorBoundary
const UniFarmingCard: React.FC<UniFarmingCardProps> = ({ userData }) => {
  const queryClient = useQueryClient();
  const { userId } = useUser();
  
  const handleReset = () => {
    if (userId) {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/v2/farming/status'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/v2/users/${userId}`] 
      });
    }
  };
  
  return (
    <QueryErrorBoundary
      onReset={handleReset}
      queryKey={userId ? ['/api/v2/farming/status'] : undefined}
      errorTitle="Ошибка загрузки фарминга"
      errorDescription="Не удалось загрузить данные фарминга. Пожалуйста, обновите страницу или повторите позже."
      resetButtonText="Обновить данные"
    >
      <UniFarmingCardComponent userData={userData} />
    </QueryErrorBoundary>
  );
};

export default UniFarmingCard;