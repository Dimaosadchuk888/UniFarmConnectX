/**
 * Специальный модуль для обслуживания статических файлов в production режиме
 * Правильно обрабатывает запросы к /UniFarm и другим специальным путям
 * Оптимизирован для быстрого запуска сервера на Replit
 */
import express, { type Express, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";

// Переменная для хранения path к index.html и директории статических файлов
let indexHtmlPathCache: string | null = null;
let staticDirCache: string | null = null;

/**
 * Настраивает обслуживание статических файлов для production режиме
 * Оптимизирован для быстрого запуска сервера
 */
export function setupProductionStatic(app: Express): void {
  // Получаем корневую директорию проекта
  const projectRoot = process.cwd();
  
  // Определяем возможные пути к собранным статическим файлам
  const possiblePaths = [
    path.resolve(projectRoot, "dist", "public"), // Основной путь после сборки Vite
    path.resolve(projectRoot, "dist"), // Альтернативный путь для обычной сборки
    path.resolve(projectRoot, "client", "dist"), // Путь для режима разработки
    path.resolve(projectRoot, "server", "public") // Резервный путь для статических ресурсов сервера
  ];
  
  // Функция для обработки запросов index.html
  const handleIndexHtmlRequest = (req: Request, res: Response): void => {
    // Проверяем, есть ли кэшированный путь к index.html
    if (indexHtmlPathCache) {
      res.sendFile(indexHtmlPathCache);
      return;
    }
    
    // Функция для поиска и установки index.html
    const findIndexHtml = (): void => {
      // Проверяем все возможные директории
      for (const dir of possiblePaths) {
        try {
          if (fs.existsSync(dir)) {
            staticDirCache = dir;
            const indexPath = path.resolve(dir, "index.html");
            if (fs.existsSync(indexPath)) {
              indexHtmlPathCache = indexPath;
              
              // ОПТИМИЗАЦИЯ: Отключаем кэширование для мгновенных обновлений
              app.use(express.static(dir, {
                etag: false, 
                lastModified: false,
                maxAge: 0,
                setHeaders: (res, path, stat) => {
                  // Принудительно отключаем все виды кэширования
                  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                  res.setHeader('Pragma', 'no-cache');
                  res.setHeader('Expires', '0');
                  res.setHeader('Surrogate-Control', 'no-store');
                  console.log(`[NO-CACHE] Статический файл: ${path}`);
                }
              }));
              
              console.log(`[ProductionStatic] Настроено обслуживание статических файлов из ${dir}`);
              // Отправляем найденный index.html
              res.sendFile(indexHtmlPathCache);
              return;
            }
          }
        } catch (err) {
          console.error(`[ProductionStatic] Ошибка при проверке директории ${dir}:`, err);
        }
      }
      
      // Если не удалось найти index.html
      console.error('[ProductionStatic] Не удалось найти index.html. Возвращаем 500 ошибку.');
      res.status(500).send('Server error: index.html not found.');
    };
    
    // Запускаем поиск index.html
    findIndexHtml();
  };
  
  // Быстрый запуск приложения - асинхронная инициализация статических файлов
  // Это позволяет серверу начать принимать запросы немедленно
  setTimeout(() => {
    for (const dir of possiblePaths) {
      try {
        if (fs.existsSync(dir)) {
          staticDirCache = dir;
          const indexPath = path.resolve(dir, "index.html");
          if (fs.existsSync(indexPath)) {
            indexHtmlPathCache = indexPath;
            
            // Настраиваем обслуживание статических файлов
            app.use(express.static(dir, {
              etag: true, 
              lastModified: true,
              maxAge: 86400000
            }));
            
            console.log(`[ProductionStatic] Автоматически настроено обслуживание статических файлов из ${dir}`);
            break;
          }
        }
      } catch (err) {
        console.error(`[ProductionStatic] Ошибка при проверке директории ${dir}:`, err);
      }
    }
  }, 0);

  // Специальные маршруты для Telegram Mini App
  app.get([
    "/UniFarm", "/UniFarm/", "/unifarm", "/unifarm/", 
    "/app", "/app/", 
    "/telegram", "/telegram/",
    "/telegram-app", "/telegram-app/"
  ], (req: Request, res: Response) => {
    handleIndexHtmlRequest(req, res);
  });

  // Fallback для рендеринга клиентской части ТОЛЬКО для страниц приложения
  // НЕ перехватываем статические ресурсы (JS, CSS, изображения)
  app.get(/^(?!\/api\/|\/assets\/|.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)).*$/, (req: Request, res: Response) => {
    handleIndexHtmlRequest(req, res);
  });

  console.log('[ProductionStatic] Маршруты для статических файлов настроены');
}

/**
 * Эта версия обеспечивает корректную обработку маршрутов в production
 * и решает проблему с 500 ошибками при запросах к /UniFarm и другим специальным путям
 */