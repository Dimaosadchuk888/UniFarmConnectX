import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FiCopy as Copy, FiUsers as Users, FiTrendingUp as TrendingUp, FiGift as Gift } from 'react-icons/fi';
import { useToast } from '@/hooks/use-toast';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { useUser } from '@/contexts/userContext';

interface ReferralStats {
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

export const ReferralSystemProduction: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const user = useUser();
  const userId = user?.userId || 48; // fallback для демо

  // Получаем полную информацию о рефералах (включает код и статистику)
  const { data: referralInfoData, refetch: refetchReferralInfo } = useQuery({
    queryKey: ['/api/v2/referrals/info', userId],
    queryFn: async () => await correctApiRequest(`/api/v2/referrals/${userId}`),
    enabled: !!userId,
  });

  // Получаем список рефералов
  const { data: referralsData } = useQuery({
    queryKey: ['/api/v2/referrals/list', userId],
    queryFn: async () => await correctApiRequest(`/api/v2/referrals/${userId}/list`),
    enabled: !!userId,
  });

  // Формируем реферальную ссылку
  const referralCode = referralInfoData?.ref_code || user?.refCode || '';
  const referralLink = `https://t.me/UniFarming_Bot?start=${referralCode}`;
  
  // Парсим статистику из referralInfoData
  const stats: ReferralStats = referralInfoData?.stats ? {
    totalReferrals: referralInfoData.stats.totalReferrals || 0,
    activeReferrals: referralInfoData.stats.activeReferrals || 0,
    totalEarned: {
      UNI: referralInfoData.stats.totalEarned?.UNI || '0.00',
      TON: referralInfoData.stats.totalEarned?.TON || '0.00'
    },
    monthlyEarned: {
      UNI: referralInfoData.stats.monthlyEarned?.UNI || '0.00',
      TON: referralInfoData.stats.monthlyEarned?.TON || '0.00'
    }
  } : {
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarned: { UNI: '0.00', TON: '0.00' },
    monthlyEarned: { UNI: '0.00', TON: '0.00' }
  };

  // Генерируем 20-уровневую таблицу с реальными комиссиями из backend
  const referralLevels: ReferralLevel[] = Array.from({ length: 20 }, (_, i) => {
    const level = i + 1;
    let commission = '0%';
    
    // Модель комиссий согласно backend
    if (level === 1) commission = '100%';
    else if (level === 2) commission = '2%';
    else commission = `${level}%`; // 3-20%
    
    return {
      level,
      referrals: 0, // В будущем это будет подсчитываться из реальных данных
      commission,
      earnings: {
        UNI: '0.00',
        TON: '0.00'
      }
    };
  });

  const copyReferralLink = () => {
    if (!referralCode) {
      toast({
        title: "Ошибка",
        description: "Реферальный код не загружен",
        variant: "destructive"
      });
      return;
    }
    
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Ссылка скопирована!",
      description: "Реферальная ссылка скопирована в буфер обмена",
    });
  };

  const generateNewCode = async () => {
    setLoading(true);
    try {
      await correctApiRequest('/api/v2/referrals/generate-code', 'POST', { userId });
      await refetchReferralInfo();
      toast({
        title: "Код обновлен!",
        description: "Новый реферальный код успешно сгенерирован",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать новый код",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Реферальная ссылка */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-600" />
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Моя реферальная ссылка
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <p className="text-sm text-gray-500 mb-1">Реферальный код:</p>
                <p className="font-mono text-lg font-semibold text-purple-700">
                  {referralCode || 'Загрузка...'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {referralLink}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={copyReferralLink}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={!referralCode}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Копировать
                </Button>
                <Button
                  onClick={generateNewCode}
                  size="sm"
                  variant="outline"
                  disabled={loading}
                >
                  {loading ? 'Генерация...' : 'Обновить'}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            <p>💡 Поделитесь этой ссылкой с друзьями</p>
            <p>🎯 Получайте 100% от их дохода на 1-м уровне</p>
            <p>📈 Дополнительные бонусы с 2-20 уровней</p>
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.totalReferrals}</p>
                <p className="text-sm text-gray-500">Всего рефералов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.activeReferrals}</p>
                <p className="text-sm text-gray-500">Активных</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-lg font-bold text-purple-600">{stats.totalEarned.UNI} UNI</p>
              <p className="text-lg font-bold text-blue-600">{stats.totalEarned.TON} TON</p>
              <p className="text-sm text-gray-500">Заработано всего</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-lg font-bold text-purple-600">{stats.monthlyEarned.UNI} UNI</p>
              <p className="text-lg font-bold text-blue-600">{stats.monthlyEarned.TON} TON</p>
              <p className="text-sm text-gray-500">За месяц</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица уровней */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            20-уровневая система комиссий
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Уровень</TableHead>
                  <TableHead>Комиссия</TableHead>
                  <TableHead>Рефералов</TableHead>
                  <TableHead>Заработано UNI</TableHead>
                  <TableHead>Заработано TON</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralLevels.map((level) => (
                  <TableRow key={level.level}>
                    <TableCell>
                      <Badge variant={level.level === 1 ? "default" : "secondary"}>
                        {level.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={level.level === 1 ? "font-bold text-green-600" : ""}>
                        {level.commission}
                      </span>
                    </TableCell>
                    <TableCell>{level.referrals}</TableCell>
                    <TableCell className="text-purple-600 font-medium">
                      {level.earnings.UNI}
                    </TableCell>
                    <TableCell className="text-blue-600 font-medium">
                      {level.earnings.TON}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Список рефералов */}
      {referralsData?.referrals && referralsData.referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Мои рефералы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referralsData.referrals.map((referral: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{referral.username || `Пользователь ${referral.id}`}</p>
                    <p className="text-sm text-gray-500">
                      Присоединился: {new Date(referral.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">
                    Уровень {referral.level || 1}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};