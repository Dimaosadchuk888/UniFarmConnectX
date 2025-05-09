import React, { useEffect, useState } from 'react';
import { DirectMissionsList } from '@/components/missions/DirectMissionsList';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Компонент страницы миссий с прямыми вызовами API без использования React Query
 * Реализует ТЗ "Настроить вызов именно на /missions и обеспечить корректную загрузку карточек"
 */
const Missions: React.FC = () => {
  console.log('Rendering Missions page - Direct API version (v2)');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [missionsLoaded, setMissionsLoaded] = useState(false);
  
  // Эффект для загрузки миссий напрямую через API
  useEffect(() => {
    const checkEndpoints = async () => {
      try {
        setLoading(true);
        
        // Проверяем доступность эндпоинта /missions
        const missionsResponse = await correctApiRequest('/api/missions/active', 'GET');
        
        if (missionsResponse?.success) {
          console.log('✅ API /api/missions/active доступен и возвращает данные');
          setMissionsLoaded(true);
        } else {
          console.error('❌ API /api/missions/active недоступен или возвращает ошибку:', missionsResponse);
          setError('Не удалось загрузить миссии. Пожалуйста, попробуйте позже.');
        }
      } catch (err) {
        console.error('❌ Ошибка при проверке API:', err);
        setError('Произошла ошибка при проверке доступности миссий.');
      } finally {
        setLoading(false);
      }
    };
    
    checkEndpoints();
  }, []);
  
  // Отображение ошибки
  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
        
        <Card className="w-full mb-4 bg-opacity-80 border border-red-500/30 bg-red-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-red-300">
              <AlertCircle className="mr-2 h-5 w-5 text-red-400" />
              Ошибка загрузки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Отображение загрузки
  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }
  
  // Успешная загрузка - отображаем компонент DirectMissionsList
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      {missionsLoaded ? (
        <DirectMissionsList forceRefresh={false} />
      ) : (
        <Card className="w-full mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-yellow-400" />
              Миссии недоступны
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              В данный момент миссии недоступны. Пожалуйста, попробуйте позже.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Обновить
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Missions;
