import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;

// Только статические файлы для тестирования
app.use(express.static(path.join(__dirname)));

// Главная страница - тестовая
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-page.html'));
});

// Базовая проверка API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🧪 Test server running on port', PORT);
});

// Корректное завершение
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping test server...');
  server.close(() => {
    process.exit(0);
  });
});