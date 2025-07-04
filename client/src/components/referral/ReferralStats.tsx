import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { Users, TrendingUp, DollarSign, Share2, Clock, Star } from 'lucide-react';
// import { formatNumber } from '@/lib/utils';

// Временная функция форматирования для избежания проблем с импортом
const formatNumber = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue) || numValue === 0) return '0';
  if (Math.abs(numValue) >= 1000) {
    return numValue.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  }
  return numValue.toFixed(6);
};

interface ReferralLevel {
  id: number;
  username: string;
  level: number;
  balance_uni: number;
  balance_ton: number;
  referrals: ReferralLevel[];
}

interface ReferralStatsData {
  user: string;
  refCode: string;
  totalReferrals: number;
  activeReferrals: number;
  referralEarnings: number;
  levels: ReferralLevel[];
  timestamp: string;
  source: string;
}

const ReferralStats: React.FC = () => {
  const { data: statsData, isLoading, error } = useQuery<{ success: boolean; data: ReferralStatsData }>({
    queryKey: ['/api/v2/referrals/stats'],
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Партнерская программа
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !statsData?.success) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Users className="h-5 w-5" />
            Ошибка загрузки данных
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Не удалось загрузить статистику партнерской программы
          </p>
        </CardContent>
      </Card>
    );
  }

  const { data } = statsData;

  const renderReferralLevel = (level: ReferralLevel, depth: number = 0) => {
    const indent = depth * 20;
    
    return (
      <div key={level.id} className="space-y-2">
        <div 
          className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
          style={{ marginLeft: `${indent}px` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-sm">{level.username}</p>
              <p className="text-xs text-gray-500">Уровень {level.level}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {formatNumber(level.balance_uni)} UNI
              </Badge>
              <Badge variant="outline" className="text-xs">
                {formatNumber(level.balance_ton)} TON
              </Badge>
            </div>
          </div>
        </div>
        
        {level.referrals && level.referrals.map(subLevel => 
          renderReferralLevel(subLevel, depth + 1)
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Партнерская программа
        </CardTitle>
        <CardDescription>
          Ваша реферальная статистика и структура партнеров
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Основная статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg border">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Всего партнеров</p>
              <p className="text-2xl font-bold">{data.totalReferrals}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-lg border">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Активных</p>
              <p className="text-2xl font-bold">{data.activeReferrals}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-lg border">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Доходы</p>
              <p className="text-2xl font-bold">{formatNumber(data.referralEarnings)}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Реферальный код */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            <span className="text-sm font-medium">Ваш реферальный код</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">{data.refCode}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(data.refCode)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Скопировать
              </button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Структура партнеров */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            <span className="text-sm font-medium">Структура партнеров</span>
          </div>
          
          {data.levels.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data.levels.map(level => renderReferralLevel(level))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">У вас пока нет партнеров</p>
              <p className="text-xs mt-1">Поделитесь реферальным кодом для привлечения новых пользователей</p>
            </div>
          )}
        </div>

        {/* Метаинформация */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Обновлено: {new Date(data.timestamp).toLocaleString('ru-RU')}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {data.source === 'supabase-live-data' ? 'Реальные данные' : 'Тестовый режим'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralStats;