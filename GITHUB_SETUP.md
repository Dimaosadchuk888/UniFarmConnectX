# Подключение GitHub к проекту UniFarm

## Способ 1: Через интерфейс Replit (Рекомендуемый)

### Шаг 1: Подключение GitHub в Replit
1. Откройте боковую панель Replit (иконка папки слева)
2. Найдите раздел "Version control" или иконку Git
3. Нажмите "Connect to GitHub"
4. Авторизуйтесь через GitHub OAuth
5. Выберите организацию и создайте новый репозиторий

### Шаг 2: Настройка репозитория
- Название: `unifarm-telegram-miniapp`
- Описание: `Modern Telegram Mini App for crypto farming with TON integration`
- Visibility: Public или Private (на ваш выбор)

### Шаг 3: Первый коммит
После подключения Replit автоматически создаст первый коммит с вашим кодом.

## Способ 2: Создание нового Repl из GitHub

### Если хотите создать новый проект:
1. Перейдите на replit.com
2. Нажмите "Create Repl"
3. Выберите "Import from GitHub"
4. Вставьте URL репозитория
5. Replit склонирует проект

## Способ 3: Ручное подключение

### Если у вас уже есть GitHub репозиторий:
```bash
# Добавить remote origin
git remote add origin https://github.com/username/unifarm-telegram-miniapp.git

# Сделать первый push
git add .
git commit -m "Initial commit: UniFarm Telegram Mini App"
git push -u origin main
```

## Структура проекта для GitHub

```
unifarm-telegram-miniapp/
├── client/                 # React frontend
├── server/                 # Express.js backend
├── shared/                 # Общие типы и схемы
├── modules/                # Функциональные модули
├── config/                 # Конфигурации
├── README.md              # Документация
├── package.json           # Зависимости
├── .gitignore            # Игнорируемые файлы
└── .env.example          # Пример переменных окружения
```

## Рекомендации

1. **Используйте интерфейс Replit** - самый простой способ
2. **Создайте .env.example** - для примера конфигурации
3. **Обновите README.md** - добавьте описание и инструкции
4. **Настройте GitHub Actions** - для автоматического деплоя (опционально)

## Синхронизация изменений

После подключения GitHub:
- Изменения в Replit автоматически синхронизируются
- Можете работать как в Replit, так и локально
- Все коммиты сохраняются в GitHub

## Следующие шаги

1. Подключите GitHub через интерфейс Replit
2. Создайте первый release вашего приложения
3. Настройте GitHub Pages для документации (опционально)
4. Добавьте collaborators для командной работы