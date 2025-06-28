import React, { useEffect } from 'react';
import { useUser } from '../../contexts/userContext';
import { correctApiRequest } from '../../lib/correctApiRequest';

/**
 * Отладочный компонент для диагностики проблем с реферальным кодом
 */
export const ReferralDebug: React.FC = () => {
  const user = useUser();

  useEffect(() => {
    console.log('=== REFERRAL DEBUG START ===');
    console.log('User Context Data:', {
      userId: user?.userId,
      username: user?.username,
      refCode: user?.refCode,
      telegramId: user?.telegramId,
      fullUser: user
    });

    if (user?.userId) {
      // Проверим API вызов referrals
      correctApiRequest(`/api/v2/referrals/${user.userId}`)
        .then(response => {
          console.log('API /referrals response:', response);
        })
        .catch(error => {
          console.error('API /referrals error:', error);
        });

      // Проверим API вызов user profile
      correctApiRequest('/api/v2/users/profile')
        .then(response => {
          console.log('API /users/profile response:', response);
        })
        .catch(error => {
          console.error('API /users/profile error:', error);
        });
    }

    console.log('=== REFERRAL DEBUG END ===');
  }, [user]);

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
      <h3 className="font-semibold text-yellow-800 mb-2">Referral Debug Info</h3>
      <div className="text-sm text-yellow-700 space-y-1">
        <div>User ID: {user?.userId || 'null'}</div>
        <div>Username: {user?.username || 'null'}</div>
        <div>Ref Code: {user?.refCode || 'null'}</div>
        <div>Telegram ID: {user?.telegramId || 'null'}</div>
        <div className="mt-2 text-xs">
          Check browser console for detailed API logs
        </div>
      </div>
    </div>
  );
};