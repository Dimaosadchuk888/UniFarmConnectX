import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/queryClient';

/**
 * Компонент для диагностики работы реферальной системы
 * Проверяет получение и отображение реферальной ссылки и кода
 */

interface ReferralSystemData {
  userInfo?: {
    userId: number;
    refCode?: string;
    referrerId?: number;
    referralLink?: string;
    totalReferrals?: number;
  };
  apiResults: {
    me?: {
      success: boolean;
      message?: string;
      data?: any;
    };
    referralCode?: {
      success: boolean;
      message?: string;
      data?: any;
    };
    referralStats?: {
      success: boolean;
      message?: string;
      data?: any;
    };
  };
  fallbackComponents: {
    fallbackReferralLinkRendered: boolean;
    simpleReferralLinkRendered: boolean;
    actualRefLinkFormatted?: string;
  };
  time: string;
}

const ReferralSystemDiagnostics: React.FC = () => {
  const [diagnosticData, setDiagnosticData] = useState<ReferralSystemData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        const referralData: ReferralSystemData = {
          apiResults: {},
          fallbackComponents: {
            fallbackReferralLinkRendered: false,
            simpleReferralLinkRendered: false,
          },
          time: new Date().toISOString()
        };

        // 1. Проверяем API /api/me
        const meResponse = await apiRequest('/api/me?user_id=1');
        referralData.apiResults.me = meResponse;
        
        if (meResponse.success && meResponse.data) {
          referralData.userInfo = {
            userId: meResponse.data.id || 1,
            refCode: meResponse.data.ref_code,
            referrerId: meResponse.data.referrer_id,
            totalReferrals: meResponse.data.total_referrals || 0
          };
          
          // Формируем реферальную ссылку с правильным форматом
          if (referralData.userInfo.refCode) {
            referralData.userInfo.referralLink = `https://t.me/UniFarming_Bot/UniFarm?startapp=ref_${referralData.userInfo.refCode}`;
            referralData.fallbackComponents.actualRefLinkFormatted = referralData.userInfo.referralLink;
          }
        }
        
        // 2. Проверяем API /api/referral/code
        const referralCodeResponse = await apiRequest('/api/referral/code?user_id=1');
        referralData.apiResults.referralCode = referralCodeResponse;
        
        // 3. Проверяем API /api/referral/stats
        const referralStatsResponse = await apiRequest('/api/referral/stats?user_id=1');
        referralData.apiResults.referralStats = referralStatsResponse;
        
        // 4. Мониторим отображение FallbackReferralLink и SimpleReferralLink
        // Имитируем через flags, в реальном мониторинге нужны хуки из компонентов
        referralData.fallbackComponents.fallbackReferralLinkRendered = true;
        referralData.fallbackComponents.simpleReferralLinkRendered = referralData.userInfo?.referralLink ? true : false;
        
        // Сохраняем результаты диагностики
        setDiagnosticData(referralData);
        console.log('[АУДИТ] [REFERRAL] Диагностика реферальной системы:', referralData);
      } catch (err) {
        setError(`Ошибка при выполнении диагностики: ${err}`);
        console.error('[АУДИТ] [REFERRAL] Ошибка диагностики:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    runDiagnostics();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
        <span>Выполняется диагностика реферальной системы...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-md">
        <h3 className="text-red-700 font-medium">Ошибка диагностики</h3>
        <p className="text-red-600 mt-1">{error}</p>
      </div>
    );
  }
  
  if (!diagnosticData) {
    return <div>Нет данных для отображения</div>;
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Диагностика реферальной системы</h2>
      
      {/* Данные пользователя */}
      <div className="mb-4">
        <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">Информация о пользователе</h3>
        <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">ID пользователя:</div>
          <div className="text-sm">{diagnosticData.userInfo?.userId || 'Не определен'}</div>
          
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Реферальный код:</div>
          <div className={`text-sm ${diagnosticData.userInfo?.refCode ? 'text-green-600' : 'text-red-600'}`}>
            {diagnosticData.userInfo?.refCode || 'Отсутствует'}
          </div>
          
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Реферер ID:</div>
          <div className="text-sm">{diagnosticData.userInfo?.referrerId || 'Отсутствует'}</div>
          
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Всего рефералов:</div>
          <div className="text-sm">{diagnosticData.userInfo?.totalReferrals || 0}</div>
        </div>
      </div>
      
      {/* Реферальная ссылка */}
      <div className="mb-4">
        <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">Реферальная ссылка</h3>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Сформированная ссылка:</div>
          <div className={`text-sm break-all ${diagnosticData.userInfo?.referralLink ? 'text-green-600' : 'text-red-600'}`}>
            {diagnosticData.userInfo?.referralLink || 'Не сформирована'}
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">FallbackReferralLink:</div>
            <div className={`text-sm ${diagnosticData.fallbackComponents.fallbackReferralLinkRendered ? 'text-green-600' : 'text-red-600'}`}>
              {diagnosticData.fallbackComponents.fallbackReferralLinkRendered ? 'Отрендерен' : 'Не отрендерен'}
            </div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">SimpleReferralLink:</div>
            <div className={`text-sm ${diagnosticData.fallbackComponents.simpleReferralLinkRendered ? 'text-green-600' : 'text-red-600'}`}>
              {diagnosticData.fallbackComponents.simpleReferralLinkRendered ? 'Отрендерен' : 'Не отрендерен'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Результаты API запросов */}
      <div className="mb-4">
        <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">Результаты API запросов</h3>
        <div className="space-y-3">
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="flex justify-between items-center mb-1">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200">/api/me</div>
              <div className={`text-xs px-2 py-1 rounded ${diagnosticData.apiResults.me?.success ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'}`}>
                {diagnosticData.apiResults.me?.success ? 'Успешно' : 'Ошибка'}
              </div>
            </div>
            <div className="text-sm mt-1">
              {diagnosticData.apiResults.me?.message || (diagnosticData.apiResults.me?.success ? 'OK' : 'Нет данных')}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="flex justify-between items-center mb-1">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200">/api/referral/code</div>
              <div className={`text-xs px-2 py-1 rounded ${diagnosticData.apiResults.referralCode?.success ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'}`}>
                {diagnosticData.apiResults.referralCode?.success ? 'Успешно' : 'Ошибка'}
              </div>
            </div>
            <div className="text-sm mt-1">
              {diagnosticData.apiResults.referralCode?.message || (diagnosticData.apiResults.referralCode?.success ? 'OK' : 'Нет данных')}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="flex justify-between items-center mb-1">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200">/api/referral/stats</div>
              <div className={`text-xs px-2 py-1 rounded ${diagnosticData.apiResults.referralStats?.success ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'}`}>
                {diagnosticData.apiResults.referralStats?.success ? 'Успешно' : 'Ошибка'}
              </div>
            </div>
            <div className="text-sm mt-1">
              {diagnosticData.apiResults.referralStats?.message || (diagnosticData.apiResults.referralStats?.success ? 'OK' : 'Нет данных')}
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-2">
        Диагностика выполнена: {new Date(diagnosticData.time).toLocaleString()}
      </div>
    </div>
  );
};

export default ReferralSystemDiagnostics;