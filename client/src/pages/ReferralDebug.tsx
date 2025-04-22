import React from 'react';
import ReferralDiagnostic from '@/components/debug/ReferralDiagnostic';

/**
 * Страница диагностики реферальной программы
 * Упрощенный вариант для выявления проблем с отображением реферальной ссылки
 */
const ReferralDebug: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-xl font-bold text-primary mb-6">
        Диагностика реферальной системы
      </h1>
      
      <div className="grid grid-cols-1 gap-6">
        {/* Основной компонент диагностики реферальной ссылки */}
        <ReferralDiagnostic />
        
        {/* Информация об окружении */}
        <div className="p-4 bg-black/30 rounded-lg text-sm">
          <h2 className="text-blue-400 font-bold mb-2">
            Информация об окружении
          </h2>
          
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex justify-between items-center border-b border-gray-700/50 py-1">
              <span className="text-gray-400">User Agent:</span>
              <span className="text-white font-mono overflow-auto max-w-xs">
                {navigator.userAgent}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-700/50 py-1">
              <span className="text-gray-400">Telegram Mini App API:</span>
              <span className={`font-mono ${window.Telegram?.WebApp ? 'text-green-400' : 'text-red-400'}`}>
                {window.Telegram?.WebApp ? 'Доступен' : 'Не доступен'}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-700/50 py-1">
              <span className="text-gray-400">WebApp Version:</span>
              <span className="text-white font-mono">
                {window.Telegram?.WebApp?.version || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-700/50 py-1">
              <span className="text-gray-400">WebApp Platform:</span>
              <span className="text-white font-mono">
                {window.Telegram?.WebApp?.platform || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">initData длина:</span>
              <span className="text-white font-mono">
                {window.Telegram?.WebApp?.initData?.length || 0} символов
              </span>
            </div>
          </div>
        </div>
        
        {/* Тестовая реферальная ссылка - Фиксированная версия */}
        <div className="p-4 bg-black/30 rounded-lg text-sm">
          <h2 className="text-green-400 font-bold mb-2">
            Тестовая ссылка (фиксированная)
          </h2>
          
          <div className="bg-black/50 p-2 rounded overflow-x-auto mb-2">
            <pre className="text-green-400 whitespace-pre-wrap break-all text-xs font-mono">
              https://t.me/UniFarming_Bot/app?startapp=ref_3988f632025e
            </pre>
          </div>
          
          <button 
            onClick={() => {
              navigator.clipboard.writeText('https://t.me/UniFarming_Bot/app?startapp=ref_3988f632025e');
              alert('Тестовая ссылка скопирована в буфер обмена');
            }}
            className="bg-green-600 hover:bg-green-700 text-white text-xs py-1 px-3 rounded"
          >
            Копировать тестовую ссылку
          </button>
          
          <p className="mt-2 text-xs text-white/70">
            Эта фиксированная ссылка содержит тестовый реферальный код и должна работать независимо 
            от состояния API или вашего аккаунта. Используйте её для проверки системы.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReferralDebug;