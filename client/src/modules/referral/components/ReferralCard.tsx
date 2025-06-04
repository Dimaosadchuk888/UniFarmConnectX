/**
 * Реферальная карточка с новой архитектурой
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { apiClient } from '../../../core/api';
import { QUERY_KEYS } from '../../../shared/constants';
import type { User } from '../../../core/types';

interface ReferralCardProps {
  user: User;
}

export const ReferralCard: React.FC<ReferralCardProps> = ({ user }) => {
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.REFERRALS,
    queryFn: () => apiClient.getReferrals(),
  });

  const referralCount = referrals.length;
  const referralLink = user.ref_code 
    ? `https://t.me/UniFarmBot?start=${user.ref_code}`
    : 'Код не создан';

  const copyToClipboard = async () => {
    if (user.ref_code) {
      try {
        await navigator.clipboard.writeText(referralLink);
        // Можно добавить уведомление об успешном копировании
      } catch (err) {
        console.error('Ошибка копирования:', err);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Реферальная программа</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-primary/5 rounded-lg">
            <p className="text-sm text-muted-foreground">Рефералов</p>
            <p className="text-2xl font-bold">
              {isLoading ? '...' : referralCount}
            </p>
          </div>
          <div className="p-3 bg-secondary/5 rounded-lg">
            <p className="text-sm text-muted-foreground">Статус</p>
            <p className="font-medium">
              {user.ref_code ? 'Активен' : 'Неактивен'}
            </p>
          </div>
        </div>

        {user.ref_code && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Ваша реферальная ссылка:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 p-2 text-xs border rounded bg-muted"
              />
              <button
                onClick={copyToClipboard}
                className="px-3 py-2 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Копировать
              </button>
            </div>
          </div>
        )}

        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-sm">
            Приглашайте друзей и получайте бонусы за каждого реферала!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};