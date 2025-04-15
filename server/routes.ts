import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Добавляем импорт модели missions
import { missions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Новый API маршрут для получения активных миссий
  app.get("/api/missions/active", async (req, res) => {
    try {
      // Получаем все активные миссии
      const activeMissions = await db
        .select()
        .from(missions)
        .where(eq(missions.is_active, true));
      
      res.json(activeMissions);
    } catch (error) {
      console.error("Error fetching active missions:", error);
      res.status(500).json({ error: "Failed to fetch active missions" });
    }
  });
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
