/**
 * TON Blockchain Dashboard
 * Компонент для расширенного взаимодействия с TON блокчейном
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import { 
  FiActivity, 
  FiDollarSign, 
  FiCopy, 
  FiExternalLink,
  FiRefreshCw,
  FiTrendingUp,
  FiBarChart
} from 'react-icons/fi';
import { RiWallet3Line as FiWallet } from 'react-icons/ri';
import { TonBlockchainService, TonWalletInfo, TonTransaction } from '../../services/tonBlockchainService';
import { useToast } from '../../hooks/use-toast';
import { formatNumberWithPrecision } from '../../lib/utils';

interface TonBlockchainDashboardProps {
  walletAddress?: string;
  showNetworkStats?: boolean;
}

const TonBlockchainDashboard: React.FC<TonBlockchainDashboardProps> = ({
  walletAddress,
  showNetworkStats = true
}) => {
  const { toast } = useToast();
  const [tonConnectUI] = useTonConnectUI();
  const [blockchainService] = useState(() => new TonBlockchainService(tonConnectUI));
  const [selectedTab, setSelectedTab] = useState('wallet');

  // Получение информации о кошельке
  const { data: walletInfo, isLoading: isLoadingWallet, refetch: refetchWallet } = useQuery({
    queryKey: ['ton-wallet-info', walletAddress],
    queryFn: () => walletAddress ? blockchainService.getWalletInfo(walletAddress) : null,
    enabled: !!walletAddress,
    staleTime: 30000, // 30 секунд
    refetchInterval: 60000 // Обновляем каждую минуту
  });

  // Получение истории транзакций
  const { data: transactions, isLoading: isLoadingTx, refetch: refetchTransactions } = useQuery({
    queryKey: ['ton-transactions', walletAddress],
    queryFn: () => walletAddress ? blockchainService.getTransactionHistory(walletAddress, 20) : [],
    enabled: !!walletAddress,
    staleTime: 30000,
    refetchInterval: 120000 // Обновляем каждые 2 минуты
  });

  // Получение курса TON
  const { data: tonPrice, isLoading: isLoadingPrice } = useQuery({
    queryKey: ['ton-price'],
    queryFn: () => blockchainService.getTonPriceUSD(),
    staleTime: 60000, // 1 минута
    refetchInterval: 300000 // Обновляем каждые 5 минут
  });

  // Получение статистики сети
  const { data: networkStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['ton-network-stats'],
    queryFn: () => blockchainService.getNetworkStats(),
    enabled: showNetworkStats,
    staleTime: 300000, // 5 минут
    refetchInterval: 600000 // Обновляем каждые 10 минут
  });

  // Копирование адреса в буфер обмена
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Скопировано',
        description: `${label} скопирован в буфер обмена`,
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось скопировать в буфер обмена',
        variant: 'destructive'
      });
    }
  };

  // Обновление всех данных
  const refreshAllData = () => {
    refetchWallet();
    refetchTransactions();
    toast({
      title: 'Обновление данных',
      description: 'Загружаем актуальную информацию о кошельке...',
      variant: 'default'
    });
  };

  // Форматирование времени транзакции
  const formatTransactionTime = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Компонент карточки кошелька
  const WalletCard = () => (
    <Card className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 border-blue-500/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-blue-100">TON Кошелек</CardTitle>
        <FiWallet className="h-4 w-4 text-blue-400" />
      </CardHeader>
      <CardContent>
        {isLoadingWallet ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : walletInfo ? (
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold text-white">
                {formatNumberWithPrecision(parseFloat(walletInfo.balance), 4)} TON
              </div>
              {tonPrice && (
                <p className="text-xs text-gray-400">
                  ≈ ${formatNumberWithPrecision(parseFloat(walletInfo.balance) * tonPrice, 2)} USD
                </p>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <Badge variant={walletInfo.isActive ? 'default' : 'secondary'}>
                {walletInfo.isActive ? 'Активен' : 'Неактивен'}
              </Badge>
              <div className="text-xs text-gray-400">
                Воркчейн: {walletInfo.workchain}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Адрес:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(walletInfo.address, 'Адрес кошелька')}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {blockchainService.formatTonAddress(walletInfo.address)}
                  <FiCopy className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <FiWallet className="h-8 w-8 mx-auto mb-2" />
            <p>Кошелек не подключен</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Компонент истории транзакций
  const TransactionsCard = () => (
    <Card className="bg-gradient-to-br from-green-500/10 to-blue-600/10 border-green-500/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-green-100">История транзакций</CardTitle>
        <FiActivity className="h-4 w-4 text-green-400" />
      </CardHeader>
      <CardContent>
        {isLoadingTx ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : transactions && transactions.length > 0 ? (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {transactions.slice(0, 10).map((tx, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      {parseFloat(tx.amount) > 0 ? '+' : ''}{formatNumberWithPrecision(parseFloat(tx.amount), 4)} TON
                    </span>
                    <Badge variant={tx.status === 'success' ? 'default' : 'destructive'}>
                      {tx.status === 'success' ? 'Успешно' : 'Ошибка'}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatTransactionTime(tx.time)}
                  </div>
                  {tx.comment && (
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {tx.comment}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(tx.hash, 'Хэш транзакции')}
                  className="ml-2"
                >
                  <FiCopy className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <FiActivity className="h-8 w-8 mx-auto mb-2" />
            <p>Нет транзакций</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Компонент статистики сети
  const NetworkStatsCard = () => (
    <Card className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border-purple-500/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-purple-100">Статистика сети TON</CardTitle>
        <FiBarChart className="h-4 w-4 text-purple-400" />
      </CardHeader>
      <CardContent>
        {isLoadingStats ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : networkStats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400">Общий объем</div>
                <div className="text-sm font-medium text-white">{networkStats.totalSupply} TON</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">В стейкинге</div>
                <div className="text-sm font-medium text-white">{networkStats.totalStaked} TON</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Валидаторы</div>
                <div className="text-sm font-medium text-white">{networkStats.validators}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">TPS</div>
                <div className="text-sm font-medium text-white">{networkStats.tps.toLocaleString()}</div>
              </div>
            </div>
            
            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Процент в стейкинге</span>
                <span className="text-xs text-white">
                  {((parseFloat(networkStats.totalStaked.replace(/,/g, '')) / parseFloat(networkStats.totalSupply.replace(/,/g, ''))) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={(parseFloat(networkStats.totalStaked.replace(/,/g, '')) / parseFloat(networkStats.totalSupply.replace(/,/g, ''))) * 100} 
                className="h-2"
              />
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <FiBarChart className="h-8 w-8 mx-auto mb-2" />
            <p>Статистика недоступна</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Компонент цены TON
  const PriceCard = () => (
    <Card className="bg-gradient-to-br from-orange-500/10 to-red-600/10 border-orange-500/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-orange-100">Курс TON</CardTitle>
        <FiTrendingUp className="h-4 w-4 text-orange-400" />
      </CardHeader>
      <CardContent>
        {isLoadingPrice ? (
          <Skeleton className="h-8 w-24" />
        ) : tonPrice ? (
          <div>
            <div className="text-2xl font-bold text-white">
              ${formatNumberWithPrecision(typeof tonPrice === 'number' ? tonPrice : parseFloat(tonPrice || '0'), 4)}
            </div>
            <p className="text-xs text-gray-400">За 1 TON</p>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <FiDollarSign className="h-8 w-8 mx-auto mb-2" />
            <p>Курс недоступен</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!walletAddress) {
    return (
      <Card className="bg-gradient-to-br from-gray-500/10 to-gray-600/10 border-gray-500/20">
        <CardContent className="pt-6">
          <div className="text-center text-gray-400">
            <FiWallet className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Подключите TON кошелек</h3>
            <p className="text-sm">Для просмотра blockchain данных необходимо подключить кошелек</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок с кнопкой обновления */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">TON Blockchain</h2>
        <Button
          onClick={refreshAllData}
          variant="outline"
          size="sm"
          className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
        >
          <FiRefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Основные карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <WalletCard />
        <PriceCard />
        {showNetworkStats && <NetworkStatsCard />}
      </div>

      {/* Детальная информация */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800/50">
          <TabsTrigger value="wallet" className="text-gray-300 data-[state=active]:text-white">
            Кошелек
          </TabsTrigger>
          <TabsTrigger value="transactions" className="text-gray-300 data-[state=active]:text-white">
            Транзакции
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="wallet" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <WalletCard />
            {showNetworkStats && <NetworkStatsCard />}
          </div>
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-4">
          <TransactionsCard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TonBlockchainDashboard;