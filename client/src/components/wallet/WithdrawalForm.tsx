import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { useToast } from '../../hooks/use-toast';
import { useUser } from '../../contexts/userContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import QueryErrorBoundary from '../../components/common/QueryErrorBoundary';

// Схема валидации
const withdrawalSchema = z.object({
  currency: z.enum(['UNI', 'TON']),
  amount: z.string().min(1, 'Введите сумму'),
  wallet_address: z.string().min(1, 'Введите адрес кошелька').refine(
    (val) => {
      const tonAddressRegex = /^(?:UQ|EQ)[A-Za-z0-9_-]{46,48}$/;
      return tonAddressRegex.test(val);
    },
    { message: 'Некорректный формат TON-адреса' }
  ),
});

type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

/**
 * Компонент формы вывода средств с встроенной обработкой ошибок
 */
const WithdrawalFormComponent: React.FC = () => {
  const { userId } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Получение балансов
  const { data: userBalance } = useQuery({
    queryKey: userId ? [`/api/v2/users/${userId}`] : [],
    enabled: !!userId,
  });

  const form = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      currency: 'TON',
      amount: '',
      wallet_address: '',
    },
  });

  // Мутация для вывода средств
  const withdrawMutation = useMutation({
    mutationFn: async (data: WithdrawalFormData) => {
      if (!userId) throw new Error('Пользователь не авторизован');
      
      return apiRequest(`/api/v2/wallet/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Успешно',
        description: 'Запрос на вывод средств создан',
        variant: 'default',
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/v2/users/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/v2/wallet/transactions`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать запрос на вывод',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: WithdrawalFormData) => {
    setIsProcessing(true);
    try {
      await withdrawMutation.mutateAsync(data);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedCurrency = form.watch('currency');
  const currentBalance = selectedCurrency === 'UNI' 
    ? (userBalance as any)?.data?.balance_uni || 0
    : (userBalance as any)?.data?.balance_ton || 0;

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          <i className="fas fa-minus-circle text-red-400"></i>
          Вывод средств
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Валюта</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Выберите валюту" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UNI">UNI</SelectItem>
                      <SelectItem value="TON">TON</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">
                    Сумма (доступно: {currentBalance.toFixed(2)} {selectedCurrency})
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      max={currentBalance}
                      placeholder="0.00"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="wallet_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Адрес кошелька TON</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="UQ..."
                      className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Alert className="bg-yellow-500/10 border-yellow-500/20">
              <AlertDescription className="text-yellow-400 text-sm">
                <i className="fas fa-info-circle mr-2"></i>
                Минимальная сумма вывода: 10 {selectedCurrency}. 
                Комиссия сети будет вычтена из суммы.
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              disabled={isProcessing || withdrawMutation.isPending}
              className="w-full bg-red-500 hover:bg-red-600 text-white"
            >
              {isProcessing || withdrawMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Обработка...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  Вывести средства
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

// Обёртка с ErrorBoundary
const WithdrawalForm: React.FC = () => {
  const queryClient = useQueryClient();
  const { userId } = useUser();
  
  const handleReset = () => {
    if (userId) {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/v2/users', userId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/v2/wallet', userId] 
      });
    }
  };
  
  return (
    <QueryErrorBoundary
      onReset={handleReset}
      queryKey={userId ? ['/api/v2/wallet', userId] : undefined}
      errorTitle="Ошибка загрузки формы вывода"
      errorDescription="Не удалось загрузить форму вывода средств. Пожалуйста, обновите страницу или повторите позже."
      resetButtonText="Обновить форму"
    >
      <WithdrawalFormComponent />
    </QueryErrorBoundary>
  );
};

export default WithdrawalForm;