import { toast } from "@/hooks/use-toast"

// Фирменные уведомления UniFarm с улучшенным дизайном

export const showSuccessToast = (title: string, description?: string) => {
  toast({
    title: `✅ ${title}`,
    description,
    variant: "success" as any,
    duration: 5000,
  })
}

export const showErrorToast = (title: string, description?: string) => {
  toast({
    title: `⚠️ ${title}`,
    description,
    variant: "destructive",
    duration: 8000,
  })
}

export const showWarningToast = (title: string, description?: string) => {
  toast({
    title: `💡 ${title}`,
    description,
    variant: "warning" as any,
    duration: 6000,
  })
}

export const showInfoToast = (title: string, description?: string) => {
  toast({
    title: `ℹ️ ${title}`,
    description,
    variant: "info" as any,
    duration: 5000,
  })
}

export const showPremiumToast = (title: string, description?: string) => {
  toast({
    title: `🚀 ${title}`,
    description,
    variant: "premium" as any,
    duration: 5000,
  })
}

// Специальные уведомления для UniFarm
export const showInsufficientFundsToast = (requiredAmount: number, availableAmount: number, currency: string) => {
  showErrorToast(
    "Недостаточно средств",
    `Пополните кошелек и повторите запрос. Требуется: ${requiredAmount} ${currency}, доступно: ${availableAmount.toFixed(6)} ${currency}`
  )
}

export const showBoostActivatedToast = (packageName: string) => {
  showPremiumToast(
    "TON Boost активирован!",
    `${packageName} успешно активирован. Доходность увеличена!`
  )
}

export const showDepositSuccessToast = (amount: number, currency: string) => {
  showSuccessToast(
    "Пополнение успешно",
    `${amount} ${currency} зачислено на ваш баланс`
  )
}

export const showWithdrawalSuccessToast = (amount: number, currency: string) => {
  showSuccessToast(
    "Вывод обработан",
    `${amount} ${currency} будет переведено в течение нескольких минут`
  )
}