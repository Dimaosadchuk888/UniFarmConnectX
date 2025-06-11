import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Coins, Users, Calendar, MessageCircle, Tv } from 'lucide-react';

/**
 * Простые карточки миссий для отображения на странице заданий
 * Используют статические данные для обеспечения стабильного отображения
 */
const SimpleMissionsList: React.FC = () => {
  // Миссии для отображения
  const missions = [
    {
      id: 1,
      title: 'Ежедневный вход',
      description: 'Заходите в приложение каждый день для получения бонуса',
      type: 'daily_login',
      reward_uni: '5.0',
      icon: Calendar
    },
    {
      id: 2,
      title: 'Пригласить друга',
      description: 'Пригласите друга и получите бонус за каждого нового пользователя',
      type: 'referral',
      reward_uni: '10.0',
      icon: Users
    },
    {
      id: 3,
      title: 'Активировать фарминг',
      description: 'Запустите UNI фарминг для начала пассивного дохода',
      type: 'farming_start',
      reward_uni: '2.5',
      icon: Coins
    },
    {
      id: 4,
      title: 'Подписаться на Telegram',
      description: 'Присоединитесь к нашему официальному Telegram каналу',
      type: 'telegram_join',
      reward_uni: '7.5',
      icon: MessageCircle
    },
    {
      id: 5,
      title: 'Подписка на YouTube',
      description: 'Подпишитесь на наш YouTube канал для получения обновлений',
      type: 'youtube_subscribe',
      reward_uni: '5.0',
      icon: Tv
    }
  ];

  const getStatusBadge = (status: string = 'available') => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Выполнено</Badge>;
      case 'processing':
        return <Badge variant="secondary">В процессе</Badge>;
      default:
        return <Badge variant="outline">Доступно</Badge>;
    }
  };

  const handleMissionClick = (mission: any) => {
    console.log('Mission clicked:', mission.title);
    // Здесь будет логика выполнения миссии
  };

  return (
    <div className="space-y-3">      
      {missions.map((mission) => {
        const IconComponent = mission.icon;
        
        return (
          <Card key={mission.id} className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-600/20 rounded-lg">
                    <IconComponent className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-base">{mission.title}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusBadge('available')}
                      <span className="text-yellow-400 text-sm font-medium">
                        +{mission.reward_uni} UNI
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <CardDescription className="text-gray-300 text-sm mb-4">
                {mission.description}
              </CardDescription>
              
              <Button 
                onClick={() => handleMissionClick(mission)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                Выполнить
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SimpleMissionsList;