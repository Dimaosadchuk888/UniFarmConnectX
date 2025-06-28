import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FiCopy as Copy } from 'react-icons/fi';
import { useToast } from '@/hooks/use-toast';

export const ReferralCodeDisplay: React.FC = () => {
  const [referralCode, setReferralCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Direct API call to get user data
    const fetchUserData = async () => {
      try {
        const guestId = localStorage.getItem('unifarm_guest_id') || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const response = await fetch('/api/v2/users/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Guest-ID': guestId,
            'Authorization': `Bearer ${localStorage.getItem('unifarm_jwt_token') || ''}`
          }
        });

        const data = await response.json();
        console.log('[ReferralCodeDisplay] Direct API response:', data);

        if (data?.success && data?.data?.user?.ref_code) {
          setReferralCode(data.data.user.ref_code);
          console.log('[ReferralCodeDisplay] Extracted ref_code:', data.data.user.ref_code);
        } else {
          setReferralCode('REF_CODE_ERROR');
        }
      } catch (error) {
        console.error('[ReferralCodeDisplay] Error fetching user data:', error);
        setReferralCode('REF_CODE_ERROR');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const copyReferralLink = () => {
    const referralLink = `https://t.me/UniFarming_Bot?start=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Ссылка скопирована!",
      description: "Реферальная ссылка скопирована в буфер обмена",
    });
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">Загрузка...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
      <CardContent className="p-6">
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-2">Ваш реферальный код</div>
          <div className="text-2xl font-bold text-purple-400 mb-4">{referralCode}</div>
          <Button 
            onClick={copyReferralLink}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Copy className="mr-2 h-4 w-4" />
            Скопировать ссылку
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};