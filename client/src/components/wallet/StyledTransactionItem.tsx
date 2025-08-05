import React, { useState } from 'react';
import { 
  Sprout, 
  Gift, 
  Users, 
  Target, 
  Coins,
  TrendingUp,
  TrendingDown,
  Rocket,
  Package,
  Zap,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Transaction {
  id: number;
  type: string;
  amount: number;
  currency: 'UNI' | 'TON';
  status: string;
  description?: string;
  createdAt: string;
  timestamp?: number;
  metadata?: {
    original_type?: string;
    transaction_source?: string;
    boost_package_id?: number;
    tx_hash?: string;
    ton_tx_hash?: string;
    [key: string]: any;
  };
}

interface StyledTransactionItemProps {
  transaction: Transaction;
}

// Типы конфигурации транзакций
type TransactionConfigType = 
  | 'UNI_FARMING' 
  | 'FARMING_REWARD'
  | 'FARMING_DEPOSIT'
  | 'TON_BOOST_INCOME'
  | 'DAILY_BONUS'
  | 'MISSION_REWARD'
  | 'REFERRAL_REWARD'
  | 'REFERRAL_REWARD_TON'
  | 'UNI_DEPOSIT'
  | 'TON_DEPOSIT'
  | 'UNI_WITHDRAWAL'
  | 'BOOST_PURCHASE'
  | 'AIRDROP_REWARD';

// Конфигурация стилей для каждого типа транзакции
const getTransactionConfig = (type: string, description?: string, metadata?: any, currency?: string) => {
  // Определяем тип транзакции на основе metadata, type и description (в порядке приоритета)
  let transactionType: TransactionConfigType = type as TransactionConfigType;
  
  // Приоритет 1: Используем metadata.original_type если доступен
  if (metadata?.original_type) {
    transactionType = metadata.original_type as TransactionConfigType;
  }
  // Приоритет 2: Различение реферальных наград по валюте
  else if (type === 'REFERRAL_REWARD') {
    console.log('[Color Debug] REFERRAL_REWARD detected:', { type, currency, description });
    if (currency === 'TON' || description?.includes('TON')) {
      console.log('[Color Debug] Setting TON referral -> REFERRAL_REWARD_TON (blue)');
      transactionType = 'REFERRAL_REWARD_TON';
    } else {
      console.log('[Color Debug] Setting UNI referral -> REFERRAL_REWARD (purple)');
      transactionType = 'REFERRAL_REWARD'; // UNI остается фиолетовым
    }
  }
  // Приоритет 3: Парсинг расширенных типов из description для FARMING_REWARD
  else if (type === 'FARMING_REWARD' && description) {
    if (description.includes('TON Boost') || description.includes('🚀')) {
      transactionType = 'TON_BOOST_INCOME';
    } else if (description.includes('Deposit') || description.includes('💳')) {
      if (description.includes('UNI')) {
        transactionType = 'UNI_DEPOSIT';
      } else {
        transactionType = 'TON_DEPOSIT';
      }
    } else if (description.includes('farming income') || description.includes('UNI farming')) {
      transactionType = 'UNI_FARMING';
    }
  }
  
  // Парсинг airdrop из DAILY_BONUS
  if (type === 'DAILY_BONUS' && (description?.includes('Airdrop') || description?.includes('🎁'))) {
    transactionType = 'AIRDROP_REWARD';
  }

  const configs: Record<TransactionConfigType, {
    icon: any;
    label: string;
    emoji: string;
    bgGradient: string;
    borderColor: string;
    iconColor: string;
    iconBg: string;
    textColor: string;
    amountColor: string;
  }> = {
    // UNI Farming - Зеленый с градиентом природы
    'UNI_FARMING': {
      icon: Sprout,
      label: 'UNI Farming',
      emoji: '🌾',
      bgGradient: 'from-green-500/20 to-emerald-600/20',
      borderColor: 'border-green-500/40',
      iconColor: 'text-green-400',
      iconBg: 'bg-green-500/20',
      textColor: 'text-green-300',
      amountColor: 'text-green-400'
    },
    'FARMING_REWARD': {
      icon: Sprout,
      label: 'UNI Farming',
      emoji: '🌾',
      bgGradient: 'from-green-500/20 to-emerald-600/20',
      borderColor: 'border-green-500/40',
      iconColor: 'text-green-400',
      iconBg: 'bg-green-500/20',
      textColor: 'text-green-300',
      amountColor: 'text-green-400'
    },
    
    // Farming Deposit - Фиолетовый брендовый
    'FARMING_DEPOSIT': {
      icon: Coins,
      label: 'UNI Farming Депозит',
      emoji: '💎',
      bgGradient: 'from-purple-500/20 to-violet-600/20',
      borderColor: 'border-purple-500/40',
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/20',
      textColor: 'text-purple-300',
      amountColor: 'text-purple-400'
    },
    
    // TON Boost - Синий технологичный
    'TON_BOOST_INCOME': {
      icon: Rocket,
      label: 'TON Boost',
      emoji: '🚀',
      bgGradient: 'from-blue-500/20 to-cyan-600/20',
      borderColor: 'border-blue-500/40',
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/20',
      textColor: 'text-blue-300',
      amountColor: 'text-blue-400'
    },
    
    // Daily Bonus - Золотой праздничный
    'DAILY_BONUS': {
      icon: Gift,
      label: 'Daily Bonus',
      emoji: '🎁',
      bgGradient: 'from-yellow-500/20 to-orange-600/20',
      borderColor: 'border-yellow-500/40',
      iconColor: 'text-yellow-400',
      iconBg: 'bg-yellow-500/20',
      textColor: 'text-yellow-300',
      amountColor: 'text-yellow-400'
    },
    
    // Mission Reward - Фиолетовый достижений
    'MISSION_REWARD': {
      icon: Target,
      label: 'Mission Complete',
      emoji: '🎯',
      bgGradient: 'from-purple-500/20 to-indigo-600/20',
      borderColor: 'border-purple-500/40',
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/20',
      textColor: 'text-purple-300',
      amountColor: 'text-purple-400'
    },
    
    // Referral Bonus UNI - Фиолетовый фирменный
    'REFERRAL_REWARD': {
      icon: Users,
      label: 'Referral Reward',
      emoji: '🤝',
      bgGradient: 'from-purple-500/20 to-violet-600/20',
      borderColor: 'border-purple-500/40',
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/20',
      textColor: 'text-purple-300',
      amountColor: 'text-purple-400'
    },
    
    // Referral Bonus TON - Синий похожий на TON Deposit
    'REFERRAL_REWARD_TON': {
      icon: Users,
      label: 'Referral Reward',
      emoji: '🤝',
      bgGradient: 'from-cyan-500/20 to-blue-600/20',
      borderColor: 'border-cyan-500/40',
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-500/20',
      textColor: 'text-cyan-300',
      amountColor: 'text-cyan-400'
    },
    
    // UNI Deposit - Зеленый с плюсом
    'UNI_DEPOSIT': {
      icon: TrendingUp,
      label: 'UNI Пополнение',
      emoji: '💰',
      bgGradient: 'from-emerald-500/20 to-green-600/20',
      borderColor: 'border-emerald-500/40',
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/20',
      textColor: 'text-emerald-300',
      amountColor: 'text-emerald-400'
    },
    
    // TON Deposit - Синий с плюсом
    'TON_DEPOSIT': {
      icon: TrendingUp,
      label: 'TON Пополнение',
      emoji: '💎',
      bgGradient: 'from-cyan-500/20 to-blue-600/20',
      borderColor: 'border-cyan-500/40',
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-500/20',
      textColor: 'text-cyan-300',
      amountColor: 'text-cyan-400'
    },
    
    // Withdrawal - Красный с минусом
    'UNI_WITHDRAWAL': {
      icon: TrendingDown,
      label: 'UNI Вывод',
      emoji: '📤',
      bgGradient: 'from-red-500/20 to-orange-600/20',
      borderColor: 'border-red-500/40',
      iconColor: 'text-red-400',
      iconBg: 'bg-red-500/20',
      textColor: 'text-red-300',
      amountColor: 'text-red-400'
    },
    
    // Boost Purchase - Оранжевый энергичный
    'BOOST_PURCHASE': {
      icon: Package,
      label: 'Покупка Пакета',
      emoji: '📦',
      bgGradient: 'from-orange-500/20 to-red-600/20',
      borderColor: 'border-orange-500/40',
      iconColor: 'text-orange-400',
      iconBg: 'bg-orange-500/20',
      textColor: 'text-orange-300',
      amountColor: 'text-orange-400'
    },
    
    // Airdrop - Радужный магический
    'AIRDROP_REWARD': {
      icon: Zap,
      label: 'Airdrop Reward',
      emoji: '✨',
      bgGradient: 'from-violet-500/20 to-purple-600/20',
      borderColor: 'border-violet-500/40',
      iconColor: 'text-violet-400',
      iconBg: 'bg-violet-500/20',
      textColor: 'text-violet-300',
      amountColor: 'text-violet-400'
    }
  };

  return configs[transactionType] || configs['FARMING_REWARD'];
};

// Форматирование даты
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Форматирование суммы
const formatAmount = (amount: number, currency: string): string => {
  if (currency === 'TON') {
    return amount.toFixed(6);
  } else {
    return amount >= 1 ? amount.toFixed(2) : amount.toFixed(6);
  }
};

// Определение знака операции
const getAmountSign = (type: string, description?: string): '+' | '-' => {
  if (type.includes('WITHDRAWAL') || 
      type.includes('PURCHASE') || 
      type === 'FARMING_DEPOSIT' ||
      description?.includes('Вывод') ||
      description?.includes('Покупка')) {
    return '-';
  }
  return '+';
};

const StyledTransactionItem: React.FC<StyledTransactionItemProps> = ({ 
  transaction 
}) => {
  const [hashCopied, setHashCopied] = useState(false);
  const config = getTransactionConfig(transaction.type, transaction.description, transaction.metadata, transaction.currency);
  const IconComponent = config.icon;
  const sign = getAmountSign(transaction.type, transaction.description);
  
  // Логика отображения хеша транзакции для TON депозитов
  const transactionHash = transaction.metadata?.tx_hash || transaction.metadata?.ton_tx_hash;
  const isTonDeposit = transaction.type === 'TON_DEPOSIT';
  
  // Функция копирования хеша
  const copyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setHashCopied(true);
      setTimeout(() => setHashCopied(false), 2000);
    } catch (err) {
      console.error('Ошибка копирования хеша:', err);
    }
  };
  
  return (
    <div 
      className={`
        relative overflow-hidden rounded-xl p-3 sm:p-4 
        bg-gradient-to-r ${config.bgGradient} 
        border ${config.borderColor}
        backdrop-blur-sm
        hover:scale-[1.01] transition-all duration-300
        shadow-lg hover:shadow-xl
      `}
    >
      {/* Subtle animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
      </div>
      
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Top section - Icon and Details */}
        <div className="flex items-start space-x-3 sm:space-x-4 min-w-0 flex-1">
          {/* Icon Container - Responsive sizes */}
          <div className={`
            w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${config.iconBg} 
            flex items-center justify-center flex-shrink-0
            border ${config.borderColor}
            shadow-lg
          `}>
            <IconComponent className={`w-5 h-5 sm:w-6 sm:h-6 ${config.iconColor}`} />
          </div>
          
          {/* Transaction Details */}
          <div className="space-y-1 min-w-0 flex-1">
            {/* Transaction Type with Emoji */}
            <div className="flex items-center space-x-2">
              <span className="text-base sm:text-lg">{config.emoji}</span>
              <span className={`font-semibold text-xs sm:text-sm ${config.textColor}`}>
                {config.label}
              </span>
            </div>
            
            {/* Date and Time */}
            <div className="text-xs text-gray-400">
              {formatDateTime(transaction.createdAt)}
            </div>
            
            {/* Description with proper wrapping */}
            {transaction.description && (
              <div className="text-xs text-gray-500 break-words pr-2">
                {transaction.description}
              </div>
            )}
          </div>
        </div>
        
        {/* Bottom/Right section - Amount and Currency */}
        <div className="flex sm:flex-col items-end sm:text-right space-x-3 sm:space-x-0 sm:space-y-1 ml-[52px] sm:ml-0">
          {/* Amount with Sign */}
          <div className={`text-sm sm:text-lg font-bold ${config.amountColor} whitespace-nowrap`}>
            {sign}{formatAmount(transaction.amount, transaction.currency)} {transaction.currency}
          </div>
          
          {/* Status and Currency badges in a row on mobile */}
          <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
            {/* Status Badge */}
            <div className={`
              inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-xs font-medium whitespace-nowrap
              ${transaction.status === 'completed' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/40' 
                : transaction.status === 'pending'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/40'
              }
            `}>
              <span className="hidden sm:inline">
                {transaction.status === 'completed' ? '✓ Завершено' :
                 transaction.status === 'pending' ? '⏳ В обработке' :
                 transaction.status === 'confirmed' ? '✓ Подтверждено' :
                 transaction.status}
              </span>
              <span className="sm:hidden">
                {transaction.status === 'completed' ? '✓' :
                 transaction.status === 'pending' ? '⏳' :
                 transaction.status === 'confirmed' ? '✓' :
                 transaction.status.slice(0, 3)}
              </span>
            </div>
            
            {/* Currency specific badge */}
            <div className={`
              text-xs px-1.5 sm:px-2 py-0.5 rounded-md inline-block
              ${transaction.currency === 'UNI' 
                ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
              }
            `}>
              {transaction.currency}
            </div>
          </div>
        </div>
      </div>
      
      {/* Хеш транзакции для TON депозитов */}
      {transactionHash && isTonDeposit && (
        <div className="relative z-10 mt-3 pt-3 border-t border-gray-600/30">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] h-6 max-w-[200px] bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
              <ExternalLink className="h-3 w-3 mr-1" />
              <span className="truncate">
                {transactionHash.length > 16 
                  ? `${transactionHash.slice(0, 8)}...${transactionHash.slice(-8)}`
                  : transactionHash
                }
              </span>
            </Badge>
            <button
              onClick={() => copyHash(transactionHash)}
              className="p-1.5 rounded hover:bg-cyan-500/20 transition-colors"
              title="Копировать хеш"
            >
              {hashCopied ? (
                <Check className="h-3 w-3 text-green-400" />
              ) : (
                <Copy className="h-3 w-3 text-cyan-400 hover:text-cyan-300" />
              )}
            </button>
            <a
              href={`https://tonviewer.com/transaction/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded hover:bg-cyan-500/20 transition-colors"
              title="Открыть в TON Viewer"
            >
              <ExternalLink className="h-3 w-3 text-cyan-400 hover:text-cyan-300" />
            </a>
          </div>
        </div>
      )}

      {/* Subtle glow effect */}
      <div className={`
        absolute inset-0 rounded-xl opacity-20 blur-xl
        bg-gradient-to-r ${config.bgGradient}
        pointer-events-none
      `}></div>
    </div>
  );
};

export default StyledTransactionItem;