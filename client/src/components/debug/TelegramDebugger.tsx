import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

/**
 * Компонент для отладки Telegram данных в Telegram Mini App
 * Используется в режиме разработки для диагностики проблем с Telegram API
 */
const TelegramDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('telegram');
  const { toast } = useToast();

  // Функция для получения диагностических данных с сервера
  const fetchDebugInfo = async () => {
    setIsLoading(true);
    try {
      const result = await apiRequest('/api/telegram-debug');
      if (result.success && result.data) {
        setDebugInfo(result.data);
        toast({
          title: 'Данные получены',
          description: 'Диагностическая информация успешно загружена',
          variant: 'default',
        });
      } else {
        throw new Error('Не удалось получить диагностические данные');
      }
    } catch (error) {
      console.error('Error fetching debug info:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось получить данные для диагностики',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Определение интерфейса для данных о Telegram WebApp
  interface TelegramWebAppInfo {
    timestamp: string;
    isTelegramAvailable: boolean;
    isWebAppAvailable: boolean;
    browserEnvironment: {
      userAgent: string;
      href: string;
      referrer: string;
      isIframe: boolean;
    };
    webAppInfo?: {
      platform: string;
      version: string;
      colorScheme: string;
      themeParams: string | Record<string, string>;
      startParam: string;
      // Дополнительные поля, которые могут быть доступны в более новых версиях
      // но не включены в наше объявление типов
      [key: string]: any;
    };
    userData?: Record<string, any> | string;
    initData?: {
      length: number;
      sample: string;
    } | string;
    initDataFormat?: string;
    initDataParams?: string[];
    initDataParseError?: string;
  }

  // Прямое получение данных из Telegram WebApp
  const getTelegramWebAppInfo = () => {
    const telegramInfo: TelegramWebAppInfo = {
      timestamp: new Date().toISOString(),
      isTelegramAvailable: !!window.Telegram,
      isWebAppAvailable: !!window.Telegram?.WebApp,
      browserEnvironment: {
        userAgent: navigator.userAgent,
        href: window.location.href,
        referrer: document.referrer,
        isIframe: window !== window.parent,
      }
    };

    if (window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      
      telegramInfo.webAppInfo = {
        platform: webApp.platform || 'not available',
        version: webApp.version || 'not available',
        colorScheme: webApp.colorScheme || 'not available',
        themeParams: webApp.themeParams || 'not available',
        startParam: webApp.startParam || 'not available',
        // Безопасно добавляем дополнительные поля, которые могут быть в более новых версиях
        // но не указаны в нашем объявлении типов
        isExpanded: (webApp as any).isExpanded || false,
        viewportHeight: (webApp as any).viewportHeight || 'not available',
        viewportWidth: (webApp as any).viewportWidth || 'not available',
      };

      // Безопасно извлекаем информацию о пользователе
      const user = webApp.initDataUnsafe?.user;
      if (user) {
        telegramInfo.userData = {
          id: user.id || 'not available',
          first_name: user.first_name || 'not available',
          last_name: user.last_name || 'not available',
          username: user.username || 'not available',
          // Безопасно обращаемся к полям, которых может не быть в типах
          language_code: (user as any).language_code || 'not available',
          has_photo: !!user.photo_url
        };
      } else {
        telegramInfo.userData = 'User data not available';
      }

      // Получаем initData для отправки на сервер (маскируем hash для безопасности)
      if (webApp.initData) {
        telegramInfo.initData = {
          length: webApp.initData.length,
          sample: webApp.initData.length > 20 ? 
            `${webApp.initData.substring(0, 10)}...${webApp.initData.substring(webApp.initData.length - 10)}` : 
            'too short'
        };

        // Проверяем, содержит ли initData данные в формате query string
        if (webApp.initData.includes('=') && webApp.initData.includes('&')) {
          telegramInfo.initDataFormat = 'query-string';

          try {
            const params = new URLSearchParams(webApp.initData);
            const paramKeys: string[] = [];
            params.forEach((value, key) => {
              paramKeys.push(key);
            });
            telegramInfo.initDataParams = paramKeys;
          } catch (e) {
            telegramInfo.initDataParseError = 'Failed to parse initData as query params';
          }
        }
      } else {
        telegramInfo.initData = 'No initData available';
      }
    }

    // Сохраняем информацию в состоянии
    setDebugInfo((prevState: any) => {
      return {
        ...prevState,
        clientSideInfo: telegramInfo
      };
    });

    toast({
      title: 'Локальные данные получены',
      description: 'Информация из Telegram WebApp собрана',
      variant: 'default',
    });
  };

  // Функция для форматированного отображения JSON
  const prettyPrintJson = (data: any) => {
    try {
      if (typeof data === 'string') {
        return data;
      }
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return 'Error formatting JSON';
    }
  };

  // Обработчик для копирования информации в буфер обмена
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Скопировано',
        description: 'Информация скопирована в буфер обмена',
        variant: 'default',
      });
    }).catch(err => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось скопировать в буфер обмена',
        variant: 'destructive',
      });
      console.error('Failed to copy: ', err);
    });
  };

  // Инициализация при первой загрузке
  useEffect(() => {
    // Автоматически собираем данные из Telegram WebApp
    getTelegramWebAppInfo();
  }, []);

  // Визуализируем диагностическую информацию
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Telegram Debugger</span>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={getTelegramWebAppInfo}
            >
              <i className="fas fa-mobile-alt mr-2"></i>
              Локальные данные
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={fetchDebugInfo}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Загрузка...
                </>
              ) : (
                <>
                  <i className="fas fa-server mr-2"></i>
                  Серверные данные
                </>
              )}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Инструмент диагностики для отладки интеграции с Telegram Mini App
        </CardDescription>
      </CardHeader>
      <CardContent>
        {debugInfo ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="telegram">
                <i className="fas fa-paper-plane mr-2"></i>
                Telegram
              </TabsTrigger>
              <TabsTrigger value="headers">
                <i className="fas fa-list mr-2"></i>
                Заголовки
              </TabsTrigger>
              <TabsTrigger value="parsed-data">
                <i className="fas fa-code mr-2"></i>
                Данные
              </TabsTrigger>
              <TabsTrigger value="environment">
                <i className="fas fa-laptop-code mr-2"></i>
                Окружение
              </TabsTrigger>
            </TabsList>

            <TabsContent value="telegram">
              <div className="bg-muted/50 p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">Telegram WebApp состояние</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Клиентская информация */}
                  <div className="bg-card p-3 rounded-md">
                    <h4 className="font-semibold mb-2 flex items-center">
                      <i className="fas fa-browser mr-2 text-primary"></i>
                      Клиентская информация
                    </h4>
                    <Separator className="my-2" />
                    {debugInfo.clientSideInfo ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                          <div className="font-medium">Telegram доступен:</div>
                          <div>
                            {debugInfo.clientSideInfo.isTelegramAvailable ? 
                              <span className="text-green-500">Да</span> : 
                              <span className="text-red-500">Нет</span>}
                          </div>
                          
                          <div className="font-medium">WebApp доступен:</div>
                          <div>
                            {debugInfo.clientSideInfo.isWebAppAvailable ? 
                              <span className="text-green-500">Да</span> : 
                              <span className="text-red-500">Нет</span>}
                          </div>
                          
                          <div className="font-medium">В iframe:</div>
                          <div>
                            {debugInfo.clientSideInfo.browserEnvironment?.isIframe ? 
                              <span className="text-green-500">Да</span> : 
                              <span className="text-orange-500">Нет</span>}
                          </div>
                          
                          {debugInfo.clientSideInfo.webAppInfo && (
                            <>
                              <div className="font-medium">Платформа:</div>
                              <div>{debugInfo.clientSideInfo.webAppInfo.platform}</div>
                              
                              <div className="font-medium">Версия:</div>
                              <div>{debugInfo.clientSideInfo.webAppInfo.version}</div>
                              
                              <div className="font-medium">Start Parameter:</div>
                              <div>{debugInfo.clientSideInfo.webAppInfo.startParam}</div>
                            </>
                          )}
                        </div>
                        
                        {/* Данные пользователя */}
                        {debugInfo.clientSideInfo.userData && 
                         typeof debugInfo.clientSideInfo.userData === 'object' && (
                          <div className="mt-4">
                            <h5 className="font-semibold">Данные пользователя:</h5>
                            <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 p-2 rounded-md mt-1">
                              <div className="font-medium">ID:</div>
                              <div>{debugInfo.clientSideInfo.userData.id}</div>
                              
                              <div className="font-medium">Имя:</div>
                              <div>{debugInfo.clientSideInfo.userData.first_name}</div>
                              
                              <div className="font-medium">Фамилия:</div>
                              <div>{debugInfo.clientSideInfo.userData.last_name}</div>
                              
                              <div className="font-medium">Username:</div>
                              <div>{debugInfo.clientSideInfo.userData.username}</div>
                              
                              <div className="font-medium">Язык:</div>
                              <div>{debugInfo.clientSideInfo.userData.language_code}</div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-muted-foreground italic">
                        Нет данных. Нажмите "Локальные данные" для сбора информации.
                      </div>
                    )}
                  </div>
                  
                  {/* Серверная информация */}
                  <div className="bg-card p-3 rounded-md">
                    <h4 className="font-semibold mb-2 flex items-center">
                      <i className="fas fa-server mr-2 text-primary"></i>
                      Серверная информация
                    </h4>
                    <Separator className="my-2" />
                    {debugInfo.telegramSpecificHeaders ? (
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="font-medium">telegramData:</div>
                        <div className="bg-muted/50 p-2 rounded overflow-x-auto text-xs max-h-24">
                          {debugInfo.telegramSpecificHeaders.telegramData || 'отсутствует'}
                        </div>
                        
                        <div className="font-medium">telegramInitData:</div>
                        <div className="bg-muted/50 p-2 rounded overflow-x-auto text-xs max-h-24">
                          {debugInfo.telegramSpecificHeaders.telegramInitData || 'отсутствует'}
                        </div>
                        
                        <div className="font-medium">telegramUserId:</div>
                        <div>
                          {debugInfo.telegramSpecificHeaders.telegramUserId || 'отсутствует'}
                        </div>
                        
                        <div className="font-medium">startParam:</div>
                        <div>
                          {debugInfo.telegramSpecificHeaders.startParam || 'отсутствует'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground italic">
                        Нет данных с сервера. Нажмите "Серверные данные" для загрузки.
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Парсинг initData */}
                {debugInfo.parsedInitData && (
                  <div className="mt-4 bg-card p-3 rounded-md">
                    <h4 className="font-semibold mb-2">Parsed initData</h4>
                    <Separator className="my-2" />
                    <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto max-h-60">
                      {prettyPrintJson(debugInfo.parsedInitData)}
                    </pre>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="headers">
              <div className="bg-muted/50 p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">Заголовки запроса</h3>
                {debugInfo.headers ? (
                  <pre className="bg-card p-3 rounded text-xs overflow-x-auto max-h-96">
                    {prettyPrintJson(debugInfo.headers)}
                  </pre>
                ) : (
                  <div className="text-muted-foreground italic">
                    Нет данных с сервера. Нажмите "Серверные данные" для загрузки.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="parsed-data">
              <div className="bg-muted/50 p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">Разобранные данные</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card p-3 rounded-md">
                    <h4 className="font-semibold mb-2">Параметры запроса</h4>
                    <Separator className="my-2" />
                    <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto max-h-60">
                      {prettyPrintJson(debugInfo.queryParams)}
                    </pre>
                  </div>
                  <div className="bg-card p-3 rounded-md">
                    <h4 className="font-semibold mb-2">Параметры из initData</h4>
                    <Separator className="my-2" />
                    <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto max-h-60">
                      {prettyPrintJson(debugInfo.parsedInitData || 'No data available')}
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="environment">
              <div className="bg-muted/50 p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">Окружение</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card p-3 rounded-md">
                    <h4 className="font-semibold mb-2">Серверное окружение</h4>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="font-medium">Окружение:</div>
                      <div>{debugInfo.environment}</div>
                      
                      <div className="font-medium">IP адрес:</div>
                      <div>{debugInfo.ipInfo?.ip}</div>
                      
                      <div className="font-medium">X-Forwarded-For:</div>
                      <div>{debugInfo.ipInfo?.forwardedFor}</div>
                      
                      <div className="font-medium">Метка времени:</div>
                      <div>{debugInfo.timestamp}</div>
                    </div>
                  </div>
                  <div className="bg-card p-3 rounded-md">
                    <h4 className="font-semibold mb-2">Клиентское окружение</h4>
                    <Separator className="my-2" />
                    {debugInfo.clientSideInfo?.browserEnvironment ? (
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="font-medium">User Agent:</div>
                        <div className="bg-muted/50 p-2 rounded overflow-x-auto text-xs">
                          {debugInfo.clientSideInfo.browserEnvironment.userAgent}
                        </div>
                        
                        <div className="font-medium">URL:</div>
                        <div className="bg-muted/50 p-2 rounded overflow-x-auto text-xs">
                          {debugInfo.clientSideInfo.browserEnvironment.href}
                        </div>
                        
                        <div className="font-medium">Referrer:</div>
                        <div className="bg-muted/50 p-2 rounded overflow-x-auto text-xs">
                          {debugInfo.clientSideInfo.browserEnvironment.referrer || 'отсутствует'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground italic">
                        Нет данных. Нажмите "Локальные данные" для сбора информации.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="p-10 text-center text-muted-foreground">
            <i className="fas fa-circle-info text-4xl mb-4 text-primary/50"></i>
            <p>Для начала диагностики выберите тип данных для анализа:</p>
            <div className="flex justify-center mt-4 gap-4">
              <Button onClick={getTelegramWebAppInfo} variant="outline">
                <i className="fas fa-mobile-alt mr-2"></i>
                Локальные данные
              </Button>
              <Button onClick={fetchDebugInfo}>
                <i className="fas fa-server mr-2"></i>
                Серверные данные
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between flex-wrap gap-2">
        <div className="text-xs text-muted-foreground">
          Telegram Debugger v1.0.0 | {new Date().toLocaleDateString()}
        </div>
        {debugInfo && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => copyToClipboard(JSON.stringify(debugInfo, null, 2))}
          >
            <i className="fas fa-copy mr-2"></i>
            Скопировать все данные
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default TelegramDebugger;