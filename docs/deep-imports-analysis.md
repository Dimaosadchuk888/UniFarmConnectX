# Deep Imports Analysis Report

## 📊 Статистика глубоких импортов

**Общее количество найденных случаев:** 61
- Трехуровневые импорты (../../../): 5
- Двухуровневые импорты (../../): 56

## 🔍 Детальный анализ по категориям

### 1. Трехуровневые импорты (../../../) - КРИТИЧЕСКИЕ

| Файл | Строка | Импорт | Алиас рекомендация |
|------|--------|--------|-------------------|
| `modules/referral/logic/rewardDistribution.ts` | 6 | `import { db } from '../../../server/db'` | `@/server/db` |
| `modules/referral/logic/rewardDistribution.ts` | 7 | `import { users, transactions } from '../../../shared/schema'` | `@/shared/schema` |
| `modules/referral/logic/deepReferral.ts` | 76 | `const { db } = await import('../../../server/db')` | `@/server/db` |
| `modules/referral/logic/deepReferral.ts` | 77 | `const { users } = await import('../../../shared/schema')` | `@/shared/schema` |
| `client/src/contexts/NotificationContext.tsx` | 2 | `import { Notification, NotificationOptions } from '../../../types/notification'` | `@/types/notification` |

### 2. Двухуровневые импорты (../../) по модулям

#### Modules -> Core (16 случаев - потенциальная циклическая зависимость)

**BaseController импорты:**
- `modules/admin/controller.ts:2`
- `modules/auth/controller.ts:2` 
- `modules/boost/controller.ts:2`
- `modules/dailyBonus/controller.ts:2`
- `modules/farming/controller.ts:2`
- `modules/missions/controller.ts:2`
- `modules/referral/controller.ts:2`
- `modules/telegram/controller.ts:2`
- `modules/user/controller.ts:2`
- `modules/wallet/controller.ts:2`

**Алиас:** `@/core/BaseController`

#### Modules -> Server/Shared (Критичные зависимости)

**Database импорты:**
```typescript
// Текущие пути:
../../server/db
../../shared/schema

// Рекомендуемые алиасы:
@/server/db
@/shared/schema
```

**Файлы с этими импортами:**
- `modules/admin/service.ts`
- `modules/boost/service.ts` 
- `modules/dailyBonus/service.ts`
- `modules/farming/service.ts`
- `modules/missions/service.ts`
- `modules/user/model.ts`
- `modules/user/service.ts`
- `modules/wallet/service.ts`
- `modules/referral/service.ts` (динамические импорты)

#### Core -> Config зависимости

```typescript
// Файл: core/config/index.ts
import { appConfig } from '../../config/app';
import { databaseConfig } from '../../config/database'; 
import { telegramConfig } from '../../config/telegram';

// Рекомендуемый алиас:
@/config/*
```

#### Client глубокие импорты

```typescript
// Telegram services
../../services/telegramErrorService
../../services/telegramThemeService
../../services/telegramButtonService
../../services/telegramAdvancedService

// Рекомендуемый алиас:
@/services/*
```

## 🔄 Анализ циклических зависимостей

### Обнаруженные потенциальные циклы:

1. **Modules ↔ Core:**
   - Modules импортируют BaseController из Core
   - Core может импортировать сервисы из Modules
   - **Риск:** Высокий

2. **Modules ↔ Shared:**
   - Все модули используют shared/schema
   - Shared может содержать ссылки на модули
   - **Риск:** Средний

## 💡 Рекомендуемые алиасы

### Основные алиасы для проекта:

```typescript
// tsconfig.json paths
{
  "paths": {
    "@/*": ["./"],
    "@/core/*": ["./core/*"],
    "@/modules/*": ["./modules/*"],
    "@/server/*": ["./server/*"],
    "@/shared/*": ["./shared/*"],
    "@/config/*": ["./config/*"],
    "@/types/*": ["./types/*"],
    "@/utils/*": ["./utils/*"],
    "@/client/*": ["./client/*"],
    "@/services/*": ["./client/src/services/*"]
  }
}
```

### Vite алиасы для клиента:

```typescript
// vite.config.ts resolve.alias
{
  '@': path.resolve(__dirname, './'),
  '@/core': path.resolve(__dirname, './core'),
  '@/shared': path.resolve(__dirname, './shared'),
  '@/types': path.resolve(__dirname, './types'),
  '@/services': path.resolve(__dirname, './client/src/services')
}
```

## 📋 План рефакторинга по приоритетам

### Приоритет 1 (Критический) - Трехуровневые импорты:
1. `modules/referral/logic/*` - заменить на алиасы
2. `client/src/contexts/NotificationContext.tsx` - исправить путь

### Приоритет 2 (Высокий) - Modules/Core зависимости:
1. Все контроллеры модулей → `@/core/BaseController`
2. Все сервисы модулей → `@/server/db` и `@/shared/schema`

### Приоритет 3 (Средний) - Остальные двухуровневые:
1. Core config импорты → `@/config/*`
2. Client service импорты → `@/services/*`

## ⚠️ Потенциальные проблемы

### 1. Архитектурные антипаттерны:
- Modules напрямую импортируют server/db
- Отсутствие слоя абстракции
- Прямые зависимости между уровнями

### 2. Проблемы сборки:
- Глубокие пути усложняют refactoring
- Высокий риск циклических зависимостей
- Проблемы с tree-shaking

### 3. Maintenance проблемы:
- Сложность отслеживания зависимостей
- Затруднено тестирование изолированных модулей
- Связанность компонентов

## 📊 Статистика по типам импортов

| Тип импорта | Количество | Процент |
|-------------|------------|---------|
| `../../core/BaseController` | 10 | 16.4% |
| `../../server/db` | 8 | 13.1% |
| `../../shared/schema` | 12 | 19.7% |
| `../../config/*` | 4 | 6.6% |
| `../../services/*` | 4 | 6.6% |
| Другие | 23 | 37.6% |

## 🎯 Итоговые рекомендации

1. **Немедленно:** Устранить трехуровневые импорты через алиасы
2. **Краткосрочно:** Внедрить систему алиасов для modules/core
3. **Среднесрочно:** Рефакторинг архитектуры для устранения циклических зависимостей
4. **Долгосрочно:** Внедрение dependency injection для устранения прямых импортов