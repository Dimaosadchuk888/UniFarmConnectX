/**
 * Страница-редирект на Telegram Mini App
 * Используется для перенаправления пользователей, которые открыли приложение не через Telegram
 */
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function TelegramRedirect() {
  const [countdown, setCountdown] = useState(5);
  const telegramAppUrl = "https://t.me/UniFarming_Bot/UniFarm";
  
  useEffect(() => {
    // Запускаем обратный отсчет
    const timer = setInterval(() => {
      setCountdown(prevCount => {
        if (prevCount <= 1) {
          clearInterval(timer);
          // Перенаправляем пользователя на Telegram Mini App
          window.location.href = telegramAppUrl;
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const handleOpenTelegram = () => {
    window.location.href = telegramAppUrl;
  };
  
  const handleStayOnPage = () => {
    // Отключаем редирект в localStorage
    localStorage.setItem('disable_redirect', 'true');
    // Перезагружаем страницу без редиректа
    window.location.href = '/?no_redirect=true';
  };
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="bg-blue-600 text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold text-center">Перенаправление на Telegram</CardTitle>
          <CardDescription className="text-blue-100 text-center">
            Для правильной работы приложение должно быть открыто через Telegram
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6 pb-2">
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-blue-600 mb-2">{countdown}</div>
            <p className="text-gray-600">
              Вы будете автоматически перенаправлены на страницу Telegram Mini App через {countdown} {countdown === 1 ? 'секунду' : 'секунд'}
            </p>
          </div>
          
          <div className="flex items-center justify-center mb-4">
            <img 
              src="https://telegram.org/img/t_logo.svg" 
              alt="Telegram Logo" 
              className="w-16 h-16 mr-4" 
            />
            <div className="text-left">
              <h3 className="font-medium">Telegram Mini App</h3>
              <p className="text-sm text-gray-500">@UniFarming_Bot</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Для полного доступа к функциям приложения, включая реферальную программу и фарминг UNI, необходимо запустить приложение через Telegram.
          </p>
        </CardContent>
        
        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleOpenTelegram} 
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            Открыть в Telegram сейчас
          </Button>
          <Button 
            onClick={handleStayOnPage} 
            variant="outline" 
            className="w-full sm:w-auto"
          >
            Остаться на сайте
          </Button>
        </CardFooter>
      </Card>
      
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>© 2025 UniFarm - Telegram Mini App для крипто-фарминга</p>
      </div>
    </div>
  );
}