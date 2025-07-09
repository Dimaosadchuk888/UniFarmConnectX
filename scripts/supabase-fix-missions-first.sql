-- ИСПРАВЛЕНИЕ ТАБЛИЦЫ MISSIONS

-- 1. Сначала проверим какие колонки уже есть и добавим недостающие
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS reward_uni DECIMAL(20,6) DEFAULT 0;

ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS reward_ton DECIMAL(20,9) DEFAULT 0;

-- Похоже, что колонка mission_type уже существует, поэтому не добавляем type
-- ALTER TABLE missions ADD COLUMN IF NOT EXISTS type VARCHAR(50);

ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- 2. Теперь можно вставить данные, используя правильное имя колонки mission_type
INSERT INTO missions (id, title, description, mission_type, reward_uni, reward_ton, status) VALUES
(1, 'Подписаться на Telegram канал', 'Подпишись на Telegram-канал Universe Games https://t.me/UniverseGamesChannel', 'one_time', 500, 0, 'active'),
(2, 'Вступить в Telegram чат', 'Вступи в Telegram-чат Universe Games https://t.me/UniverseGamesChat', 'one_time', 500, 0, 'active'),
(3, 'Подписка на YouTube', 'Подпишись на YouTube-канал https://youtube.com/@universegamesyoutube?si=XHebHkmEcGpADUAE', 'one_time', 500, 0, 'active'),
(4, 'Check-in дня', 'Ежедневное посещение приложения', 'daily', 200, 0, 'active'),
(5, 'Подписаться на TikTok', 'Подпишись на TikTok Universe Games https://www.tiktok.com/@universegames.io', 'one_time', 500, 0, 'active')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  mission_type = EXCLUDED.mission_type,
  reward_uni = EXCLUDED.reward_uni,
  reward_ton = EXCLUDED.reward_ton,
  status = EXCLUDED.status;