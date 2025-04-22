import React from 'react';
import TelegramDebugger from '@/components/debug/TelegramDebugger';

/**
 * Страница для отладки Telegram интеграции
 * Доступна только в режиме разработки
 */
const DebugPage: React.FC = () => {
  // Проверка режима разработки
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!isDevelopment) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Доступ запрещен</h1>
        <p>Страница отладки доступна только в режиме разработки.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Отладка Telegram Mini App</h1>
        <p className="text-muted-foreground">
          Инструменты для диагностики интеграции с Telegram и проверки reeferral_code.
        </p>
      </div>
      
      <div className="mb-8">
        <TelegramDebugger />
      </div>
      
      <div className="bg-card rounded-lg p-4 mb-8">
        <h2 className="text-xl font-semibold mb-4">Полезные ссылки для отладки</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <a 
              href="https://t.me/UniFarming_Bot/app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Открыть Mini App - https://t.me/UniFarming_Bot/app
            </a>
          </li>
          <li>
            <a 
              href="/api/telegram-debug" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary hover:underline"
            >
              API для отладки Telegram данных - /api/telegram-debug
            </a>
          </li>
          <li>
            <a 
              href="/api/me" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline" 
            >
              Просмотреть данные текущего пользователя - /api/me
            </a>
          </li>
        </ul>
      </div>
      
      <div className="bg-card rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Инструкции по отладке реферальных ссылок</h2>
        <ol className="list-decimal list-inside space-y-3">
          <li>
            Убедитесь, что пользователь имеет <code className="bg-muted px-1 py-0.5 rounded">ref_code</code> в данных с сервера
          </li>
          <li>
            Правильный формат реферальной ссылки: <code className="bg-muted px-1 py-0.5 rounded">https://t.me/UniFarming_Bot/app?startapp=ref_КОД</code>
          </li>
          <li>
            Если ссылка не отображается, проверьте response от <code className="bg-muted px-1 py-0.5 rounded">/api/me</code> и наличие в нем поля <code className="bg-muted px-1 py-0.5 rounded">ref_code</code>
          </li>
          <li>
            При необходимости проверьте заголовки запроса с данными Telegram с помощью отладчика выше
          </li>
        </ol>
        
        <div className="bg-amber-500/10 p-4 rounded-md mt-4">
          <h3 className="font-semibold mb-2 text-amber-500/80">Типичные проблемы</h3>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Отсутствие Telegram WebApp API в тестовом окружении</li>
            <li>Неправильный формат initData или его отсутствие в заголовках запроса</li>
            <li>Проблемы с генерацией реферальных кодов на сервере</li>
            <li>Отсутствие телеграм ID пользователя при запросе к API</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DebugPage;