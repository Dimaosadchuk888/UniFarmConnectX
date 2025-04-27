/**
 * Специальный модуль для обслуживания статических файлов в production режиме
 * Правильно обрабатывает запросы к /UniFarm и другим специальным путям
 */
import express, { type Express, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";

/**
 * Настраивает обслуживание статических файлов для production режима
 */
export function setupProductionStatic(app: Express) {
  // Получаем корневую директорию проекта
  const projectRoot = process.cwd();
  
  // Определяем возможные пути к собранным статическим файлам
  const possiblePaths = [
    path.resolve(projectRoot, "dist", "public"), // Основной путь после сборки
    path.resolve(projectRoot, "server", "public"), // Резервный путь для статических ресурсов сервера
    path.resolve(projectRoot, "client", "dist")  // Альтернативный путь для режима разработки
  ];
  
  let foundDistPath = null;
  
  // Ищем первый существующий путь
  for (const potentialPath of possiblePaths) {
    if (fs.existsSync(potentialPath)) {
      foundDistPath = potentialPath;
      console.log(`[ProductionStatic] Найдена директория со статическими файлами: ${foundDistPath}`);
      break;
    }
  }
  
  if (!foundDistPath) {
    console.error('[ProductionStatic] ОШИБКА: Не найдена директория с собранными файлами. Проверенные пути:', possiblePaths);
    throw new Error(
      `Could not find any build directory. Please make sure to build the client first. Checked paths: ${possiblePaths.join(', ')}`
    );
  }

  // Проверяем, существует ли index.html в найденной директории
  const indexHtmlPath = path.resolve(foundDistPath, "index.html");
  if (!fs.existsSync(indexHtmlPath)) {
    console.error(`[ProductionStatic] ОШИБКА: index.html не найден по пути ${indexHtmlPath}`);
    throw new Error(`index.html not found in ${foundDistPath}`);
  } else {
    console.log(`[ProductionStatic] index.html найден: ${indexHtmlPath}`);
  }

  // Настраиваем обслуживание статических файлов
  app.use(express.static(foundDistPath, {
    // Устанавливаем кэширование для статических файлов в production
    etag: true,
    lastModified: true,
    maxAge: 86400000, // 1 день в миллисекундах = 24 * 60 * 60 * 1000
    immutable: true // Для файлов с хешем в имени
  }));

  // Специальные маршруты для Telegram Mini App
  // Важно: определяем их до fallback маршрута
  app.get([
    "/UniFarm", "/UniFarm/", "/unifarm", "/unifarm/", 
    "/app", "/app/", 
    "/telegram", "/telegram/",
    "/telegram-app", "/telegram-app/"
  ], (req: Request, res: Response) => {
    console.log(`[ProductionStatic] Обработка специального маршрута: ${req.path}`);
    
    // Отправляем index.html для всех специальных маршрутов
    res.sendFile(indexHtmlPath);
  });

  // Fallback для рендеринга клиентской части на все остальные запросы, не начинающиеся с /api
  app.get(/^(?!\/api\/).*$/, (req: Request, res: Response) => {
    // Логируем только запросы, которые не к статическим ресурсам (css, js, images и т.д.)
    if (!/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)(\?.*)?$/.test(req.path)) {
      console.log(`[ProductionStatic] Fallback для URL: ${req.originalUrl}`);
    }
    
    res.sendFile(indexHtmlPath);
  });

  console.log('[ProductionStatic] Настройка обслуживания статических файлов завершена');
}

/**
 * Эта версия обеспечивает корректную обработку маршрутов в production
 * и решает проблему с 500 ошибками при запросах к /UniFarm и другим специальным путям
 */