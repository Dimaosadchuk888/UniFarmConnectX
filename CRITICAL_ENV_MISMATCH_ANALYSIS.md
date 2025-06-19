# 🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА НАЙДЕНА

## Конфликт переменных окружения SUPABASE_KEY:

### В .env файле:
```
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MDMwNzcsImV4cCI6MjA2NTQ3OTA3N30.4ShnO3KXxi66rEMPkmAafAfN-IFImDd1YwMnrRDPD1c
```
**Роль:** anon (публичный ключ)

### В environment variables:
```
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkwMzA3NywiZXhwIjoyMDY1NDc5MDc3fQ.pjlz8qlmQLUa9BZb12pt9QZU5Fk9YvqxpSZGA84oqog
```
**Роль:** service_role (серверный ключ)

## Проблема с TON Connect манифестом:

### В tonconnect-manifest.json:
```
"url": "https://uni-farm-connect-xo-osadchukdmitro2.replit.app"
"iconUrl": "https://uni-farm-connect-xo-osadchukdmitro2.replit.app/assets/favicon.ico"
```

### Текущий deployment URL:
```
https://uni-farm-connect-x-alinabndrnk99.replit.app
```

**КОНФЛИКТ ДОМЕНОВ!**

## Проблема с Supabase подключением:

Тест: `curl https://wunnsvicbebssrjqedor.supabase.co/rest/v1/` = **401 Unauthorized**

## КОРНЕВЫЕ ПРИЧИНЫ:

1. **Приложение использует anon ключ вместо service_role**
2. **TON Connect манифест указывает на старый домен**  
3. **Supabase API блокирует запросы**
4. **Конфликт между .env и .replit переменными**

## ТЕХНИЧЕСКОЕ ОБЪЯСНЕНИЕ:

- Сервер загружает переменные из .env (anon key)
- Deployment использует .replit переменные (service_role key)
- Frontend получает разные ключи в зависимости от окружения
- TON Connect манифест указывает на несуществующий домен
- Supabase API отвергает запросы из-за неправильной аутентификации

## РЕШЕНИЕ:

1. Синхронизировать SUPABASE_KEY в .env и .replit
2. Обновить TON Connect манифест с правильным доменом
3. Проверить RLS политики в Supabase
4. Протестировать подключение к Supabase API

Вот где кроется настоящая проблема!