import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, CreditCard } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useTonConnectUI } from '@tonconnect/ui-react';
// ВАЖНО: Используем новую реализацию без Buffer
import { 
  isTonWalletConnected, 
  isTonPaymentReady, 
  sendTonTransaction,
  createTonTransactionComment 
} from '../../services/simpleTonTransaction';

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boostId: number | null;
  boostName: string;
  onSelectPaymentMethod: (boostId: number, method: 'internal_balance' | 'external_wallet') => void;
}

const PaymentMethodDialog: React.FC<PaymentMethodDialogProps> = ({
  open,
  onOpenChange,
  boostId,
  boostName,
  onSelectPaymentMethod,
}) => {
  const { toast } = useToast();
  const [tonConnectUI] = useTonConnectUI();

  const handleSelectMethod = async (method: 'internal_balance' | 'external_wallet') => {
    console.log("[DIALOG DEBUG] handleSelectMethod вызван:", { method, boostId });
    
    // ПО ТЗ: Прямой вызов sendTonTransaction для теста
    if (method === 'external_wallet' && boostId !== null) {
      try {
        // Закрываем диалог перед вызовом
        onOpenChange(false);
        
        console.log("[TEST] НАЧИНАЕМ ТЕСТОВЫЙ ВЫЗОВ ТРАНЗАКЦИИ...");
        
        // Проверяем наличие tonConnectUI
        if (!tonConnectUI) {
          console.error("[TEST ERROR] tonConnectUI is null or undefined");
          toast({
            title: "Ошибка тестирования",
            description: "tonConnectUI отсутствует (null). Невозможно вызвать транзакцию.",
            variant: "destructive"
          });
          return;
        }
        
        console.log("[TEST] tonConnectUI состояние:", {
          connected: tonConnectUI.connected,
          hasWallet: !!tonConnectUI.wallet,
          hasAccount: !!tonConnectUI.account,
          hasAddress: tonConnectUI.account?.address ? true : false,
          hasSendTransaction: typeof tonConnectUI.sendTransaction === 'function'
        });
        
        // ПРЯМОЕ ВЫПОЛНЕНИЕ ТРАНЗАКЦИИ БЕЗ ПРОВЕРОК
        console.log("[TEST] FORCING sendTonTransaction...");
        
        // Получаем данные для теста
        const testAmount = "0.01"; // Минимальная сумма для теста
        const userId = 1; // Тестовый ID пользователя  
        const comment = createTonTransactionComment(userId, boostId);
        
        // Прямой вызов sendTonTransaction
        const result = await sendTonTransaction(tonConnectUI, testAmount, comment);
        
        console.log("[TEST] Результат вызова транзакции:", result);
        
        if (result) {
          toast({
            title: "Тест успешен",
            description: "Вызов sendTransaction успешно выполнен, Tonkeeper открылся",
          });
        } else {
          toast({
            title: "Отменено пользователем",
            description: "Транзакция была отменена в Tonkeeper",
            variant: "default"
          });
        }
      } catch (error) {
        console.error("[TEST ERROR] Ошибка при тестовом вызове sendTonTransaction:", error);
        toast({
          title: "Ошибка теста",
          description: `Не удалось вызвать sendTransaction: ${error}`,
          variant: "destructive"
        });
      }
      return;
    }
    
    // ОРИГИНАЛЬНЫЙ КОД (НЕ ВЫПОЛНЯЕТСЯ В ТЕСТОВОМ РЕЖИМЕ)
    if (boostId !== null) {
      // Если выбран внешний кошелек, проверяем подключение TonConnect
      if (method === 'external_wallet') {
        if (!tonConnectUI) {
          console.error('[ERROR] tonConnectUI not initialized in PaymentMethodDialog');
          toast({
            title: "Ошибка инициализации",
            description: "Произошла ошибка инициализации TonConnect. Пожалуйста, обновите страницу и попробуйте снова.",
            variant: "destructive"
          });
          onOpenChange(false);
          return;
        }
        
        // УДАЛЕНО ПО ТЗ: Временно убираем проверку готовности
        // const isReady = isTonPaymentReady(tonConnectUI);
        // if (!isReady) { ... }
      }
      
      onSelectPaymentMethod(boostId, method);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-blue-950/90 border-blue-800">
        <DialogHeader>
          <DialogTitle className="text-blue-200">Выберите способ оплаты</DialogTitle>
          <DialogDescription className="text-blue-400">
            Для активации TON Boost "{boostName}" выберите удобный способ оплаты
          </DialogDescription>
        </DialogHeader>
        
        {/* Debug info для разработки */}
        <div className="text-xs text-slate-500 mb-2">
          DEBUG: BoostID={boostId}, TonConnectReady={isTonPaymentReady(tonConnectUI) ? "Да" : "Нет"}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Button
            variant="outline"
            className="flex flex-col items-center justify-center h-32 space-y-2 border-blue-600 hover:bg-blue-800/30 hover:text-blue-200"
            onClick={() => handleSelectMethod('internal_balance')}
          >
            <CreditCard className="h-10 w-10 text-blue-400" />
            <span className="text-base">Внутренний баланс</span>
            <span className="text-xs text-blue-400">Использовать TON с баланса приложения</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex flex-col items-center justify-center h-32 space-y-2 border-blue-600 hover:bg-blue-800/30 hover:text-blue-200"
            onClick={() => handleSelectMethod('external_wallet')}
          >
            <Wallet className="h-10 w-10 text-blue-400" />
            <span className="text-base">Внешний кошелек</span>
            <span className="text-xs text-blue-400">Оплатить с помощью TON кошелька</span>
          </Button>
        </div>
        
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
          >
            Отмена
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodDialog;