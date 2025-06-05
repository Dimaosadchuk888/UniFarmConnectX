import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

// Функция для добавления эмодзи к тексту уведомления
const enhanceToastText = (text: string | React.ReactNode): React.ReactNode => {
  if (typeof text !== 'string') return text;
  
  // Простая проверка на наличие эмодзи в тексте
  const hasEmoji = (str: string) => {
    const emojiRanges = [
      0x1F600, 0x1F64F, // Emoticons
      0x1F300, 0x1F5FF, // Misc Symbols & Pictographs
      0x1F680, 0x1F6FF, // Transport & Map
      0x2600, 0x26FF,   // Misc symbols
      0x2700, 0x27BF,   // Dingbats
      0xFE00, 0xFE0F,   // Variation Selectors
      0x1F900, 0x1F9FF, // Supplemental Symbols and Pictographs
      0x1F1E6, 0x1F1FF  // Flags
    ];
    
    for (let i = 0; i < str.length; i++) {
      const code = str.codePointAt(i);
      if (!code) continue;
      
      for (let j = 0; j < emojiRanges.length; j += 2) {
        if (code >= emojiRanges[j] && code <= emojiRanges[j + 1]) {
          return true;
        }
      }
    }
    return false;
  };

  // Если в тексте уже есть эмодзи, возвращаем без изменений
  if (hasEmoji(text)) {
    return text;
  }

  // Адаптация текста в зависимости от содержимого
  let enhancedText = text;
  
  if (text.includes('UNI') || text.includes('монет')) {
    enhancedText = text.replace(/([\d.,]+)\s*UNI/g, '$1 UNI 💰');
  } else if (text.includes('TON')) {
    enhancedText = text.replace(/([\d.,]+)\s*TON/g, '$1 TON 💎');
  } else if (text.includes('кошелёк') || text.includes('кошелек')) {
    enhancedText = text.replace(/(кошелёк|кошелек)/g, '$1 👛');
  } else if (text.includes('бонус') || text.includes('награда')) {
    enhancedText = enhancedText + ' 🎁';
  } else if (text.includes('миссия') || text.includes('задание')) {
    enhancedText = enhancedText + ' ✅';
  } else if (text.includes('успешно') || text.includes('выполнено')) {
    enhancedText = enhancedText + ' 🎉';
  } else if (text.includes('ошибка') || text.includes('не удалось')) {
    enhancedText = '❌ ' + enhancedText;
  } else if (text.includes('внимание') || text.includes('предупреждение')) {
    enhancedText = '⚠️ ' + enhancedText;
  }
  
  return enhancedText;
};

// Функция для выбора эмодзи в зависимости от заголовка
const getEmojiForTitle = (title: string | React.ReactNode): string => {
  if (typeof title !== 'string') return '';
  
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('успех') || lowerTitle.includes('готово')) {
    return '🎉 ';
  } else if (lowerTitle.includes('ошибка')) {
    return '❌ ';
  } else if (lowerTitle.includes('внимание') || lowerTitle.includes('предупреждение')) {
    return '⚠️ ';
  } else if (lowerTitle.includes('информация') || lowerTitle.includes('заметка')) {
    return '💡 ';
  } else if (lowerTitle.includes('загрузка') || lowerTitle.includes('ожидание')) {
    return '⏳ ';
  } else if (lowerTitle.includes('бонус') || lowerTitle.includes('награда')) {
    return '🎁 ';
  } else if (lowerTitle.includes('миссия') || lowerTitle.includes('задание')) {
    return '📝 ';
  } else if (lowerTitle.includes('транзакция') || lowerTitle.includes('перевод')) {
    return '💳 ';
  } else if (lowerTitle.includes('uni')) {
    return '💰 ';
  } else if (lowerTitle.includes('ton')) {
    return '💎 ';
  }
  
  return '';
};

export function Toaster() {
  const { toasts } = useToast()

  // БЛОКИРУЕМ ВСЕ СИСТЕМНЫЕ УВЕДОМЛЕНИЯ ОБ ОШИБКАХ СОЕДИНЕНИЯ
  // Фильтруем toast-уведомления для блокировки системных ошибок
  const filteredToasts = toasts.filter(toast => {
    const title = typeof toast.title === 'string' ? toast.title.toLowerCase() : '';
    const description = typeof toast.description === 'string' ? toast.description.toLowerCase() : '';
    
    // Проверяем на системные ошибки соединения
    const isConnectionError = title.includes('ошибка соединения') ||
                             title.includes('ошибка подключения') ||
                             description.includes('ошибка соединения') ||
                             description.includes('попытка переподключения') ||
                             description.includes('соединения с сервером') ||
                             description.includes('connection') ||
                             description.includes('server error') ||
                             (toast.variant === 'destructive' && (
                               title.includes('ошибка') ||
                               description.includes('ошибка') ||
                               description.includes('error')
                             ));
    
    return !isConnectionError; // Показываем только НЕ системные ошибки
  });

  return (
    <ToastProvider>
      {filteredToasts.map(function ({ id, title, description, action, ...props }) {
        const emoji = title ? getEmojiForTitle(title) : '';
        
        return (
          <Toast key={id} {...props} className="border-l-4 border-primary group">
            <div className="grid gap-1">
              {title && (
                <ToastTitle className="font-semibold flex items-center">
                  {emoji && <span className="mr-1">{emoji}</span>}
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription className="text-sm opacity-90">
                  {enhanceToastText(description)}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
