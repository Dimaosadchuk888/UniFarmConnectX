-- ИСПРАВЛЕНИЕ ТАБЛИЦЫ MISSIONS

-- 1. Сначала добавим недостающие колонки в таблицу missions
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS reward_uni DECIMAL(20,6) DEFAULT 0;

ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS reward_ton DECIMAL(20,9) DEFAULT 0;

ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS type VARCHAR(50);

ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- 2. Теперь можно вставить данные
INSERT INTO missions (id, title, description, reward_uni, reward_ton, type, status) VALUES
(1, 'Подписаться на Telegram канал', 'Подпишись на Telegram-канал Universe Games https://t.me/UniverseGamesChannel', 500, 0, 'social', 'active'),
(2, 'Вступить в Telegram чат', 'Вступи в Telegram-чат Universe Games https://t.me/UniverseGamesChat', 500, 0, 'social', 'active'),
(3, 'Подписка на YouTube', 'Подпишись на YouTube-канал https://youtube.com/@universegamesyoutube?si=XHebHkmEcGpADUAE', 500, 0, 'social', 'active'),
(4, 'Check-in дня', 'Ежедневное посещение приложения', 200, 0, 'daily', 'active'),
(5, 'Подписаться на TikTok', 'Подпишись на TikTok Universe Games https://www.tiktok.com/@universegames.io', 500, 0, 'social', 'active')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reward_uni = EXCLUDED.reward_uni,
  reward_ton = EXCLUDED.reward_ton,
  type = EXCLUDED.type,
  status = EXCLUDED.status;