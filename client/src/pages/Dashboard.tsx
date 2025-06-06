import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Coins, 
  Users, 
  Target,
  Zap,
  Gift,
  ArrowUp,
  Sparkles
} from "lucide-react";

const Dashboard: React.FC = () => {
  const { data: userResponse } = useQuery({
    queryKey: ['/api/v2/users/profile'],
    enabled: true
  });

  const userData = (userResponse as any)?.data || {
    username: 'Фермер',
    balance: 12450,
    farming_active: true,
    farming_rate: 0.5,
    level: 3,
    energy: 85,
    max_energy: 100
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Добро пожаловать в UniFarm
        </h1>
        <p className="text-slate-300">
          Привет, {userData.username}! Твоя ферма процветает
        </p>
      </div>

      <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-white">
            <Coins className="h-6 w-6 text-yellow-400" />
            Твой баланс
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-4xl font-bold text-white mb-2">
            {userData.balance.toLocaleString()} UNI
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <ArrowUp className="h-3 w-3 mr-1" />
            +{userData.farming_rate}/сек
          </Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-400" />
              Энергия
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-2">
              {userData.energy}/{userData.max_energy}
            </div>
            <Progress value={(userData.energy / userData.max_energy) * 100} className="h-2" />
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-400" />
              Уровень
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-2">
              {userData.level}
            </div>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              Фермер
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5 text-green-400" />
            UNI Фарминг
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Статус:</span>
            <Badge className={userData.farming_active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
              {userData.farming_active ? "Активен" : "Неактивен"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Скорость:</span>
            <span className="text-white font-semibold">{userData.farming_rate} UNI/сек</span>
          </div>
          {!userData.farming_active && (
            <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
              Начать фарминг
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700 cursor-pointer hover:bg-slate-700/50 transition-colors">
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 text-purple-400 mx-auto mb-2" />
            <h3 className="font-semibold text-white">Миссии</h3>
            <p className="text-sm text-slate-400">Выполни задания</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 cursor-pointer hover:bg-slate-700/50 transition-colors">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-pink-400 mx-auto mb-2" />
            <h3 className="font-semibold text-white">Друзья</h3>
            <p className="text-sm text-slate-400">Пригласи друзей</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Gift className="h-5 w-5 text-yellow-400" />
            Ежедневный бонус
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">День 1</p>
              <p className="text-slate-300 text-sm">Награда: 100 UNI</p>
            </div>
            <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
              Получить
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;