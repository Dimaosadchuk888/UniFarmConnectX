import React, { useState, useEffect } from 'react';
import { tokenRecoveryService } from '../services/tokenRecoveryService';
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Clock, CheckCircle } from 'lucide-react';

/**
 * JWT Token Status Component
 * 
 * Отображает статус JWT токена и предупреждения о критических временных окнах
 * Помогает пользователям понимать, когда их депозиты могут быть в зоне риска
 */
export const JwtTokenStatus: React.FC = () => {
  const [tokenStatus, setTokenStatus] = useState<{
    hasToken: boolean;
    age: number;
    ageMinutes: number;
    inCriticalWindow: boolean;
    recommendation: string;
  }>({
    hasToken: false,
    age: 0,
    ageMinutes: 0,
    inCriticalWindow: false,
    recommendation: 'Проверка...'
  });

  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    const checkTokenStatus = () => {
      const currentToken = localStorage.getItem('unifarm_jwt_token');
      const now = new Date().toISOString();
      
      if (!currentToken) {
        setTokenStatus({
          hasToken: false,
          age: 0,
          ageMinutes: 0,
          inCriticalWindow: false,
          recommendation: 'Токен отсутствует'
        });
        setLastUpdate(now);
        return;
      }

      const age = tokenRecoveryService.getTokenAge(currentToken);
      const ageMinutes = Math.round(age / 60000);
      const inCriticalWindow = tokenRecoveryService.isInCriticalWindow(currentToken);

      let recommendation = 'Токен в норме';
      if (age > 25 * 60 * 1000) {
        recommendation = `Токен старый (${ageMinutes} мин)`;
      }
      if (inCriticalWindow) {
        recommendation = `⚠️ Критическое окно!`;
      }

      setTokenStatus({
        hasToken: true,
        age,
        ageMinutes,
        inCriticalWindow,
        recommendation
      });
      setLastUpdate(now);
    };

    // Проверяем сразу
    checkTokenStatus();

    // Проверяем каждые 30 секунд
    const interval = setInterval(checkTokenStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!tokenStatus.hasToken) return 'destructive';
    if (tokenStatus.inCriticalWindow) return 'destructive';
    if (tokenStatus.ageMinutes > 25) return 'secondary';
    return 'default';
  };

  const getStatusIcon = () => {
    if (!tokenStatus.hasToken) return <AlertTriangle className="w-3 h-3" />;
    if (tokenStatus.inCriticalWindow) return <AlertTriangle className="w-3 h-3" />;
    if (tokenStatus.ageMinutes > 25) return <Clock className="w-3 h-3" />;
    return <Shield className="w-3 h-3" />;
  };

  // Не показываем компонент в production если токен в норме
  if (tokenStatus.hasToken && !tokenStatus.inCriticalWindow && tokenStatus.ageMinutes < 20) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge variant={getStatusColor()} className="flex items-center gap-2 px-3 py-2">
        {getStatusIcon()}
        <div className="flex flex-col">
          <span className="text-xs font-medium">
            JWT: {tokenStatus.hasToken ? `${tokenStatus.ageMinutes}м` : 'НЕТ'}
          </span>
          <span className="text-xs opacity-90">
            {tokenStatus.recommendation}
          </span>
        </div>
      </Badge>
      
      {tokenStatus.inCriticalWindow && (
        <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md text-xs">
          <div className="flex items-center gap-1 text-destructive">
            <AlertTriangle className="w-3 h-3" />
            <span className="font-medium">Риск потери депозитов!</span>
          </div>
          <div className="text-muted-foreground mt-1">
            Не делайте депозиты сейчас. Токен обновляется автоматически.
          </div>
        </div>
      )}
    </div>
  );
};