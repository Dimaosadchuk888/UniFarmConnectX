import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FiCopy as Copy, FiUsers as Users, FiTrendingUp as TrendingUp, FiGift as Gift } from 'react-icons/fi';
import { useToast } from '@/hooks/use-toast';

interface ReferralData {
  ref_code: string;
  referral_link: string;
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    totalEarned: {
      UNI: string;
      TON: string;
    };
    monthlyEarned: {
      UNI: string;
      TON: string;
    };
  };
}

interface ReferralLevel {
  level: number;
  referrals: number;
  commission: string;
  earnings: {
    UNI: string;
    TON: string;
  };
}

export const ReferralSystemFixed: React.FC = () => {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [referralLevels, setReferralLevels] = useState<ReferralLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Загрузка данных реферальной системы
  useEffect(() => {
    loadReferralData();
    loadReferralLevels();
  }, []);

  const loadReferralData = async () => {
    try {
      const userId = 48; // Production user ID
      const token = localStorage.getItem('unifarm_jwt_token');
      
      const response = await fetch(`/api/v2/referrals/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReferralData(data.data);
        } else {
          throw new Error(data.error || 'Ошибка загрузки данных');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('Error loading referral data:', err);
      setError('Не удалось загрузить данные реферальной программы');
    }
  };

  const loadReferralLevels = async () => {
    try {
      const token = localStorage.getItem('unifarm_jwt_token');
      
      const response = await fetch('/api/v2/referrals/levels', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Создаем демо-уровни на основе стандартной 20-уровневой системы
          const levels = Array.from({ length: 20 }, (_, i) => ({
            level: i + 1,
            referrals: i === 0 ? data.data.total_referrals || 0 : 0,
            commission: i === 0 ? '100%' : `${Math.max(20 - i, 1)}%`,
            earnings: i === 0 ? data.data.total_earnings || { UNI: "0", TON: "0" } : { UNI: "0", TON: "0" }
          }));
          setReferralLevels(levels);
        }
      }
    } catch (err) {
      console.error('Error loading referral levels:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (referralData?.referral_link) {
      navigator.clipboard.writeText(referralData.referral_link);
      toast({
        title: "Ссылка скопирована!",
        description: "Реферальная ссылка скопирована в буфер обмена",
      });
    }
  };

  const generateNewCode = async () => {
    try {
      const userId = 48;
      const token = localStorage.getItem('unifarm_jwt_token');
      
      const response = await fetch(`/api/v2/referrals/${userId}/code`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReferralData(prev => prev ? {
            ...prev,
            ref_code: data.data.ref_code,
            referral_link: data.data.referral_link
          } : null);
          
          toast({
            title: "Код обновлен!",
            description: "Новый реферальный код создан",
          });
        }
      }
    } catch (err) {
      console.error('Error generating new code:', err);
      toast({
        title: "Ошибка",
        description: "Не удалось создать новый код",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Перезагрузить
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600 font-medium">Всего рефералов</p>
                <p className="text-2xl font-bold text-blue-800">
                  {referralData?.stats?.totalReferrals || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600 font-medium">Доход UNI</p>
                <p className="text-2xl font-bold text-green-800">
                  {referralData?.stats?.totalEarned?.UNI || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Gift className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600 font-medium">Доход TON</p>
                <p className="text-2xl font-bold text-purple-800">
                  {referralData?.stats?.totalEarned?.TON || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Реферальная ссылка */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Ваша реферальная ссылка</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
            <code className="flex-1 text-sm font-mono">
              {referralData?.ref_code || 'Загрузка...'}
            </code>
            <Badge variant="secondary">Код</Badge>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={copyReferralLink}
              className="flex-1"
              disabled={!referralData?.referral_link}
            >
              <Copy className="h-4 w-4 mr-2" />
              Копировать ссылку
            </Button>
            <Button 
              onClick={generateNewCode}
              variant="outline"
            >
              Обновить код
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Уровни реферальной программы */}
      <Card>
        <CardHeader>
          <CardTitle>20-уровневая реферальная программа</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {referralLevels.slice(0, 10).map((level) => (
              <div 
                key={level.level}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <Badge variant={level.level === 1 ? "default" : "secondary"}>
                    Уровень {level.level}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Комиссия: {level.commission}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className="text-sm">
                    Рефералов: {level.referrals}
                  </span>
                  <span className="text-sm text-green-600 font-medium">
                    {level.earnings.UNI} UNI
                  </span>
                </div>
              </div>
            ))}
            
            {referralLevels.length > 10 && (
              <div className="text-center py-2">
                <span className="text-sm text-gray-500">
                  И еще {referralLevels.length - 10} уровней...
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};