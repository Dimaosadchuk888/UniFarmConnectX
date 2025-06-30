import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

interface UserBalance {
  balance_uni: string;
  balance_ton: string;
  uni_farming_balance: string;
  accumulated_ton: string;
}

export function useBalance(userId: string | number) {
  return useQuery<UserBalance>({
    queryKey: [`/api/wallet/balance?user_id=${userId}`],
    enabled: !!userId,
    refetchInterval: 5000, // Обновляем каждые 5 секунд
    staleTime: 1000, // Данные считаются устаревшими через 1 секунду
  });
}

export function useUserProfile(userId: string | number) {
  return useQuery({
    queryKey: [`/api/me?user_id=${userId}`],
    enabled: !!userId,
  });
}