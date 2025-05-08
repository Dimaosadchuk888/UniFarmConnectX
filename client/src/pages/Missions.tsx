import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { correctApiRequest } from '@/lib/correctApiRequest';

// Очень простая версия страницы с миссиями
const Missions: React.FC = () => {
  console.log('Rendering Ultra Simple Missions page');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missionsCount, setMissionsCount] = useState(0);
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        // Простой запрос к API для проверки доступности миссий
        console.log('Simple Missions: Загрузка данных...');
        const response = await correctApiRequest('/api/missions/active', 'GET');
        
        if (response && response.success && Array.isArray(response.data)) {
          console.log('Simple Missions: Получены данные:', response.data.length);
          setMissionsCount(response.data.length);
        } else {
          console.error('Simple Missions: Ошибка данных:', response);
          setError('Не удалось загрузить данные миссий');
        }
      } catch (err) {
        console.error('Simple Missions: Исключение:', err);
        setError('Произошла ошибка при загрузке миссий');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);
  
  // Отображение загрузки
  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Загрузка миссий...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-4 w-full bg-slate-800 animate-pulse rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Отображение ошибки
  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
        <Card className="border-red-800 mb-4">
          <CardHeader>
            <CardTitle className="flex items-center text-red-400">
              <AlertCircle className="mr-2 h-5 w-5" />
              Ошибка
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-300 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Основное отображение
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Доступные миссии</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Найдено миссий: <strong>{missionsCount}</strong>
          </p>
          <p>
            Эта страница временно отображается в упрощенном виде для отладки.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Missions;
