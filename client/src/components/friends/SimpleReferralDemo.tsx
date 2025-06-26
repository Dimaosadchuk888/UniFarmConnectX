import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FiCopy as Copy, FiUsers as Users, FiTrendingUp as TrendingUp, FiGift as Gift } from 'react-icons/fi';
import { useToast } from '@/hooks/use-toast';

export const SimpleReferralDemo: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Демо-данные для отображения
  const demoReferralData = {
    ref_code: "REF_DEMO_UNIFARM",
    referral_link: "https://t.me/UniFarming_Bot?start=REF_DEMO_UNIFARM",
    stats: {
      totalReferrals: 5,
      activeReferrals: 3,
      totalEarned: {
        UNI: "1250",
        TON: "0.5"
      },
      monthlyEarned: {
        UNI: "320",
        TON: "0.1"
      }
    }
  };

  const demoReferralLevels = Array.from({ length: 20 }, (_, i) => ({
    level: i + 1,
    referrals: i === 0 ? 5 : i === 1 ? 2 : 0,
    commission: i === 0 ? '100%' : `${Math.max(20 - i, 1)}%`,
    earnings: {
      UNI: i === 0 ? "500" : i === 1 ? "250" : "0",
      TON: i === 0 ? "0.2" : i === 1 ? "0.1" : "0"
    }
  }));

  const copyReferralLink = () => {
    navigator.clipboard.writeText(demoReferralData.referral_link);
    toast({
      title: "Ссылка скопирована!",
      description: "Реферальная ссылка скопирована в буфер обмена",
    });
  };

  const generateNewCode = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Функция в разработке",
        description: "Генерация нового кода будет доступна после исправления API",
        variant: "default"
      });
    }, 1000);
  };

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
                  {demoReferralData.stats.totalReferrals}
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
                  {demoReferralData.stats.totalEarned.UNI}
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
                  {demoReferralData.stats.totalEarned.TON}
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
              {demoReferralData.ref_code}
            </code>
            <Badge variant="secondary">Демо</Badge>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={copyReferralLink}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Копировать ссылку
            </Button>
            <Button 
              onClick={generateNewCode}
              variant="outline"
              disabled={loading}
            >
              {loading ? "..." : "Обновить код"}
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
            {demoReferralLevels.slice(0, 10).map((level) => (
              <div 
                key={level.level}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <Badge variant={level.level <= 2 ? "default" : "secondary"}>
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
            
            <div className="text-center py-2">
              <span className="text-sm text-gray-500">
                И еще 10 уровней...
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Информационное сообщение */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="text-yellow-600">ℹ️</div>
            <div>
              <h4 className="text-yellow-800 font-medium">Демо-режим</h4>
              <p className="text-yellow-700 text-sm">
                Показаны демонстрационные данные. После исправления API будут отображаться реальные данные пользователя.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};