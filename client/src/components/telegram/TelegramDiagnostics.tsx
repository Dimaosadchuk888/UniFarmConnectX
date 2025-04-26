import React, { useEffect, useState } from 'react';
import { isTelegramWebApp } from '../../services/telegramService';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

// Тип для хранения результатов диагностики
interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

const TelegramDiagnostics = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [progress, setProgress] = useState(0);
  
  // Функция для проверки Telegram объекта
  const checkTelegramObject = (): DiagnosticResult => {
    const isTelegramAvailable = typeof window !== 'undefined' && 'Telegram' in window;
    return {
      name: 'Telegram API',
      status: isTelegramAvailable ? 'success' : 'error',
      message: isTelegramAvailable 
        ? 'Telegram API доступно' 
        : 'Telegram API не обнаружено',
      details: isTelegramAvailable 
        ? 'Объект window.Telegram существует' 
        : 'Объект window.Telegram отсутствует. Убедитесь, что страница открыта в Telegram'
    };
  };
  
  // Функция для проверки WebApp
  const checkWebApp = (): DiagnosticResult => {
    const isTelegramAvailable = typeof window !== 'undefined' && 'Telegram' in window;
    const isWebAppAvailable = isTelegramAvailable && 'WebApp' in (window as any).Telegram;
    return {
      name: 'Telegram WebApp',
      status: isWebAppAvailable ? 'success' : 'error',
      message: isWebAppAvailable 
        ? 'WebApp API доступно' 
        : 'WebApp API не обнаружено',
      details: isWebAppAvailable 
        ? 'Объект window.Telegram.WebApp существует' 
        : 'Объект window.Telegram.WebApp отсутствует. Убедитесь, что страница открыта как Telegram Mini App'
    };
  };
  
  // Функция для проверки initData
  const checkInitData = (): DiagnosticResult => {
    const isTelegramAvailable = typeof window !== 'undefined' && 'Telegram' in window;
    const isWebAppAvailable = isTelegramAvailable && 'WebApp' in (window as any).Telegram;
    const hasInitData = isWebAppAvailable && 'initData' in (window as any).Telegram.WebApp && (window as any).Telegram.WebApp.initData.length > 0;
    const hasInitDataUnsafe = isWebAppAvailable && 'initDataUnsafe' in (window as any).Telegram.WebApp && (window as any).Telegram.WebApp.initDataUnsafe;
    
    return {
      name: 'Telegram initData',
      status: hasInitData ? 'success' : 'error',
      message: hasInitData 
        ? 'initData присутствует' 
        : 'initData отсутствует или пусто',
      details: `initData: ${hasInitData ? 'присутствует' : 'отсутствует'}, initDataUnsafe: ${hasInitDataUnsafe ? 'присутствует' : 'отсутствует'}`
    };
  };
  
  // Функция для проверки User
  const checkUser = (): DiagnosticResult => {
    const isTelegramAvailable = typeof window !== 'undefined' && 'Telegram' in window;
    const isWebAppAvailable = isTelegramAvailable && 'WebApp' in (window as any).Telegram;
    const hasInitDataUnsafe = isWebAppAvailable && 'initDataUnsafe' in (window as any).Telegram.WebApp;
    const hasUser = hasInitDataUnsafe && 'user' in (window as any).Telegram.WebApp.initDataUnsafe;
    const username = hasUser ? (window as any).Telegram.WebApp.initDataUnsafe.user.username : null;
    const id = hasUser ? (window as any).Telegram.WebApp.initDataUnsafe.user.id : null;
    
    return {
      name: 'Telegram User',
      status: hasUser ? 'success' : 'error',
      message: hasUser 
        ? `Пользователь: ${username || 'без username'} (ID: ${id})` 
        : 'Информация о пользователе недоступна',
      details: hasUser
        ? `ID: ${id}, Username: ${username || 'не указан'}`
        : 'Объект user отсутствует в initDataUnsafe'
    };
  };

  // Функция для проверки startParam (реферальный код)
  const checkStartParam = (): DiagnosticResult => {
    const isTelegramAvailable = typeof window !== 'undefined' && 'Telegram' in window;
    const isWebAppAvailable = isTelegramAvailable && 'WebApp' in (window as any).Telegram;
    const hasStartParam = isWebAppAvailable && 'startParam' in (window as any).Telegram.WebApp && (window as any).Telegram.WebApp.startParam;
    const startParam = hasStartParam ? (window as any).Telegram.WebApp.startParam : null;
    
    let status: 'success' | 'warning' | 'info' = 'info';
    let message = 'startParam отсутствует';
    
    if (hasStartParam) {
      if (startParam.startsWith('ref_')) {
        status = 'success';
        message = `Реферальный код: ${startParam.replace('ref_', '')}`;
      } else {
        status = 'warning';
        message = `startParam присутствует, но не является реферальным кодом: ${startParam}`;
      }
    }
    
    return {
      name: 'Referral Code',
      status,
      message,
      details: hasStartParam
        ? `startParam: ${startParam}`
        : 'startParam отсутствует. Это нормально, если пользователь не перешел по реферальной ссылке.'
    };
  };
  
  // Выполнение всех проверок
  useEffect(() => {
    if (!isRunning) return;
    
    const runDiagnostics = async () => {
      setProgress(20);
      setResults(prev => [...prev, checkTelegramObject()]);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(40);
      setResults(prev => [...prev, checkWebApp()]);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(60);
      setResults(prev => [...prev, checkInitData()]);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(80);
      setResults(prev => [...prev, checkUser()]);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(100);
      setResults(prev => [...prev, checkStartParam()]);
      
      setIsRunning(false);
    };
    
    runDiagnostics();
  }, [isRunning]);
  
  // Определение иконки для статуса
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case 'info':
        return <Info className="h-6 w-6 text-blue-500" />;
      default:
        return null;
    }
  };
  
  // Определение цвета для бейджа статуса
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return '';
    }
  };
  
  return (
    <Card className="w-full mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Диагностика Telegram Mini App</CardTitle>
        {isRunning && (
          <div className="mt-2">
            <Progress value={progress} className="h-2 mb-2" />
            <p className="text-sm text-muted-foreground">Выполнение проверок...</p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {results.map((result, index) => (
          <div key={index} className="flex items-start space-x-3 mb-4 p-3 border rounded-md">
            <div className="flex-shrink-0 mt-1">
              {getStatusIcon(result.status)}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-medium">{result.name}</h4>
                <Badge className={getStatusVariant(result.status)}>
                  {result.status === 'success' ? 'Успех' : 
                   result.status === 'error' ? 'Ошибка' :
                   result.status === 'warning' ? 'Предупреждение' : 'Информация'}
                </Badge>
              </div>
              <p className="text-sm mb-1">{result.message}</p>
              {result.details && (
                <p className="text-xs text-muted-foreground">{result.details}</p>
              )}
            </div>
          </div>
        ))}
        
        {!isRunning && results.some(r => r.status === 'error') && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Обнаружены ошибки</AlertTitle>
            <AlertDescription>
              Некоторые проверки не пройдены. Убедитесь, что приложение открыто в Telegram как Mini App.
            </AlertDescription>
          </Alert>
        )}
        
        {!isRunning && !results.some(r => r.status === 'error') && (
          <Alert variant="default" className="mt-2 bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Все проверки пройдены</AlertTitle>
            <AlertDescription>
              Telegram Mini App корректно настроен и работает.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default TelegramDiagnostics;