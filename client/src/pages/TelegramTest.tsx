import React, { useEffect, useState } from 'react';
import { Container } from '@/components/ui/container';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import TelegramDiagnostics from '../components/telegram/TelegramDiagnostics';
import { isRunningInTelegram } from '../services/telegramService';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

// Компонент для тестирования интеграции с Telegram
const TelegramTest: React.FC = () => {
  const [telegramAvailable, setTelegramAvailable] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // При загрузке проверяем доступность Telegram API
  useEffect(() => {
    const checkTelegram = () => {
      const result = isRunningInTelegram();
      setTelegramAvailable(result);
      
      console.log('Telegram API check:', result ? 'Available' : 'Not available');
    };
    
    checkTelegram();
  }, [refreshKey]);

  // Функция для принудительного обновления проверок
  const refreshTests = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Функция для вывода в консоль объектов Telegram для отладки
  const logTelegramObjects = () => {
    if (typeof window !== 'undefined') {
      console.log('window.Telegram:', (window as any).Telegram);
      
      if ((window as any).Telegram?.WebApp) {
        console.log('window.Telegram.WebApp:', (window as any).Telegram.WebApp);
        console.log('initData:', (window as any).Telegram.WebApp.initData);
        console.log('initDataUnsafe:', (window as any).Telegram.WebApp.initDataUnsafe);
        console.log('startParam:', (window as any).Telegram.WebApp.startParam);
      }
    }
  };

  return (
    <Container>
      <h1 className="text-2xl font-bold mt-6 mb-4">Тестирование Telegram Mini App</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Статус Telegram API</CardTitle>
          <CardDescription>
            Проверка доступности Telegram WebApp API для интеграции
          </CardDescription>
        </CardHeader>
        <CardContent>
          {telegramAvailable === null ? (
            <p>Проверка...</p>
          ) : telegramAvailable ? (
            <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Telegram API доступен</AlertTitle>
              <AlertDescription>
                Обнаружен объект Telegram WebApp, приложение запущено в среде Telegram.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Telegram API недоступен</AlertTitle>
              <AlertDescription>
                Объект Telegram WebApp не обнаружен. Убедитесь, что приложение открыто в Telegram.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={refreshTests} 
              size="sm" 
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить проверку
            </Button>
            
            <Button 
              onClick={logTelegramObjects} 
              size="sm" 
              variant="outline"
            >
              Вывести объекты в консоль
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <TelegramDiagnostics key={refreshKey} />
      
      <Card className="my-6">
        <CardHeader>
          <CardTitle>Тестовая форма для параметра startParam</CardTitle>
          <CardDescription>
            Здесь вы можете проверить передачу реферального кода через startParam
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Чтобы проверить передачу реферального кода, откройте Mini App со ссылкой:<br/>
            <code className="bg-gray-100 p-1 rounded">https://t.me/yourbotname/app?startapp=ref_123456</code>
          </p>
          
          <p className="text-sm text-muted-foreground">
            После открытия через ссылку с параметром startapp=ref_XXX, код XXX будет доступен через 
            Telegram.WebApp.startParam и будет отображен в диагностике выше.
          </p>
        </CardContent>
      </Card>
    </Container>
  );
};

export default TelegramTest;