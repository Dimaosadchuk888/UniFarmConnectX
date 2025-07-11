# 🎯 ПЛАН ОПТИМИЗАЦИЙ UNIFARM

**Дата:** 11 января 2025  
**Основание:** Аудит архитектуры UNIFARM_REQUEST_FLOW_AUDIT_2025-01-11.md  
**Цель:** Укрепление архитектуры для долгосрочной устойчивости и масштабируемости

---

## 📋 СОДЕРЖАНИЕ

1. [Централизация управления балансами](#1-централизация-управления-балансами)
2. [Реализация WebSocket в реальном времени](#2-реализация-websocket-в-реальном-времени)
3. [Интеграция TON кошельков](#3-интеграция-ton-кошельков)
4. [Корректная реализация farming_sessions](#4-корректная-реализация-farming_sessions)
5. [Исправление логики Referral наград](#5-исправление-логики-referral-наград)
6. [Стандартизация типов транзакций](#6-стандартизация-типов-транзакций)
7. [Оптимизация планировщиков](#7-оптимизация-планировщиков)
8. [Архитектурные улучшения](#8-архитектурные-улучшения)

---

## 1. ЦЕНТРАЛИЗАЦИЯ УПРАВЛЕНИЯ БАЛАНСАМИ

### 🎯 Что улучшить:
Перевести ВСЕ операции с балансами через единый BalanceManager, устранив прямые SQL обновления.

### ⚡ Почему важно:
- **Консистентность данных**: единая точка управления предотвращает race conditions
- **Аудит операций**: автоматическое логирование всех изменений
- **Масштабируемость**: легко добавить кэширование, валидацию, rollback

### 🔧 Как реализовать:

#### 1.1 Обновить UNI Farming депозит:
```typescript
// modules/farming/service.ts
async depositUniForFarming(userId: string, amount: number) {
  // БЫЛО: прямое обновление Supabase
  // СТАЛО:
  const { balanceManager } = await import('../../core/BalanceManager');
  
  // Проверка баланса
  const hasBalance = await balanceManager.hasSufficientBalance(
    parseInt(userId), amount, 0
  );
  
  if (!hasBalance) {
    throw new Error('Недостаточно средств');
  }
  
  // Атомарная транзакция
  await balanceManager.transaction(async (trx) => {
    // Списание UNI
    await balanceManager.subtractBalance(
      parseInt(userId), amount, 0, 
      'FarmingService.depositUni', trx
    );
    
    // Обновление farming полей через отдельный метод
    await this.updateFarmingState(userId, amount, trx);
  });
}
```

#### 1.2 Обновить планировщики:
```typescript
// core/scheduler/farmingScheduler.ts
async processUniFarmingIncome() {
  // Для каждого фармера
  const income = this.calculateIncome(farmer);
  
  // БЫЛО: прямой Supabase.update()
  // СТАЛО:
  await balanceManager.addBalance(
    farmer.id,
    income,
    0,
    'FarmingScheduler.processIncome'
  );
}
```

### ⚠️ Побочные эффекты:
- Небольшое увеличение latency (дополнительный слой абстракции)
- Требуется миграция всех существующих прямых SQL

---

## 2. РЕАЛИЗАЦИЯ WEBSOCKET В РЕАЛЬНОМ ВРЕМЕНИ

### 🎯 Что улучшить:
Реализовать полноценный WebSocket сервер для real-time обновлений балансов.

### ⚡ Почему важно:
- **UX**: мгновенные обновления без перезагрузки
- **Производительность**: снижение нагрузки от polling
- **Масштабируемость**: готовность к real-time features

### 🔧 Как реализовать:

#### 2.1 WebSocket сервер:
```typescript
// core/websocket/WebSocketServer.ts
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyJWT } from '../middleware/auth';

export class WebSocketServer {
  private io: Server;
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true
      }
    });
    
    this.setupMiddleware();
    this.setupHandlers();
  }

  private setupMiddleware() {
    // JWT авторизация
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const decoded = await verifyJWT(token);
        socket.data.userId = decoded.userId;
        next();
      } catch (error) {
        next(new Error('Unauthorized'));
      }
    });
  }

  private setupHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.data.userId;
      
      // Регистрация сокета
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);
      
      // Подписка на обновления
      socket.join(`user:${userId}`);
      
      // Очистка при отключении
      socket.on('disconnect', () => {
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.userSockets.delete(userId);
          }
        }
      });
    });
  }

  // Метод для отправки обновлений
  emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }
}
```

#### 2.2 Интеграция с BalanceNotificationService:
```typescript
// core/balanceNotificationService.ts
import { webSocketServer } from '../websocket';

private sendAggregatedUpdate(userId: string) {
  const updates = this.pendingUpdates.get(userId) || [];
  
  if (updates.length === 0) return;
  
  // Агрегация изменений
  const aggregated = this.aggregateUpdates(updates);
  
  // Отправка через WebSocket
  webSocketServer.emitToUser(userId, 'balance:update', {
    timestamp: new Date().toISOString(),
    changes: aggregated,
    currentBalance: {
      uni: aggregated.finalUni,
      ton: aggregated.finalTon
    }
  });
  
  // Очистка очереди
  this.pendingUpdates.delete(userId);
}
```

#### 2.3 Клиентская часть:
```typescript
// client/src/contexts/WebSocketContext.tsx
import { io, Socket } from 'socket.io-client';

export const WebSocketProvider: React.FC = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { token } = useAuth();
  
  useEffect(() => {
    if (!token) return;
    
    const newSocket = io(process.env.VITE_WS_URL, {
      auth: { token }
    });
    
    newSocket.on('balance:update', (data) => {
      // Обновление контекста пользователя
      queryClient.setQueryData(['user', 'balance'], data.currentBalance);
      
      // Toast уведомление
      toast({
        title: 'Баланс обновлен',
        description: `UNI: ${data.currentBalance.uni}, TON: ${data.currentBalance.ton}`
      });
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  }, [token]);
  
  return (
    <WebSocketContext.Provider value={{ socket }}>
      {children}
    </WebSocketContext.Provider>
  );
};
```

### ⚠️ Побочные эффекты:
- Требуется настройка CORS и проксирования
- Увеличение потребления памяти сервера
- Необходима обработка reconnect на клиенте

---

## 3. ИНТЕГРАЦИЯ TON КОШЕЛЬКОВ

### 🎯 Что улучшить:
Реализовать сохранение и управление TON wallet адресами.

### ⚡ Почему важно:
- **Аналитика**: отслеживание транзакций пользователей
- **Безопасность**: валидация платежей
- **UX**: автозаполнение адреса при выводе

### 🔧 Как реализовать:

#### 3.1 API endpoint:
```typescript
// modules/wallet/controller.ts
@requireTelegramAuth
async connectTonWallet(req: Request, res: Response) {
  try {
    const { walletAddress } = req.body;
    const userId = req.user!.id;
    
    // Валидация адреса
    if (!isValidTonAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный адрес кошелька'
      });
    }
    
    // Сохранение адреса
    const result = await this.walletService.saveTonWallet(
      userId,
      walletAddress
    );
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    return this.handleError(res, error);
  }
}

// modules/wallet/routes.ts
router.post('/connect-ton', controller.connectTonWallet.bind(controller));
```

#### 3.2 Service слой:
```typescript
// modules/wallet/service.ts
async saveTonWallet(userId: string, address: string) {
  // Проверка на дубликаты
  const existing = await supabase
    .from('users')
    .select('id')
    .eq('ton_wallet_address', address)
    .neq('id', userId)
    .single();
    
  if (existing.data) {
    throw new Error('Этот адрес уже привязан к другому аккаунту');
  }
  
  // Сохранение
  const { data, error } = await supabase
    .from('users')
    .update({
      ton_wallet_address: address,
      ton_wallet_verified: true,
      ton_wallet_linked_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();
    
  if (error) throw error;
  
  // Логирование события
  await this.logWalletConnection(userId, address);
  
  return data;
}
```

#### 3.3 Frontend интеграция:
```typescript
// client/src/components/ton-boost/BoostPackagesCard.tsx
const handleWalletConnect = async (wallet: Wallet) => {
  try {
    // Получение адреса из TonConnect
    const address = wallet.account.address;
    
    // Сохранение на backend
    const response = await fetch('/api/v2/wallet/connect-ton', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ walletAddress: address })
    });
    
    if (response.ok) {
      toast({
        title: 'Кошелек подключен',
        description: `Адрес ${address} сохранен`
      });
    }
  } catch (error) {
    console.error('Ошибка сохранения адреса:', error);
  }
};
```

### ⚠️ Побочные эффекты:
- Требуется миграция для существующих пользователей
- Дополнительная валидация при транзакциях

---

## 4. КОРРЕКТНАЯ РЕАЛИЗАЦИЯ FARMING_SESSIONS

### 🎯 Что улучшить:
Создавать записи в таблице farming_sessions при каждом депозите.

### ⚡ Почему важно:
- **История операций**: полный аудит farming активности
- **Аналитика**: расчет ROI, среднего времени farming
- **Поддержка**: разрешение споров с пользователями

### 🔧 Как реализовать:

```typescript
// modules/farming/service.ts
async createFarmingSession(
  userId: string, 
  amount: number,
  trx?: any
) {
  const sessionData = {
    user_id: parseInt(userId),
    deposit_amount: amount,
    start_time: new Date().toISOString(),
    status: 'active',
    rate: 0.01, // 1% daily
    accumulated_income: 0,
    last_update: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('farming_sessions')
    .insert(sessionData)
    .select()
    .single();
    
  if (error) throw error;
  
  return data;
}

// Интеграция в depositUniForFarming
async depositUniForFarming(userId: string, amount: number) {
  await balanceManager.transaction(async (trx) => {
    // Списание баланса
    await balanceManager.subtractBalance(...);
    
    // Создание сессии
    await this.createFarmingSession(userId, amount, trx);
    
    // Обновление статуса пользователя
    await this.updateFarmingState(userId, amount, trx);
  });
}
```

### ⚠️ Побочные эффекты:
- Увеличение объема данных в БД
- Требуется миграция исторических данных

---

## 5. ИСПРАВЛЕНИЕ ЛОГИКИ REFERRAL НАГРАД

### 🎯 Что улучшить:
Referral награды должны начисляться от дохода, а не от покупки Boost.

### ⚡ Почему важно:
- **Бизнес-логика**: награды должны быть от прибыли, а не от инвестиций
- **Экономика**: предотвращение инфляции токенов
- **Справедливость**: вознаграждение за реальную активность

### 🔧 Как реализовать:

```typescript
// modules/boost/service.ts
async purchaseWithInternalWallet(userId: string, boostId: number) {
  // ... покупка boost ...
  
  // УДАЛИТЬ эти строки:
  // await referralService.distributeReferralRewards(
  //   userId, boostAmount, 'TON', 'boost'
  // );
  
  // Вместо этого - только активация boost
  await this.activateBoostPackage(userId, boostId);
}

// modules/scheduler/tonBoostIncomeScheduler.ts
async processBoostIncome(user: any, boost: any) {
  const income = this.calculateIncome(boost);
  
  // Начисление дохода
  await balanceManager.addBalance(user.id, 0, income);
  
  // ТЕПЕРЬ начисляем referral от дохода
  await referralService.distributeReferralRewards(
    user.id.toString(),
    income.toString(),
    'TON',
    'boost_income' // новый тип источника
  );
}
```

### ⚠️ Побочные эффекты:
- Изменение экономики (меньше referral выплат)
- Требуется обновление документации

---

## 6. СТАНДАРТИЗАЦИЯ ТИПОВ ТРАНЗАКЦИЙ

### 🎯 Что улучшить:
Добавить корректные типы транзакций в enum и использовать их.

### ⚡ Почему важно:
- **Аналитика**: точная категоризация операций
- **Отчетность**: корректные финансовые отчеты
- **Масштабируемость**: легко добавлять новые типы

### 🔧 Как реализовать:

#### 6.1 Обновить enum в БД:
```sql
ALTER TYPE transaction_type ADD VALUE 'BOOST_PURCHASE';
ALTER TYPE transaction_type ADD VALUE 'FARMING_DEPOSIT';
ALTER TYPE transaction_type ADD VALUE 'BOOST_INCOME';
```

#### 6.2 Обновить код:
```typescript
// shared/types/transaction.ts
export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  FARMING_REWARD = 'FARMING_REWARD',
  FARMING_DEPOSIT = 'FARMING_DEPOSIT', // новый
  REFERRAL_REWARD = 'REFERRAL_REWARD',
  DAILY_BONUS = 'DAILY_BONUS',
  MISSION_REWARD = 'MISSION_REWARD',
  BOOST_PURCHASE = 'BOOST_PURCHASE',   // новый
  BOOST_INCOME = 'BOOST_INCOME',       // новый
  TON_BOOST_INCOME = 'TON_BOOST_INCOME',
  AIRDROP_CLAIM = 'AIRDROP_CLAIM'
}

// Использование правильных типов
// modules/boost/service.ts
await this.createTransaction({
  type: TransactionType.BOOST_PURCHASE, // вместо FARMING_REWARD
  // ...
});
```

### ⚠️ Побочные эффекты:
- Требуется миграция существующих транзакций
- Обновление отчетов и аналитики

---

## 7. ОПТИМИЗАЦИЯ ПЛАНИРОВЩИКОВ

### 🎯 Что улучшить:
Перевести планировщики на использование BalanceManager и оптимизировать запросы.

### ⚡ Почему важно:
- **Производительность**: batch обновления вместо одиночных
- **Надежность**: транзакционность операций
- **Мониторинг**: единая точка отслеживания

### 🔧 Как реализовать:

```typescript
// core/scheduler/optimizedScheduler.ts
export class OptimizedFarmingScheduler {
  async processBatch() {
    // Получаем всех активных фармеров
    const farmers = await this.getActiveFarmers();
    
    // Группируем обновления
    const updates = farmers.map(farmer => ({
      userId: farmer.id,
      uniIncome: this.calculateUniIncome(farmer),
      tonIncome: 0
    }));
    
    // Batch обновление через BalanceManager
    await balanceManager.batchUpdateBalances(updates);
    
    // Batch создание транзакций
    await this.createBatchTransactions(updates);
    
    // Referral награды тоже batch
    await this.processBatchReferrals(updates);
  }
  
  private async processBatchReferrals(updates: any[]) {
    // Параллельная обработка
    const promises = updates.map(update => 
      referralService.distributeReferralRewards(
        update.userId,
        update.uniIncome,
        'UNI',
        'farming'
      )
    );
    
    await Promise.all(promises);
  }
}
```

### ⚠️ Побочные эффекты:
- Сложнее отладка batch операций
- Требуется мониторинг производительности

---

## 8. АРХИТЕКТУРНЫЕ УЛУЧШЕНИЯ

### 🎯 Что улучшить:
Общие архитектурные паттерны и практики.

### ⚡ Почему важно:
- **Maintainability**: легче поддерживать код
- **Testability**: проще писать тесты
- **Scalability**: готовность к росту

### 🔧 Рекомендации:

#### 8.1 Repository паттерн для всех модулей:
```typescript
// core/base/BaseRepository.ts
export abstract class BaseRepository<T> {
  constructor(protected tableName: string) {}
  
  async findById(id: string): Promise<T | null> {
    const { data } = await supabase
      .from(this.tableName)
      .select()
      .eq('id', id)
      .single();
    return data;
  }
  
  async create(entity: Partial<T>): Promise<T> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(entity)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  
  // ... другие базовые методы
}
```

#### 8.2 Event-driven архитектура:
```typescript
// core/events/EventBus.ts
export class EventBus {
  private handlers = new Map<string, Set<Handler>>();
  
  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }
  
  async emit(event: string, data: any) {
    const handlers = this.handlers.get(event) || new Set();
    
    // Параллельное выполнение
    await Promise.all(
      Array.from(handlers).map(handler => handler(data))
    );
  }
}

// Использование
eventBus.on('balance:updated', async (data) => {
  await notificationService.notify(data);
  await analyticsService.track(data);
});
```

#### 8.3 Dependency Injection:
```typescript
// core/di/container.ts
import { Container } from 'inversify';

const container = new Container();

// Регистрация сервисов
container.bind<BalanceManager>('BalanceManager')
  .to(BalanceManager)
  .inSingletonScope();

container.bind<ReferralService>('ReferralService')
  .to(ReferralService)
  .inSingletonScope();

// Использование
const balanceManager = container.get<BalanceManager>('BalanceManager');
```

---

## 📊 ПРИОРИТЕТЫ РЕАЛИЗАЦИИ

### Фаза 1 (Критические):
1. Централизация балансов через BalanceManager
2. Исправление Referral логики
3. Стандартизация типов транзакций

### Фаза 2 (Важные):
4. WebSocket реализация
5. TON wallet интеграция
6. Farming sessions

### Фаза 3 (Оптимизация):
7. Оптимизация планировщиков
8. Архитектурные улучшения

---

## ⏱️ ОЦЕНКА ВРЕМЕНИ

| Задача | Оценка | Сложность |
|--------|---------|-----------|
| Централизация балансов | 2-3 дня | Средняя |
| WebSocket | 3-4 дня | Высокая |
| TON wallet | 1-2 дня | Низкая |
| Farming sessions | 1 день | Низкая |
| Referral логика | 1-2 дня | Средняя |
| Типы транзакций | 1 день | Низкая |
| Планировщики | 2-3 дня | Средняя |
| Архитектура | 5-7 дней | Высокая |

**Общая оценка:** 16-24 дня при последовательной реализации

---

**Конец документа**