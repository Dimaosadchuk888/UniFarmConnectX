import React, { useEffect, useState } from 'react';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';

interface DebugInfo {
  manifestStatus: 'loading' | 'success' | 'error';
  manifestError?: string;
  manifestData?: any;
  walletConnected: boolean;
  walletAddress?: string;
  error?: string;
}

export function TonConnectDebug() {
  const [tonConnectUI] = useTonConnectUI();
  const userFriendlyAddress = useTonAddress();
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    manifestStatus: 'loading',
    walletConnected: false
  });

  console.log('[TonConnectDebug] Component rendered', {
    tonConnectUI: !!tonConnectUI,
    userFriendlyAddress,
    connected: tonConnectUI?.connected
  });

  useEffect(() => {
    console.log('[TonConnectDebug] useEffect called');
    // Проверяем манифест
    checkManifest();
    
    // Проверяем состояние кошелька
    const checkWallet = setInterval(() => {
      const connected = tonConnectUI?.connected || false;
      console.log('[TonConnectDebug] Wallet check:', { connected, userFriendlyAddress });
      
      setDebugInfo(prev => ({
        ...prev,
        walletConnected: connected,
        walletAddress: userFriendlyAddress
      }));
    }, 1000);

    return () => clearInterval(checkWallet);
  }, [tonConnectUI?.connected, userFriendlyAddress]);

  const checkManifest = async () => {
    try {
      console.log('[TonConnectDebug] Проверка манифеста...');
      const response = await fetch('/tonconnect-manifest.json');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[TonConnectDebug] Манифест загружен:', data);
      
      setDebugInfo(prev => ({
        ...prev,
        manifestStatus: 'success',
        manifestData: data
      }));
    } catch (error) {
      console.error('[TonConnectDebug] Ошибка загрузки манифеста:', error);
      setDebugInfo(prev => ({
        ...prev,
        manifestStatus: 'error',
        manifestError: error instanceof Error ? error.message : 'Неизвестная ошибка'
      }));
    }
  };

  const handleConnect = async () => {
    try {
      console.log('[TonConnectDebug] Начинаем подключение кошелька...', {
        tonConnectUI: !!tonConnectUI,
        connected: tonConnectUI?.connected
      });
      
      if (!tonConnectUI) {
        throw new Error('TonConnectUI не инициализирован');
      }
      
      const result = await tonConnectUI.openModal();
      console.log('[TonConnectDebug] Результат openModal:', result);
    } catch (error) {
      console.error('[TonConnectDebug] Ошибка подключения:', error);
      setDebugInfo(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Ошибка подключения'
      }));
    }
  };

  const handleDisconnect = async () => {
    try {
      console.log('[TonConnectDebug] Отключаем кошелек...');
      await tonConnectUI.disconnect();
    } catch (error) {
      console.error('[TonConnectDebug] Ошибка отключения:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🔍 TON Connect Debug</CardTitle>
        <CardDescription>Отладочная информация для диагностики проблем</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Статус манифеста */}
        <div className="space-y-2">
          <h3 className="font-semibold">Статус манифеста</h3>
          {debugInfo.manifestStatus === 'loading' && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Проверяем манифест...</AlertDescription>
            </Alert>
          )}
          {debugInfo.manifestStatus === 'success' && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Манифест загружен успешно
              </AlertDescription>
            </Alert>
          )}
          {debugInfo.manifestStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ошибка загрузки манифеста: {debugInfo.manifestError}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Данные манифеста */}
        {debugInfo.manifestData && (
          <div className="space-y-2">
            <h3 className="font-semibold">Данные манифеста</h3>
            <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
              {JSON.stringify(debugInfo.manifestData, null, 2)}
            </pre>
          </div>
        )}

        {/* Статус кошелька */}
        <div className="space-y-2">
          <h3 className="font-semibold">Статус кошелька</h3>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${debugInfo.walletConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{debugInfo.walletConnected ? 'Подключен' : 'Не подключен'}</span>
          </div>
          {debugInfo.walletAddress && (
            <div className="text-sm text-muted-foreground">
              Адрес: {debugInfo.walletAddress}
            </div>
          )}
        </div>

        {/* Ошибки */}
        {debugInfo.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{debugInfo.error}</AlertDescription>
          </Alert>
        )}

        {/* Действия */}
        <div className="flex gap-2">
          {!debugInfo.walletConnected ? (
            <Button onClick={handleConnect} className="flex-1">
              Подключить кошелек
            </Button>
          ) : (
            <Button onClick={handleDisconnect} variant="outline" className="flex-1">
              Отключить кошелек
            </Button>
          )}
          <Button onClick={checkManifest} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Рекомендации */}
        <div className="mt-4 p-4 bg-muted rounded-lg text-sm">
          <h4 className="font-semibold mb-2">Рекомендации для тестирования:</h4>
          <ol className="list-decimal list-inside space-y-1">
            <li>Убедитесь, что манифест загружается без ошибок</li>
            <li>Проверьте консоль браузера (F12) для дополнительных логов</li>
            <li>Попробуйте подключить разные кошельки (Tonkeeper, MyTonWallet)</li>
            <li>Если подключение не работает, проверьте домен и CORS заголовки</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}