import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startBackgroundTasks } from "./background-tasks";
import { migrateRefCodes } from "./migrations/refCodeMigration";
// Импортируем наш новый модуль для обслуживания статических файлов в production
import { setupProductionStatic } from "./productionStatic";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error('[SERVER] Неперехваченная ошибка:', {
      status,
      message,
      stack: err.stack
    });

    // Отправляем JSON-ответ с ошибкой, но НЕ выбрасываем исключение после
    res.status(status).json({ 
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    // Удален оператор "throw err;" - это критическая ошибка, которая вызывала нестабильность
  });

  // Добавление обработчика для Telegram WebApp параметров
  app.use((req, res, next) => {
    // Добавляем специальные заголовки для корректной работы в Telegram Mini App
    res.header("Access-Control-Allow-Origin", "*");
    // Модифицированная политика безопасности для Telegram
    res.header("Content-Security-Policy", "default-src * 'self' data: blob: 'unsafe-inline' 'unsafe-eval'");
    
    // Логирование параметров Telegram
    const telegramParams = ['tgWebAppData', 'tgWebAppVersion', 'tgWebAppPlatform', 'tgWebAppStartParam']
      .filter(param => req.query[param])
      .reduce((acc, param) => {
        acc[param] = req.query[param];
        return acc;
      }, {} as Record<string, any>);
      
    if (Object.keys(telegramParams).length > 0) {
      console.log('[TelegramWebApp] Параметры в URL:', telegramParams);
    }
    
    next();
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    console.log('[Server] Запуск в режиме разработки (development), используем Vite middleware');
    await setupVite(app, server);
  } else {
    console.log('[Server] Запуск в production режиме, используем оптимизированную обработку статических файлов');
    // Используем улучшенную версию обработки статических файлов для production
    setupProductionStatic(app);
    
    // Оригинальный метод остается закомментированным на случай проблем
    // serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    
    // Запуск фоновых задач
    startBackgroundTasks();
    
    // Обновление реферальных кодов
    try {
      migrateRefCodes()
        .then((result) => {
          console.log(`[Server] Миграция реферальных кодов успешно выполнена. Обновлено ${result.updated} из ${result.total} пользователей`);
        })
        .catch((error: Error) => {
          console.error('[Server] Ошибка при выполнении миграции реферальных кодов:', error);
        });
    } catch (error) {
      console.error('[Server] Ошибка при запуске миграции реферальных кодов:', error);
    }
  });
})();
