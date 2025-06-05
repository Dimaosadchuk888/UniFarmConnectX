import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { apiRequest, invalidateQueryWithUserId } from '@/lib/queryClient';
import BigNumber from 'bignumber.js';
import { useUser } from '@/contexts/userContext';
import { useNotification } from '@/contexts/NotificationContext';

interface UniFarmingCardProps {
  userData: any;
}

interface FarmingInfo {
  isActive: boolean;
  depositAmount: string;
  ratePerSecond: string;
  depositCount?: number;
  totalDepositAmount?: string;
  totalRatePerSecond?: string;
  dailyIncomeUni?: string;
  startDate?: string | null;
  uni_farming_start_timestamp?: string | null;
}

const UniFarmingCard: React.FC<UniFarmingCardProps> = ({ userData }) => {
  try {
    const queryClient = useQueryClient();
    const userContext = useUser();
    const { userId } = userContext;
    const { success, error: showError } = useNotification();
    
    const [depositAmount, setDepositAmount] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const depositRequestSent = useRef<boolean>(false);

    // Safe farming data query with comprehensive error handling
    const farmingResponse = useQuery({
      queryKey: ['uni-farming-status', userId],
      refetchInterval: 15000,
      enabled: !!userId,
      retry: false,
      queryFn: async () => {
        try {
          const response = await correctApiRequest(
            `/api/v2/uni-farming/status?user_id=${userId || 1}`, 
            'GET'
          );
          
          if (response && typeof response === 'object') {
            return response;
          }
          
          return {
            success: true,
            data: {
              isActive: false,
              depositAmount: '0.000000',
              ratePerSecond: '0.000000',
              totalRatePerSecond: '0.000000',
              depositCount: 0,
              totalDepositAmount: '0.000000',
              dailyIncomeUni: '0',
              startDate: null,
              lastUpdate: null
            }
          };
        } catch (error: any) {
          return {
            success: true,
            data: {
              isActive: false,
              depositAmount: '0.000000',
              ratePerSecond: '0.000000',
              totalRatePerSecond: '0.000000',
              depositCount: 0,
              totalDepositAmount: '0.000000',
              dailyIncomeUni: '0',
              startDate: null,
              lastUpdate: null
            }
          };
        }
      }
    });

    // Safe farming info extraction
    const farmingInfo: FarmingInfo = farmingResponse?.data?.data || {
      isActive: false,
      depositAmount: '0.000000',
      ratePerSecond: '0.000000',
      totalRatePerSecond: '0.000000',
      depositCount: 0,
      totalDepositAmount: '0.000000',
      dailyIncomeUni: '0',
      startDate: null
    };

    const isActive = farmingInfo.isActive || false;
    const currentDepositAmount = farmingInfo.depositAmount || '0.000000';
    const ratePerSecond = farmingInfo.ratePerSecond || '0.000000';
    const totalDepositAmount = farmingInfo.totalDepositAmount || '0.000000';
    const depositCount = farmingInfo.depositCount || 0;

    // Safe deposit mutation
    const depositMutation = useMutation({
      mutationFn: async (amount: string) => {
        try {
          return await correctApiRequest('/api/v2/uni-farming/deposit', 'POST', {
            user_id: userId,
            amount: amount
          });
        } catch (error: any) {
          throw new Error('Deposit failed');
        }
      },
      onSuccess: () => {
        setDepositAmount('');
        setError(null);
        success('Депозит успешно размещен!');
        queryClient.invalidateQueries({ queryKey: ['uni-farming-status'] });
      },
      onError: (error: any) => {
        setError('Ошибка при размещении депозита');
        showError('Ошибка при размещении депозита');
      }
    });

    // Safe format functions
    const formatNumber = (value: string | number): string => {
      try {
        const num = new BigNumber(value || 0);
        return num.toFixed(6);
      } catch (error) {
        return '0.000000';
      }
    };

    const calculateDailyIncome = (): string => {
      try {
        const rateNum = new BigNumber(ratePerSecond || 0);
        return rateNum.multipliedBy(86400).toFixed(2);
      } catch (error) {
        return '0.00';
      }
    };

    const handleDeposit = async () => {
      if (isSubmitting || !depositAmount) return;
      
      try {
        setIsSubmitting(true);
        setError(null);
        await depositMutation.mutateAsync(depositAmount);
      } catch (error) {
        setError('Ошибка при размещении депозита');
      } finally {
        setIsSubmitting(false);
      }
    };

    // Render component
    return (
      <div className="bg-card rounded-xl p-4 mb-5 shadow-md">
        <h2 className="text-xl font-semibold mb-3 text-primary">Основной UNI пакет</h2>

        {isActive && (
          <div className="mb-5">
            <div className="mb-4 p-3 bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-500/30 rounded-lg flex items-center">
              <div className="flex items-center justify-center w-8 h-8 mr-3 bg-green-500/20 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm text-green-300 font-medium">Фарминг активен</p>
                <p className="text-xs text-green-200/70 mt-1">Доход начисляется автоматически</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-2 rounded-lg">
                <p className="text-sm text-foreground opacity-70">Общая сумма депозитов</p>
                <p className="text-lg font-medium">{formatNumber(totalDepositAmount)} UNI</p>
              </div>
              <div className="p-2 rounded-lg">
                <p className="text-sm text-foreground opacity-70">Дневной доход</p>
                <p className="text-lg font-medium text-green-400">{calculateDailyIncome()} UNI</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded">
            <span className="text-sm text-muted-foreground">Дневной доход:</span>
            <span className="text-sm font-medium text-accent">0.5% в день</span>
          </div>
          <div className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded">
            <span className="text-sm text-muted-foreground">Минимальная сумма:</span>
            <span className="text-sm font-medium">10 UNI</span>
          </div>
          <div className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded">
            <span className="text-sm text-muted-foreground">Автоначисление:</span>
            <span className="text-sm font-medium text-accent">Каждую секунду</span>
          </div>
        </div>

        {!isActive && (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Сумма депозита (UNI)</label>
              <input
                type="number"
                min="10"
                step="0.000001"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Минимум 10 UNI"
                className="w-full p-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handleDeposit}
              disabled={isSubmitting || !depositAmount || parseFloat(depositAmount) < 10}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Размещение...' : 'Разместить депозит'}
            </button>
          </div>
        )}
      </div>
    );
  } catch (componentError) {
    // Critical fallback if entire component fails
    return (
      <div className="bg-card border border-border rounded-lg p-6 mb-4">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-primary text-2xl">🌱</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">UNI Фарминг</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Зарабатывайте UNI токены пассивно, размещая их в фарминг
            </p>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded">
              <span className="text-sm text-muted-foreground">Дневной доход:</span>
              <span className="text-sm font-medium text-accent">0.5% в день</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded">
              <span className="text-sm text-muted-foreground">Минимальная сумма:</span>
              <span className="text-sm font-medium">10 UNI</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded">
              <span className="text-sm text-muted-foreground">Автоначисление:</span>
              <span className="text-sm font-medium text-accent">Каждую секунду</span>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Подключите Telegram для активации фарминга
          </div>
        </div>
      </div>
    );
  }
};

export default UniFarmingCard;