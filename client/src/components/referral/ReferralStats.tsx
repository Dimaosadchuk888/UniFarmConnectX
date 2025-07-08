import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { Users, TrendingUp, DollarSign, Share2, Clock, Star } from 'lucide-react';
import userService from '@/services/userService';
import { correctApiRequest } from '@/lib/correctApiRequest';
import apiConfig from '../../../config/apiConfig';

// Временная функция форматирования для избежания проблем с импортом
const formatNumber = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue) || numValue === 0) return '0';
  if (Math.abs(numValue) >= 1000) {
    return numValue.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  }
  return numValue.toFixed(6);
};

// Интерфейсы соответствующие структуре backend API
interface ReferralLevel {
  level: number;
  partners: number;
  income: {
    uni: number;
    ton: number;
  };
  partnersList: Array<{
    id: number;
    username: string;
    balance_uni: number;
    balance_ton: number;
    is_farming: boolean;
    has_boost: boolean;
  }>;
}

interface ReferralStatsResponse {
  success: boolean;
  user: {
    id: number;
    username: string;
    ref_code: string;
  };
  summary: {
    total_partners: number;
    total_transactions: number;
    total_income: {
      uni: number;
      ton: number;
    };
  };
  levels: ReferralLevel[];
}

// Упрощенная структура для отображения (legacy support для компонента)
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
  // Получаем информацию о текущем пользователе из API
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['/api/v2/users/profile'],
    queryFn: () => userService.getCurrentUser(),
    staleTime: 1000 * 5, // Кэшируем данные только на 5 секунд
    refetchOnWindowFocus: true, // Обновляем при возвращении на страницу
    retry: 2 // Пробуем несколько раз при ошибке
  });
  
  // Логика определения userId из данных пользователя
  const userId = currentUser?.id;
  const guestId = currentUser?.guest_id;
  
  // Запрос статистики партнерской программы с правильным user_id
  const { data: rawStatsData, isLoading, error } = useQuery<ReferralStatsResponse>({
    queryKey: userId ? ['/api/v2/referrals/stats', 'userId', userId] : ['/api/v2/referrals/stats', 'guestId', guestId],
    queryFn: async () => {
      // Проверяем наличие идентификаторов
      const hasUserId = !!userId;
      const hasGuestId = !!guestId;
      
      // Если нет ни userId, ни guestId, возвращаем пустые данные
      if (!hasUserId && !hasGuestId) {
        return {
          success: true,
          user: {
            id: 0,
            username: currentUser?.username || 'Пользователь',
            ref_code: currentUser?.ref_code || 'Не определен'
          },
          summary: {
            total_partners: 0,
            total_transactions: 0,
            total_income: {
              uni: 0,
              ton: 0
            }
          },
          levels: []
        };
      }
      
      // Определяем параметр для запроса: предпочитаем userId, но используем guestId если userId отсутствует
      const queryParam = hasUserId 
        ? `user_id=${userId}` 
        : `guest_id=${guestId}`;
      
      // Формируем полный URL для запроса с нужным параметром (user_id или guest_id)
      const url = `/api/v2/referrals/stats?${queryParam}`;
      
      try {
        // Используем correctApiRequest для стандартизированного запроса с обработкой ошибок
        const responseData = await correctApiRequest<ReferralStatsResponse>(url, 'GET');
        
        // Проверяем базовую структуру ответа
        if (!responseData || typeof responseData !== 'object' || !responseData.success) {
          // Возвращаем пустые данные для новых пользователей
          return {
            success: true,
            user: {
              id: userId || 0,
              username: currentUser?.username || 'Пользователь',
              ref_code: currentUser?.ref_code || 'Не определен'
            },
            summary: {
              total_partners: 0,
              total_transactions: 0,
              total_income: {
                uni: 0,
                ton: 0
              }
            },
            levels: []
          };
        }
        
        return responseData;
      } catch (fetchError) {
        // В случае ошибки также возвращаем пустые данные
        return {
          success: true,
          user: {
            id: userId || 0,
            username: currentUser?.username || 'Пользователь',
            ref_code: currentUser?.ref_code || 'Не определен'
          },
          summary: {
            total_partners: 0,
            total_transactions: 0,
            total_income: {
              uni: 0,
              ton: 0
            }
          },
          levels: []
        };
      }
    },
    // Запрос выполняется если есть userId или guestId
    enabled: (!!userId || !!guestId) && !isUserLoading,
    staleTime: 1000 * 5, // Кэшируем на 5 секунд
    refetchInterval: 30000, // Обновляем каждые 30 секунд
    refetchOnWindowFocus: true, // Обновляем при возврате фокуса
    retry: 2 // Повторяем запрос не более 2 раз
  });

  // Преобразуем данные из нового формата в старый для совместимости с компонентом
  const statsData = rawStatsData ? {
    success: rawStatsData.success,
    data: {
      user: rawStatsData.user?.username || 'Пользователь',
      refCode: rawStatsData.user?.ref_code || 'Не определен',
      totalReferrals: rawStatsData.summary?.total_partners || 0,
      activeReferrals: rawStatsData.summary?.total_partners || 0, // Все партнеры считаются активными
      referralEarnings: (rawStatsData.summary?.total_income?.uni || 0) + (rawStatsData.summary?.total_income?.ton || 0),
      levels: rawStatsData.levels || [],
      timestamp: new Date().toISOString(),
      source: rawStatsData.levels && rawStatsData.levels.length > 0 ? 'supabase-live-data' : 'empty-for-new-user'
    }
  } : null;

  if (isLoading || isUserLoading) {
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

  const renderReferralLevel = (level: ReferralLevel) => {
    return (
      <div key={level.level} className="space-y-2">
        <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Уровень {level.level}</p>
              <p className="text-xs text-gray-500">{level.partners} партнеров</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {formatNumber(level.income?.uni || 0)} UNI
              </Badge>
              <Badge variant="outline" className="text-xs">
                {formatNumber(level.income?.ton || 0)} TON
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Показываем список партнеров на этом уровне если они есть */}
        {level.partnersList && level.partnersList.length > 0 && (
          <div className="ml-6 space-y-1">
            {level.partnersList.slice(0, 3).map((partner, index) => ( // Показываем максимум 3 партнеров
              <div key={partner.id} className="flex items-center justify-between p-2 rounded bg-gray-25 border-l-2 border-blue-200">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                    <Users className="h-3 w-3 text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-700">{partner.username}</span>
                  {partner.is_farming && <Badge variant="secondary" className="text-xs">Фарминг</Badge>}
                  {partner.has_boost && <Badge variant="secondary" className="text-xs">Буст</Badge>}
                </div>
                <div className="text-xs text-gray-500">
                  {formatNumber(partner.balance_uni)} UNI | {formatNumber(partner.balance_ton)} TON
                </div>
              </div>
            ))}
            {level.partnersList.length > 3 && (
              <p className="text-xs text-gray-500 ml-8">... и еще {level.partnersList.length - 3} партнеров</p>
            )}
          </div>
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