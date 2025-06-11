import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign } from 'lucide-react';

export default function IncomeCard() {
  const { data: incomeData, isLoading } = useQuery<{
    success: boolean;
    data: {
      totalBalance: number;
      totalEarnings: number;
      dailyIncome: number;
      weeklyIncome: number;
      monthlyIncome: number;
    };
  }>({
    queryKey: ['/api/v2/income/summary'],
  });

  const income = incomeData?.data || {
    totalBalance: 0,
    totalEarnings: 0,
    dailyIncome: 0,
    weeklyIncome: 0,
    monthlyIncome: 0,
  };

  if (isLoading) {
    return (
      <Card className="card-hover-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Доходы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-16 bg-muted animate-pulse rounded" />
              <div className="h-16 bg-muted animate-pulse rounded" />
              <div className="h-16 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover-effect">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          Доходы
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Общий баланс */}
          <div className="text-center">
            <div className="text-3xl font-bold green-gradient-text">
              ${income.totalBalance.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Общий баланс</p>
          </div>

          {/* Статистика доходов */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-lg font-semibold">
                  ${income.dailyIncome.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">За день</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-lg font-semibold">
                  ${income.weeklyIncome.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">За неделю</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-lg font-semibold">
                  ${income.monthlyIncome.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">За месяц</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}