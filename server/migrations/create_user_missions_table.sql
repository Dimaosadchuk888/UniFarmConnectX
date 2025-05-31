
-- Создание таблицы user_missions для отслеживания выполненных миссий
CREATE TABLE IF NOT EXISTS user_missions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id INTEGER NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Уникальный индекс для предотвращения дублирования
  UNIQUE(user_id, mission_id)
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_mission_id ON user_missions(mission_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_completed ON user_missions(completed);

-- Добавляем триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_user_missions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_missions_updated_at
  BEFORE UPDATE ON user_missions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_missions_updated_at();
