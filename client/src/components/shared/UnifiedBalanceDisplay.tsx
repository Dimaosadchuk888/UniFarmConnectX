import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useUser } from '@/contexts/userContext';
import useWebSocket from '@/hooks/useWebSocket';
import { useNotification } from '@/contexts/NotificationContext';
import { formatAmount, formatUniNumber, formatTonNumber, getUSDEquivalent } from '@/utils/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Eye, EyeOff, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * УНИФИЦИРОВАННЫЙ КОМПОНЕНТ ОТОБРАЖЕНИЯ БАЛАНСА
 * Объединяет все дублирующие реализации отображения баланса UNI/TON
 * Рефакторинг по рекомендациям: docs/UNIFARM_CENTRALIZATION_AUDIT_REPORT.md
 * 
 * ЗАМЕНЯЕТ:
 * - client/src/components/wallet/BalanceCard.tsx (основная реализация)
 * - Дублирующие балансовые компоненты в других модулях
 * - Разрозненную логику форматирования и обновления
 */

interface UnifiedBalanceDisplayProps {
  variant?: 'card' | 'compact' | 'minimal';
  showRefresh?: boolean;
  showVisibilityToggle?: boolean;
  showCopyButton?: boolean;
  showUsdEquivalent?: boolean;
  className?: string;
  title?: string;
}

export const UnifiedBalanceDisplay: React.FC<UnifiedBalanceDisplayProps> = ({
  variant = 'card',
  showRefresh = true,
  showVisibilityToggle = true,
  showCopyButton = false,
  showUsdEquivalent = true,
  className = '',
  title = 'Баланс'
}) => {
  const { user, refreshUser } = useUser();
  const { addNotification } = useNotification();
  const [isVisible, setIsVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // WebSocket для real-time обновлений баланса
  const { isConnected } = useWebSocket({
    onMessage: useCallback((data: any) => {
      if (data.type === 'balance_update' && data.userId === user?.id) {
        refreshUser();
        setLastUpdate(new Date());
        addNotification({
          type: 'info',
          message: 'Баланс обновлен в реальном времени',
          duration: 3000
        });
      }
    }, [user?.id, refreshUser, addNotification])
  });

  const uniBalance = user?.balance_uni || 0;
  const tonBalance = user?.balance_ton || 0;

  // Обработка ручного обновления
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refreshUser();
      setLastUpdate(new Date());
      addNotification({
        type: 'success',
        message: 'Баланс успешно обновлен',
        duration: 2000
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Ошибка обновления баланса',
        duration: 3000
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refreshUser, addNotification]);

  // Копирование баланса в буфер обмена
  const handleCopyBalance = useCallback(async () => {
    const balanceText = `UNI: ${formatUniNumber(uniBalance)}\nTON: ${formatTonNumber(tonBalance)}`;
    
    try {
      await navigator.clipboard.writeText(balanceText);
      setIsCopied(true);
      addNotification({
        type: 'success',
        message: 'Баланс скопирован в буфер обмена',
        duration: 2000
      });
      
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Ошибка копирования',
        duration: 2000
      });
    }
  }, [uniBalance, tonBalance, addNotification]);

  // Переключение видимости баланса
  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  // Форматирование для отображения
  const formatBalance = useCallback((amount: number, currency: 'UNI' | 'TON') => {
    if (!isVisible) return '••••••';
    
    return currency === 'UNI' ? formatUniNumber(amount) : formatTonNumber(amount);
  }, [isVisible]);

  // USD эквивалент (если включен)
  const usdEquivalent = showUsdEquivalent ? 
    getUSDEquivalent(uniBalance, tonBalance) : null;

  // Рендер компактной версии
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-4 ${className}`} ref={containerRef}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">🌾 {formatBalance(uniBalance, 'UNI')} UNI</span>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-medium">💎 {formatBalance(tonBalance, 'TON')} TON</span>
        </div>
        
        {showVisibilityToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleVisibility}
            className="h-6 w-6 p-0"
          >
            {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
        )}
        
        {showRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  }

  // Рендер минимальной версии
  if (variant === 'minimal') {
    return (
      <div className={`text-sm space-y-1 ${className}`} ref={containerRef}>
        <div>UNI: {formatBalance(uniBalance, 'UNI')}</div>
        <div>TON: {formatBalance(tonBalance, 'TON')}</div>
      </div>
    );
  }

  // Рендер полной карточки (default)
  return (
    <Card className={`relative ${className}`} ref={containerRef}>
      <CardContent className="p-6">
        {/* Заголовок с кнопками управления */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          
          <div className="flex items-center gap-2">
            {/* Индикатор подключения WebSocket */}
            <Badge 
              variant={isConnected ? "default" : "secondary"}
              className="text-xs"
            >
              {isConnected ? '🟢 Live' : '🔴 Offline'}
            </Badge>
            
            {showVisibilityToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleVisibility}
                className="h-8 w-8 p-0"
              >
                {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            )}
            
            {showCopyButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyBalance}
                className="h-8 w-8 p-0"
              >
                {isCopied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
            
            {showRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>

        {/* Основное отображение баланса */}
        <div className="space-y-4">
          {/* UNI баланс */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌾</span>
                <span className="text-sm font-medium text-muted-foreground">UNI</span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">
                  {formatBalance(uniBalance, 'UNI')}
                </div>
                <div className="text-xs text-muted-foreground">UNI</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* TON баланс */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💎</span>
                <span className="text-sm font-medium text-muted-foreground">TON</span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">
                  {formatBalance(tonBalance, 'TON')}
                </div>
                <div className="text-xs text-muted-foreground">TON</div>
              </div>
            </div>
          </div>

          {/* USD эквивалент */}
          {showUsdEquivalent && usdEquivalent && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Общая стоимость:</span>
                <span className="text-sm font-medium">
                  {isVisible ? `~$${usdEquivalent.toFixed(2)}` : '••••••'}
                </span>
              </div>
            </>
          )}

          {/* Время последнего обновления */}
          {lastUpdate && (
            <div className="flex items-center justify-center pt-2">
              <span className="text-xs text-muted-foreground">
                Обновлено: {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedBalanceDisplay;