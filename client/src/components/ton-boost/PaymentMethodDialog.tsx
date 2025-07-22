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
import { useUser } from '@/contexts/userContext';
// Обновлено: используем tonConnectService вместо simpleTonTransaction
import { 
  isTonWalletConnected, 
  isTonPaymentReady, 
  sendTonTransaction,
  createTonTransactionComment 
} from '@/services/tonConnectService';

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boostId: number | null;
  boostName: string;
  boostPriceTon: string; // Добавляем цену буста в TON
  onSelectPaymentMethod: (boostId: number, method: 'internal_balance' | 'external_wallet') => void;
}

const PaymentMethodDialog: React.FC<PaymentMethodDialogProps> = ({
  open,
  onOpenChange,
  boostId,
  boostName,
  boostPriceTon,
  onSelectPaymentMethod,
}) => {
  const { toast } = useToast();
  const [tonConnectUI] = useTonConnectUI();
  const { userId } = useUser();

  const handleSelectMethod = async (method: 'internal_balance' | 'external_wallet') => {
    
    // Убедимся, что boostPriceTon всегда имеет значение, используя дефолтную цену при null
    if (boostPriceTon === null || boostPriceTon === undefined) {
      const defaultPrices: Record<number, string> = { 1: "1", 2: "5", 3: "15", 4: "25" };
      // Безопасный доступ с проверкой, чтобы избежать ошибки "null cannot be used as index type"
      let defaultPrice = "1";
      if (boostId !== null && typeof boostId === 'number') {
        defaultPrice = defaultPrices[boostId] || "1";
      }
      boostPriceTon = defaultPrice;
    }
    
    // Отправка TON транзакции без использования Buffer или @ton/core
    if (method === 'external_wallet' && boostId !== null) {
      try {
        // Закрываем диалог перед вызовом
        onOpenChange(false);
        
        // Проверяем наличие tonConnectUI
        if (!tonConnectUI) {
          toast({
            title: "Ошибка подключения кошелька",
            description: "TonConnect не инициализирован. Перезагрузите приложение.",
            variant: "destructive"
          });
          return;
        }
        
        // Получаем данные для транзакции из хука useUser
        // userId уже получен из useUser() в начале компонента
        const comment = createTonTransactionComment(userId || 0, boostId);
        
        // ТЗ: Вычисляем nanoAmount и логируем её
        const tonAmount = parseFloat(boostPriceTon);
        if (isNaN(tonAmount)) {
          console.error("[ERROR] Невалидная цена пакета:", boostPriceTon);
          toast({
            title: "Ошибка платежа",
            description: "Некорректная сумма для платежа. Пожалуйста, попробуйте снова.",
            variant: "destructive"
          });
          return;
        }
        
        const nanoAmount = BigInt(tonAmount * 1e9).toString();
        console.log("✅ nanoAmount:", nanoAmount);
        
        // Вызываем sendTonTransaction с проверенной суммой
        // Используем nanoAmount вместо boostPriceTon для передачи точной суммы в sendTonTransaction
        const result = await sendTonTransaction(tonConnectUI, String(tonAmount), comment);
        
        console.log("[TON] Результат транзакции:", result);
        
        if (result && result.status === 'success') {
          toast({
            title: "Транзакция отправлена",
            description: "Платеж успешно отправлен в блокчейн TON",
          });
        } else {
          toast({
            title: "Платеж отменен",
            description: "Вы отменили транзакцию или произошла ошибка",
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
      <DialogContent className="bg-gradient-to-br from-background via-card/50 to-background border border-border/20 backdrop-blur-xl shadow-2xl shadow-primary/10">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">
            Способ оплаты
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80 text-base">
            Выберите удобный вариант для оплаты
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
          {/* Внутренний баланс карточка */}
          <div 
            className="group relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-card/60 via-card/40 to-card/60 p-6 cursor-pointer transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => handleSelectMethod('internal_balance')}
          >
            {/* Градиентный overlay для hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            
            <div className="relative flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 group-hover:from-primary/30 group-hover:to-purple-500/30 transition-all duration-300">
                <CreditCard className="h-8 w-8 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors duration-300">
                  Внутренний баланс
                </h3>
                <p className="text-sm text-muted-foreground/70">
                  Средства с вашего баланса
                </p>
              </div>
            </div>
          </div>

          {/* Внешний кошелек карточка */}
          <div 
            className="group relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-card/60 via-card/40 to-card/60 p-6 cursor-pointer transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => handleSelectMethod('external_wallet')}
          >
            {/* Градиентный overlay для hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            
            <div className="relative flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 group-hover:from-primary/30 group-hover:to-purple-500/30 transition-all duration-300">
                <Wallet className="h-8 w-8 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors duration-300">
                  Внешний кошелек
                </h3>
                <p className="text-sm text-muted-foreground/70">
                  Подключенный TON кошелек
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="pt-6 border-t border-border/20">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
          >
            Отмена
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodDialog;