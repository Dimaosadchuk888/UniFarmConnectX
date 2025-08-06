import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TestTube } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useUser } from '@/contexts/userContext';
import { DepositMonitor } from '@/services/depositMonitor';

/**
 * Компонент для тестирования депозита в Preview режиме
 */
export const TestDepositButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { userId, refreshBalance } = useUser();

  const runDepositSimulation = async () => {
    console.log('=== НАЧАЛО СИМУЛЯЦИИ ДЕПОЗИТА (PREVIEW MODE) ===');
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Логируем начало
      DepositMonitor.logDeposit('PREVIEW_TEST_START', {
        userId,
        mode: 'Replit Preview',
        timestamp: Date.now()
      });

      // Генерируем тестовые данные
      const testData = {
        ton_tx_hash: `PREVIEW_TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: 0.1,
        wallet_address: `UQPreview_Test_Wallet_${userId || 'unknown'}`
      };

      console.log('📋 Тестовые данные:', testData);
      
      DepositMonitor.logDeposit('PREVIEW_TEST_REQUEST', {
        userId,
        testData
      });

      // Отправляем запрос через apiRequest (с JWT)
      console.log('📤 Отправка на /api/v2/wallet/ton-deposit...');
      
      const response = await apiRequest('/api/v2/wallet/ton-deposit', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      console.log('📥 Ответ от backend:', response);
      
      DepositMonitor.logDeposit('PREVIEW_TEST_RESPONSE', {
        userId,
        success: response?.success,
        error: response?.error,
        transactionId: response?.transaction_id
      });

      if (response?.success) {
        setResult({
          success: true,
          message: 'Депозит успешно обработан!',
          transactionId: response.transaction_id,
          data: response
        });
        
        // Обновляем баланс
        console.log('🔄 Обновление баланса...');
        setTimeout(() => {
          refreshBalance(true);
        }, 1000);
      } else {
        throw new Error(response?.error || 'Неизвестная ошибка');
      }

    } catch (err: any) {
      console.error('❌ Ошибка симуляции:', err);
      
      DepositMonitor.logDeposit('PREVIEW_TEST_ERROR', {
        userId,
        error: err.message || err,
        stack: err.stack
      });
      
      setError(err.message || 'Ошибка при выполнении симуляции');
      setResult({
        success: false,
        error: err.message
      });
    } finally {
      setIsLoading(false);
      console.log('=== КОНЕЦ СИМУЛЯЦИИ ===');
      
      // Выводим сводку по депозитам
      const summary = DepositMonitor.getDepositSummary();
      console.log('📊 Сводка по депозитам:', summary);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-4 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Тест депозита (Preview Mode)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Это тестовая симуляция для Preview режима.
            Нажмите кнопку чтобы проверить всю цепочку обработки депозита.
          </AlertDescription>
        </Alert>

        <Button
          onClick={runDepositSimulation}
          disabled={isLoading}
          className="w-full"
          variant="outline"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Выполняется симуляция...
            </>
          ) : (
            'Запустить тест депозита'
          )}
        </Button>

        {result && (
          <Alert className={result.success ? 'border-green-500' : 'border-red-500'}>
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-semibold">
                  {result.success ? '✅ Успех' : '❌ Ошибка'}
                </div>
                <div className="text-sm">
                  {result.message || result.error}
                </div>
                {result.transactionId && (
                  <div className="text-xs text-gray-500">
                    Transaction ID: {result.transactionId}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="border-red-500">
            <AlertDescription className="text-red-600">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-gray-500">
          Откройте консоль разработчика (F12) для детальных логов
        </div>
      </CardContent>
    </Card>
  );
};