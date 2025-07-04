import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, TrendingUp, DollarSign, Share2, Clock } from 'lucide-react';

interface ReferralData {
  user: string;
  refCode: string;
  totalReferrals: number;
  activeReferrals: number;
  referralEarnings: number;
  timestamp: string;
  source: string;
}

const SimpleReferralCard: React.FC = () => {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/v2/referrals/stats?user_id=48');
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          setError('Ошибка загрузки данных');
        }
      } catch (err) {
        setError('Ошибка сети');
        console.error('Referral data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReferralData();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchReferralData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (value: number): string => {
    if (value === 0) return '0';
    if (Math.abs(value) >= 1000) {
      return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
    }
    return value.toFixed(6);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Партнерская программа
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Users className="h-5 w-5" />
            Ошибка загрузки
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{error || 'Не удалось загрузить данные'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Партнерская программа
        </CardTitle>
        <CardDescription>
          Ваша реферальная статистика и партнерские доходы
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
                onClick={() => {
                  navigator.clipboard.writeText(data.refCode);
                  alert('Код скопирован!');
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Скопировать
              </button>
            </div>
          </div>
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

export default SimpleReferralCard;