import React from 'react';
import { Copy, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface UniFarmReferralLinkProps {
  referralCode?: string;
  referralCount?: number;
}

const UniFarmReferralLink: React.FC<UniFarmReferralLinkProps> = ({ 
  referralCode = 'REF_DEFAULT',
  referralCount = 0 
}) => {
  const referralLink = `https://t.me/UniFarming_Bot/app?startapp=${referralCode}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: "Скопировано!",
        description: "Реферальная ссылка скопирована в буфер обмена",
      });
    } catch (err) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать ссылку",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Ваша реферальная ссылка
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm"
          />
          <Button
            size="sm"
            onClick={copyToClipboard}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Копировать
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Приглашено друзей: <span className="font-semibold">{referralCount}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default UniFarmReferralLink;