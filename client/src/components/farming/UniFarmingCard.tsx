import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Coins, Play, Pause, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UniFarmingCardProps {
  userData?: any;
}

export default function UniFarmingCard({ userData }: UniFarmingCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: farmingData, isLoading } = useQuery<{
    success: boolean;
    data: {
      isActive: boolean;
      startTime?: string;
      endTime?: string;
      progress: number;
      expectedReward: number;
      canHarvest: boolean;
    };
  }>({
    queryKey: ['/api/v2/uni-farming/status'],
  });

  const startFarmingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v2/uni-farming/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/uni-farming/status'] });
      toast({
        title: "Фарминг запущен",
        description: "UNI фарминг успешно начат!",
      });
    },
  });

  const claimFarmingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v2/uni-farming/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/uni-farming/status'] });
      toast({
        title: "Награда получена",
        description: "UNI фарминг награда успешно получена!",
      });
    },
  });

  const farming = farmingData?.data || {
    isActive: false,
    progress: 0,
    expectedReward: 0,
    canHarvest: false,
  };

  if (isLoading) {
    return (
      <Card className="card-hover-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            UNI Фарминг
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-muted animate-pulse rounded" />
            <div className="h-10 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover-effect">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          UNI Фарминг
          {farming.isActive && (
            <Badge variant="secondary" className="ml-auto">
              Активен
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Прогресс фарминга */}
          {farming.isActive && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Прогресс</span>
                <span>{farming.progress}%</span>
              </div>
              <Progress value={farming.progress} className="h-2" />
            </div>
          )}

          {/* Ожидаемая награда */}
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {farming.expectedReward.toFixed(4)} UNI
            </div>
            <p className="text-sm text-muted-foreground">
              {farming.isActive ? 'Ожидаемая награда' : 'Потенциальная награда'}
            </p>
          </div>

          {/* Кнопки действий */}
          <div className="space-y-2">
            {!farming.isActive ? (
              <Button 
                className="w-full gradient-button"
                onClick={() => startFarmingMutation.mutate()}
                disabled={startFarmingMutation.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                Начать фарминг
              </Button>
            ) : farming.canHarvest ? (
              <Button 
                className="w-full gradient-button"
                onClick={() => claimFarmingMutation.mutate()}
                disabled={claimFarmingMutation.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                Собрать урожай
              </Button>
            ) : (
              <Button variant="outline" className="w-full" disabled>
                <Pause className="h-4 w-4 mr-2" />
                Фарминг активен
              </Button>
            )}
          </div>

          {/* Время фарминга */}
          {farming.isActive && farming.endTime && (
            <div className="text-center text-xs text-muted-foreground">
              Завершится: {new Date(farming.endTime).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}