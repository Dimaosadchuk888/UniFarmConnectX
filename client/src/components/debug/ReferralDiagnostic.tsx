import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';

/**
 * Специальный компонент для диагностики проблем с отображением реферальной ссылки
 * ВАЖНО: Предельно минималистичный компонент без зависимостей от других модулей
 */
const ReferralDiagnostic: React.FC = () => {
  // Простые состояния для отслеживания
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [lastApiResponse, setLastApiResponse] = useState<any>(null);
  
  // Вспомогательная функция логирования для отладки
  const logDiagnostic = (message: string) => {
    setDiagnosticLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
    console.log(`[ReferralDiagnostic] ${message}`);
  };
  
  // Прямой запрос на API с минимальной логикой
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/me'],
    queryFn: async () => {
      logDiagnostic('Выполняется запрос к API /api/me');
      try {
        const response = await fetch('/api/me');
        const jsonData = await response.json();
        logDiagnostic(`Получен ответ от API: ${JSON.stringify(jsonData).substring(0, 100)}...`);
        setLastApiResponse(jsonData);
        return jsonData;
      } catch (err) {
        logDiagnostic(`Ошибка запроса к API: ${err}`);
        throw err;
      }
    },
    staleTime: 1000 // Кэшируем всего на 1 секунду для частого обновления
  });
  
  // Создаем реферальную ссылку напрямую
  const refCode = data?.data?.ref_code;
  const referralLink = refCode ? `https://t.me/UniFarming_Bot/app?startapp=ref_${refCode}` : '';
  
  // Диагностическая информация для отладки
  useEffect(() => {
    if (data) {
      const userData = data.data;
      
      logDiagnostic(`Данные пользователя получены: ID=${userData?.id}, telegram_id=${userData?.telegram_id}`);
      
      if (userData?.ref_code) {
        logDiagnostic(`Найден ref_code: ${userData.ref_code}`);
        logDiagnostic(`Сформирована ссылка: ${referralLink}`);
      } else {
        logDiagnostic('ВНИМАНИЕ: ref_code отсутствует в данных пользователя!');
      }
    }
  }, [data, referralLink]);
  
  return (
    <div className="p-4 bg-black/30 rounded-lg text-sm">
      <h2 className="text-amber-400 font-bold mb-2">
        Диагностика реферальной ссылки
      </h2>
      
      <div className="grid grid-cols-1 gap-4">
        {/* Статус запроса */}
        <div className="bg-gray-900/50 p-3 rounded-lg">
          <h3 className="text-blue-400 font-medium mb-2">Статус API</h3>
          <div className="flex gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full mt-1 ${isLoading ? 'bg-yellow-500 animate-pulse' : (error ? 'bg-red-500' : 'bg-green-500')}`}></div>
            <span className="text-white/80">
              {isLoading ? 'Загрузка...' : (error ? 'Ошибка запроса' : 'OK')}
            </span>
          </div>
          
          <button 
            onClick={() => refetch()} 
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3 rounded"
          >
            Обновить данные
          </button>
        </div>
        
        {/* Данные пользователя */}
        <div className="bg-gray-900/50 p-3 rounded-lg">
          <h3 className="text-green-400 font-medium mb-2">Данные пользователя</h3>
          
          {data?.data ? (
            <div className="grid grid-cols-1 gap-1 text-xs">
              <div className="flex justify-between items-center border-b border-gray-700/50 py-1">
                <span className="text-gray-400">ID:</span>
                <span className="text-white font-mono">{data.data.id}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-700/50 py-1">
                <span className="text-gray-400">Telegram ID:</span>
                <span className="text-white font-mono">{data.data.telegram_id}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-700/50 py-1">
                <span className="text-gray-400">Username:</span>
                <span className="text-white font-mono">{data.data.username}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-700/50 py-1">
                <span className="text-gray-400">ref_code:</span>
                <span className="text-amber-500 font-mono font-bold">{data.data.ref_code || 'ОТСУТСТВУЕТ'}</span>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 italic">Нет данных</div>
          )}
        </div>
        
        {/* Реферальная ссылка */}
        <div className="bg-gray-900/50 p-3 rounded-lg">
          <h3 className="text-amber-400 font-medium mb-2">Реферальная ссылка</h3>
          
          {referralLink ? (
            <div className="mb-2">
              <div className="bg-black/50 p-2 rounded overflow-x-auto">
                <pre className="text-green-400 whitespace-pre-wrap break-all text-xs font-mono">
                  {referralLink}
                </pre>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                  logDiagnostic('Ссылка скопирована в буфер обмена');
                }}
                className="mt-2 bg-green-600 hover:bg-green-700 text-white text-xs py-1 px-3 rounded"
              >
                Копировать
              </button>
            </div>
          ) : (
            <div className="text-red-400 mb-2">
              Невозможно создать ссылку: отсутствует ref_code
            </div>
          )}
        </div>
        
        {/* Логи диагностики */}
        <div className="bg-gray-900/50 p-3 rounded-lg">
          <h3 className="text-gray-400 font-medium mb-2">Журнал диагностики</h3>
          
          <div className="bg-black/50 p-2 rounded h-40 overflow-y-auto">
            {diagnosticLogs.length > 0 ? (
              diagnosticLogs.map((log, index) => (
                <div key={index} className="text-xs mb-1 font-mono text-white/70">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">Нет записей в журнале</div>
            )}
          </div>
        </div>
        
        {/* Сырой ответ API */}
        <div className="bg-gray-900/50 p-3 rounded-lg">
          <h3 className="text-gray-400 font-medium mb-2">Сырой ответ API</h3>
          
          <div className="bg-black/50 p-2 rounded h-40 overflow-y-auto">
            <pre className="text-xs font-mono text-white/70 whitespace-pre-wrap break-all">
              {lastApiResponse ? JSON.stringify(lastApiResponse, null, 2) : 'Нет данных'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralDiagnostic;