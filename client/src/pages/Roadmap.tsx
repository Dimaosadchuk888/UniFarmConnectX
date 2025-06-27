import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FiCheckCircle, 
  FiCircle, 
  FiAlertTriangle, 
  FiTarget,
  FiDollarSign,
  FiUsers,
  FiGift,
  FiTrendingUp,
  FiDatabase,
  FiShield,
  FiSettings,
  FiGlobe
} from 'react-icons/fi';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'planned';
  progress: number;
  category: 'core' | 'features' | 'infrastructure' | 'future';
  icon: React.ComponentType;
  details?: string[];
}

const roadmapData: RoadmapItem[] = [
  // Core Systems (100% Complete)
  {
    id: 'auth-system',
    title: 'Система авторизации',
    description: 'Telegram авторизация с JWT токенами',
    status: 'completed',
    progress: 100,
    category: 'core',
    icon: FiShield,
    details: ['HMAC-SHA256 валидация', 'JWT токены (7 дней)', 'Автоматическая регистрация']
  },
  {
    id: 'uni-farming',
    title: 'UNI Farming',
    description: '1% в день, автоматические начисления',
    status: 'completed',
    progress: 100,
    category: 'core',
    icon: FiTrendingUp,
    details: ['Депозиты от 1 UNI', 'Планировщик каждые 5 минут', 'Harvest функциональность']
  },
  {
    id: 'ton-boost',
    title: 'TON Boost пакеты',
    description: '5 пакетов с доходностью 1-3% в день',
    status: 'completed',
    progress: 100,
    category: 'core',
    icon: FiDollarSign,
    details: ['Starter от 1 TON', 'UNI бонусы до 1M', 'TON Connect интеграция']
  },
  {
    id: 'referral-system',
    title: 'Реферальная программа',
    description: '20-уровневая система комиссий',
    status: 'completed',
    progress: 100,
    category: 'core',
    icon: FiUsers,
    details: ['Комиссии 100%-20%', 'Автоматическое распределение', 'Реферальные коды']
  },
  {
    id: 'wallet-system',
    title: 'Система кошельков',
    description: 'UNI/TON балансы, пополнение, вывод',
    status: 'completed',
    progress: 100,
    category: 'core',
    icon: FiTarget,
    details: ['TON Connect', 'Депозиты/выводы', 'История транзакций']
  },
  
  // Features (95% Complete)
  {
    id: 'missions-system',
    title: 'Система заданий',
    description: 'Задания с наградами 500 UNI',
    status: 'in-progress',
    progress: 95,
    category: 'features',
    icon: FiTarget,
    details: ['4 активных миссии', 'Требуется: больше типов заданий', 'YouTube, Telegram, Invite задания']
  },
  {
    id: 'transaction-history',
    title: 'История транзакций',
    description: 'Отслеживание всех операций',
    status: 'in-progress',
    progress: 90,
    category: 'features',
    icon: FiDatabase,
    details: ['Базовое отображение', 'Требуется: фильтрация по дате/типу', 'Экспорт в CSV']
  },
  {
    id: 'airdrop-system',
    title: 'Система Airdrop',
    description: 'Распределение токенов',
    status: 'in-progress',
    progress: 85,
    category: 'features',
    icon: FiGift,
    details: ['Структура готова', 'Требуется: активация через админку', 'Кампании и клеймы']
  },
  {
    id: 'daily-bonus',
    title: 'Ежедневные бонусы',
    description: 'Streak система с накопительными бонусами',
    status: 'completed',
    progress: 100,
    category: 'features',
    icon: FiGift,
    details: ['Streak до 30 дней', 'Автоматические начисления', 'Прогрессивные награды']
  },
  
  // Infrastructure (100% Complete)
  {
    id: 'database-system',
    title: 'База данных',
    description: 'Supabase PostgreSQL, 10 таблиц',
    status: 'completed',
    progress: 100,
    category: 'infrastructure',
    icon: FiDatabase,
    details: ['Supabase API', '10 активных таблиц', 'Performance indexes']
  },
  {
    id: 'api-endpoints',
    title: 'API архитектура',
    description: '79 активных endpoints',
    status: 'completed',
    progress: 100,
    category: 'infrastructure',
    icon: FiSettings,
    details: ['14 модулей', 'Zod validation', 'Rate limiting']
  },
  {
    id: 'security-system',
    title: 'Система безопасности',
    description: 'Enterprise-grade защита',
    status: 'completed',
    progress: 100,
    category: 'infrastructure',
    icon: FiShield,
    details: ['92/100 security score', '4-tier rate limiting', 'Authorization на всех endpoints']
  },
  
  // Future Plans (0% Complete)
  {
    id: 'multi-language',
    title: 'Мультиязычность',
    description: 'Поддержка английского языка',
    status: 'planned',
    progress: 0,
    category: 'future',
    icon: FiGlobe,
    details: ['i18n интеграция', 'Английский/Русский', 'Переводы UI']
  },
  {
    id: 'push-notifications',
    title: 'Push уведомления',
    description: 'Уведомления о доходах и событиях',
    status: 'planned',
    progress: 0,
    category: 'future',
    icon: FiSettings,
    details: ['Telegram notifications', 'Email alerts', 'Farming notifications']
  },
  {
    id: 'analytics-dashboard',
    title: 'Аналитика',
    description: 'Расширенная статистика',
    status: 'planned',
    progress: 0,
    category: 'future',
    icon: FiTrendingUp,
    details: ['Charts.js интеграция', 'Revenue analytics', 'User behavior tracking']
  }
];

