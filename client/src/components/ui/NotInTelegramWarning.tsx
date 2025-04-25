/**
 * Компонент для блокировки приложения при запуске вне среды Telegram
 * Показывается, когда приложение открывается в браузере, а не в Telegram Mini App
 */
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const NotInTelegramWarning: React.FC = () => {
  const telegramBotUrl = "https://t.me/UniFarming_Bot";
  const miniAppUrl = "https://t.me/UniFarming_Bot/UniFarm";
  
  const handleOpenTelegram = () => {
    window.location.href = telegramBotUrl;
  };
  
  const handleOpenMiniApp = () => {
    window.location.href = miniAppUrl;
  };
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-600 to-blue-800 p-4 text-white">
      <div className="max-w-md mx-auto text-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" className="w-24 h-24 mx-auto mb-4">
          <defs>
            <linearGradient id="a" x1=".667" x2=".417" y1=".167" y2=".75">
              <stop offset="0" stopColor="#37aee2"/>
              <stop offset="1" stopColor="#1e96c8"/>
            </linearGradient>
            <linearGradient id="b" x1=".66" x2=".851" y1=".437" y2=".802">
              <stop offset="0" stopColor="#eff7fc"/>
              <stop offset="1" stopColor="#fff"/>
            </linearGradient>
          </defs>
          <circle cx="120" cy="120" r="120" fill="url(#a)"/>
          <path fill="#c8daea" d="M98 175c-3.888 0-3.227-1.468-4.568-5.17L82 132.207 170 80"/>
          <path fill="#a9c9dd" d="M98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035"/>
          <path fill="url(#b)" d="M100.04 144.41l48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258"/>
        </svg>
        <h1 className="text-4xl font-bold">UniFarm</h1>
        <p className="text-blue-100 mt-2">Крипто-фарминг в Telegram</p>
      </div>
      
      <Card className="w-full max-w-md bg-white text-blue-950 shadow-lg">
        <CardHeader className="bg-red-500 text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold text-center">
            Доступ запрещен
          </CardTitle>
          <CardDescription className="text-white/80 text-center">
            Приложение работает только внутри Telegram
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6 pb-2">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="text-sm text-red-700 font-medium">
              Приложение UniFarm можно открыть только через официальный клиент Telegram.
            </p>
          </div>
          
          <p className="text-gray-700 text-sm mb-4">
            UniFarm - это Telegram Mini App, которое работает исключительно внутри мессенджера Telegram. 
            Для доступа к функциям фарминга и реферальной программе, пожалуйста, откройте приложение через 
            бот @UniFarming_Bot в Telegram.
          </p>
          
          <div className="flex items-center justify-center my-6">
            <img 
              src="https://telegram.org/img/t_logo.svg" 
              alt="Telegram Logo" 
              className="w-12 h-12 mr-4" 
            />
            <div className="text-left">
              <h3 className="font-medium">@UniFarming_Bot</h3>
              <p className="text-xs text-gray-500">Официальный бот UniFarm</p>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleOpenTelegram} 
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            Открыть в Telegram
          </Button>
          <Button 
            onClick={handleOpenMiniApp} 
            variant="outline" 
            className="w-full sm:w-auto border-blue-600 text-blue-600"
          >
            Открыть Mini App
          </Button>
        </CardFooter>
      </Card>
      
      <div className="mt-6 text-center text-sm text-blue-200">
        <p>© 2025 UniFarm - Telegram Mini App для крипто-фарминга</p>
      </div>
    </div>
  );
};

export default NotInTelegramWarning;