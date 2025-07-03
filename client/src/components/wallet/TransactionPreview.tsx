import React from 'react';
import StyledTransactionItem from './StyledTransactionItem';

/**
 * Компонент для демонстрации всех типов транзакций
 * Показывает визуальное разнообразие стилизованных транзакций
 */
const TransactionPreview: React.FC = () => {
  // Демонстрационные транзакции для всех типов
  const demoTransactions = [
    {
      id: 1,
      type: 'FARMING_REWARD',
      amount: 5.5,
      currency: 'UNI' as const,
      status: 'completed' as const,
      description: 'UNI farming income: 5.5 UNI (rate: 0.01)',
      createdAt: '2025-07-03T06:18:00.000Z',
      timestamp: Date.now()
    },
    {
      id: 2,
      type: 'FARMING_REWARD',
      amount: 0.25,
      currency: 'TON' as const,
      status: 'completed' as const,
      description: '🚀 TON Boost доход (Premium package): 0.25 TON',
      createdAt: '2025-07-03T06:17:00.000Z',
      timestamp: Date.now() - 60000
    },
    {
      id: 3,
      type: 'REFERRAL_REWARD',
      amount: 2.0,
      currency: 'UNI' as const,
      status: 'completed' as const,
      description: '👥 Referral bonus from level 1 referral',
      createdAt: '2025-07-03T06:16:00.000Z',
      timestamp: Date.now() - 120000
    },
    {
      id: 4,
      type: 'MISSION_REWARD',
      amount: 10.0,
      currency: 'UNI' as const,
      status: 'completed' as const,
      description: '🎯 Mission completed: Daily Check-in',
      createdAt: '2025-07-03T06:15:00.000Z',
      timestamp: Date.now() - 180000
    },
    {
      id: 5,
      type: 'DAILY_BONUS',
      amount: 3.0,
      currency: 'UNI' as const,
      status: 'completed' as const,
      description: '📅 Daily bonus - Day 7 streak',
      createdAt: '2025-07-03T06:14:00.000Z',
      timestamp: Date.now() - 240000
    },
    {
      id: 6,
      type: 'DAILY_BONUS',
      amount: 100.0,
      currency: 'UNI' as const,
      status: 'completed' as const,
      description: '🎁 Airdrop reward: 100 UNI tokens',
      createdAt: '2025-07-03T06:13:00.000Z',
      timestamp: Date.now() - 300000
    },
    {
      id: 7,
      type: 'FARMING_REWARD',
      amount: 25.0,
      currency: 'UNI' as const,
      status: 'completed' as const,
      description: '💳 UNI Deposit: 25.0 UNI',
      createdAt: '2025-07-03T06:12:00.000Z',
      timestamp: Date.now() - 360000
    },
    {
      id: 8,
      type: 'FARMING_REWARD',
      amount: 5.0,
      currency: 'TON' as const,
      status: 'completed' as const,
      description: '💳 TON Deposit: 5.0 TON',
      createdAt: '2025-07-03T06:11:00.000Z',
      timestamp: Date.now() - 420000
    }
  ];

  return (
    <div className="bg-card rounded-xl p-5 mb-5 shadow-lg overflow-hidden relative">
      {/* Неоновая рамка */}
      <div className="absolute inset-0 rounded-xl border border-primary/30"></div>
      
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <i className="fas fa-palette text-primary mr-2"></i>
          Предварительный просмотр транзакций
        </h2>
        <div className="text-sm text-gray-400">
          Демонстрация всех типов
        </div>
      </div>
      
      {/* Описание */}
      <div className="text-sm text-gray-400 mb-4 relative z-10">
        Каждый тип транзакции имеет уникальное визуальное оформление:
      </div>
      
      {/* Список демо транзакций */}
      <div className="space-y-3 relative z-10">
        {demoTransactions.map((transaction) => (
          <StyledTransactionItem 
            key={transaction.id}
            transaction={transaction}
          />
        ))}
      </div>
      
      {/* Легенда типов */}
      <div className="mt-6 p-4 bg-gray-800/50 rounded-lg relative z-10">
        <h3 className="text-sm font-semibold text-white mb-3">Типы транзакций:</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
          <div>🌾 UNI Farming - зеленый градиент</div>
          <div>🚀 TON Boost - синий технологичный</div>
          <div>👥 Referral Reward - розовый социальный</div>
          <div>🎯 Mission Complete - фиолетовый достижений</div>
          <div>🎁 Daily Bonus - золотой праздничный</div>
          <div>✨ Airdrop Reward - радужный магический</div>
          <div>💰 UNI Пополнение - изумрудный</div>
          <div>💎 TON Пополнение - циановый</div>
        </div>
      </div>
    </div>
  );
};

export default TransactionPreview;