const categoryConfig = {
  core: { label: 'Основные системы', color: 'bg-green-500' },
  features: { label: 'Функциональность', color: 'bg-blue-500' },
  infrastructure: { label: 'Инфраструктура', color: 'bg-purple-500' },
  future: { label: 'Будущие планы', color: 'bg-gray-500' }
};

const statusConfig = {
  completed: { icon: FiCheckCircle, color: 'text-green-500', label: 'Завершено' },
  'in-progress': { icon: FiAlertTriangle, color: 'text-yellow-500', label: 'В процессе' },
  planned: { icon: FiCircle, color: 'text-gray-500', label: 'Запланировано' }
};

export default function Roadmap() {
  const groupedData = roadmapData.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, RoadmapItem[]>);

  const overallProgress = Math.round(
    roadmapData.reduce((sum, item) => sum + item.progress, 0) / roadmapData.length
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          UniFarm Roadmap
        </h1>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Комплексная карта развития проекта с детальным статусом каждого модуля
        </p>
        
        {/* Overall Progress */}
        <Card className="max-w-md mx-auto bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center">
            <CardTitle className="text-slate-200">Общий прогресс</CardTitle>
            <div className="text-3xl font-bold text-blue-400">{overallProgress}%</div>
          </CardHeader>
          <CardContent>
            <Progress value={overallProgress} />
            <p className="text-sm text-slate-400 mt-2">Production Ready</p>
          </CardContent>
        </Card>
      </div>

      {/* Roadmap Categories */}
      {Object.entries(groupedData).map(([category, items]) => {
        const config = categoryConfig[category as keyof typeof categoryConfig];
        const categoryProgress = Math.round(
          items.reduce((sum, item) => sum + item.progress, 0) / items.length
        );

        return (
          <div key={category} className="space-y-4">
            {/* Category Header */}
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${config.color}`}></div>
              <h2 className="text-2xl font-bold text-slate-200">{config.label}</h2>
              <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                {categoryProgress}%
              </Badge>
            </div>

            {/* Category Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const StatusIcon = statusConfig[item.status].icon;
                
                return (
                  <Card key={item.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-700/50 rounded-lg">
                            <item.icon size={20} color="#60a5fa" />
                          </div>
                          <div>
                            <CardTitle className="text-slate-200 text-base">{item.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <StatusIcon className={`w-4 h-4 ${statusConfig[item.status].color}`} />
                              <span className="text-xs text-slate-400">
                                {statusConfig[item.status].label}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={`${item.progress === 100 ? 'bg-green-500/20 text-green-400' : 
                            item.progress >= 80 ? 'bg-yellow-500/20 text-yellow-400' : 
                            'bg-slate-500/20 text-slate-400'}`}
                        >
                          {item.progress}%
                        </Badge>
                      </div>
                      <CardDescription className="text-slate-400">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <Progress value={item.progress} />
                      
                      {item.details && (
                        <div className="space-y-1">
                          {item.details.map((detail, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs">
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                              <span className="text-slate-400">{detail}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Footer Stats */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-200 text-center">Статистика проекта</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">
                {roadmapData.filter(item => item.status === 'completed').length}
              </div>
              <div className="text-xs text-slate-400">Завершено</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">
                {roadmapData.filter(item => item.status === 'in-progress').length}
              </div>
              <div className="text-xs text-slate-400">В процессе</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-400">
                {roadmapData.filter(item => item.status === 'planned').length}
              </div>
              <div className="text-xs text-slate-400">Запланировано</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">79</div>
              <div className="text-xs text-slate-400">API Endpoints</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}