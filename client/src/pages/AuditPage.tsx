import React, { useState } from 'react';
import TelegramDiagnostics from '@/components/debug/TelegramDiagnostics';
import ReferralSystemDiagnostics from '@/components/debug/ReferralSystemDiagnostics';
import ApiAndWebSocketDiagnostics from '@/components/debug/ApiAndWebSocketDiagnostics';
import UiDiagnostics from '@/components/debug/UiDiagnostics';

/**
 * Страница полной диагностики и аудита UniFarming
 * Объединяет все диагностические компоненты в единую консоль
 */

const AuditPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'telegram' | 'referral' | 'api' | 'ui'>('telegram');
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'telegram':
        return <TelegramDiagnostics />;
      case 'referral':
        return <ReferralSystemDiagnostics />;
      case 'api':
        return <ApiAndWebSocketDiagnostics />;
      case 'ui':
        return <UiDiagnostics />;
      default:
        return null;
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-6">Аудит UniFarming</h1>
      
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-md mb-6">
        <h2 className="text-lg font-semibold text-amber-800 mb-2">Диагностический отчет</h2>
        <p className="text-sm text-amber-700">
          Эта страница предоставляет полный отчет о диагностике приложения UniFarming.
          Выполняется анализ работы Telegram WebApp, реферальной системы, API и UI компонентов.
        </p>
      </div>
      
      {/* Навигационные табы */}
      <div className="flex flex-wrap border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('telegram')}
          className={`px-4 py-2 text-sm font-medium rounded-t-md ${
            activeTab === 'telegram'
              ? 'bg-primary text-white'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          Telegram WebApp
        </button>
        <button
          onClick={() => setActiveTab('referral')}
          className={`px-4 py-2 text-sm font-medium rounded-t-md ${
            activeTab === 'referral'
              ? 'bg-primary text-white'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          Реферальная система
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`px-4 py-2 text-sm font-medium rounded-t-md ${
            activeTab === 'api'
              ? 'bg-primary text-white'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          API и WebSocket
        </button>
        <button
          onClick={() => setActiveTab('ui')}
          className={`px-4 py-2 text-sm font-medium rounded-t-md ${
            activeTab === 'ui'
              ? 'bg-primary text-white'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          UI и Дизайн
        </button>
      </div>
      
      {/* Содержимое выбранного таба */}
      <div>
        {renderTabContent()}
      </div>
      
      {/* Информация о времени диагностики */}
      <div className="text-xs text-gray-500 text-right mt-4">
        Аудит выполнен: {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default AuditPage;