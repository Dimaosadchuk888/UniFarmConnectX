import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FiCopy as Copy, FiUsers as Users, FiTrendingUp as TrendingUp, FiGift as Gift } from 'react-icons/fi';
import { useToast } from '@/hooks/use-toast';
import { userServiceNew } from '@/services/userServiceNew';

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

export const ReferralSystemWorking: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [userRefCode, setUserRefCode] = useState<string>('');
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarned: { UNI: "0", TON: "0" },
    monthlyEarned: { UNI: "0", TON: "0" }
  });
  const { toast } = useToast();

  // Load user data on component mount
  React.useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      console.log('[ReferralSystemWorking] Loading user data...');
      const user = await userServiceNew.getCurrentUser(true);
      console.log('[ReferralSystemWorking] User data loaded:', user);
      
      if (user.ref_code) {
        setUserRefCode(user.ref_code);
        console.log('[ReferralSystemWorking] Ref code set:', user.ref_code);
      }
      
      // Load referral stats from API
      await loadReferralStats(user.id);
      
    } catch (error) {
      console.error('[ReferralSystemWorking] Failed to load user data:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить данные пользователя",
        variant: "destructive"
      });
    }
  };

  const loadReferralStats = async (userId: number) => {
    try {
      const response = await fetch(`/api/v2/referral/stats/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setReferralStats(data.data);
          console.log('[ReferralSystemWorking] Referral stats loaded:', data.data);
        }
      } else {
        console.warn('[ReferralSystemWorking] Failed to load referral stats, using defaults');
      }
    } catch (error) {
      console.warn('[ReferralSystemWorking] Error loading referral stats:', error);
    }
  };

  const generateReferralLevels = (): ReferralLevel[] => {
    return Array.from({ length: 20 }, (_, i) => ({
      level: i + 1,
      referrals: i === 0 ? referralStats.totalReferrals : 0,
      commission: i === 0 ? '100%' : `${Math.max(20 - i, 1)}%`,
      earnings: {
        UNI: i === 0 ? referralStats.totalEarned.UNI : "0",
        TON: i === 0 ? referralStats.totalEarned.TON : "0"
      }
    }));
  };

  const copyReferralLink = () => {
    const referralLink = `https://t.me/UniFarming_Bot?start=${userRefCode}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Ссылка скопирована!",
      description: "Реферальная ссылка скопирована в буфер обмена",
    });
  };

  const generateNewCode = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v2/referral/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.ref_code) {
          setUserRefCode(data.data.ref_code);
          toast({
            title: "Новый код создан",
            description: "Реферальный код успешно обновлен",
          });
        }
      } else {
        throw new Error('Failed to generate new code');
      }
    } catch (error) {
      console.error('[ReferralSystemWorking] Error generating new code:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать новый код. Попробуйте позже.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const referralLevels = generateReferralLevels();

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
                  {referralStats.totalReferrals}
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
                  {referralStats.totalEarned.UNI}
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
                  {referralStats.totalEarned.TON}
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
              {userRefCode || 'Загрузка...'}
            </code>
            {userRefCode && (
              <Badge variant="secondary">Активен</Badge>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={copyReferralLink}
              className="flex-1"
              disabled={!userRefCode}
            >
              <Copy className="h-4 w-4 mr-2" />
              Копировать ссылку
            </Button>
            <Button 
              onClick={generateNewCode}
              variant="outline"
              disabled={loading || !userRefCode}
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
            {referralLevels.slice(0, 10).map((level) => (
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

      {/* Информация о системе */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="text-blue-600">ℹ️</div>
            <div>
              <h4 className="text-blue-800 font-medium">Как работает система</h4>
              <ul className="text-blue-700 text-sm mt-2 space-y-1">
                <li>• Пригласите друзей по вашей реферальной ссылке</li>
                <li>• Получайте комиссию с их фарминга и активности</li>
                <li>• 20 уровней глубины с комиссией до 20%</li>
                <li>• Автоматические начисления каждые 5 минут</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};