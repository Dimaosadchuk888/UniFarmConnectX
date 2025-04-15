import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Импортируем модели и зависимости
import { missions, userMissions, users } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { db } from "./db";
import { z } from "zod";

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
  // Схема валидации для завершения миссии
  const completeMissionSchema = z.object({
    user_id: z.number().int().positive(),
    mission_id: z.number().int().positive()
  });

  // Маршрут для завершения миссии
  app.post("/api/missions/complete", async (req: Request, res: Response) => {
    try {
      // Валидация входящих данных
      const validationResult = completeMissionSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid request data", 
          errors: validationResult.error.format() 
        });
      }
      
      const { user_id, mission_id } = validationResult.data;
      
      // Проверяем, что миссия существует и активна
      const [mission] = await db
        .select()
        .from(missions)
        .where(and(
          eq(missions.id, mission_id),
          eq(missions.is_active, true)
        ));
      
      if (!mission) {
        return res.status(404).json({ 
          success: false, 
          message: "Mission not found or inactive" 
        });
      }
      
      // Проверяем, что пользователь существует
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, user_id));
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }
      
      // Проверяем, что пользователь еще не выполнял эту миссию
      const [existingMission] = await db
        .select()
        .from(userMissions)
        .where(and(
          eq(userMissions.user_id, user_id),
          eq(userMissions.mission_id, mission_id)
        ));
      
      if (existingMission) {
        return res.status(409).json({ 
          success: false, 
          message: "Mission already completed by this user" 
        });
      }
      
      // Создаем запись о выполнении миссии
      await db.insert(userMissions).values({
        user_id,
        mission_id,
        completed_at: new Date()
      });
      
      // Получаем награду за миссию
      const reward = parseFloat(mission.reward_uni);
      
      // Обновляем баланс пользователя
      await db
        .update(users)
        .set({ 
          balance_uni: sql`${users.balance_uni} + ${reward.toString()}`
        })
        .where(eq(users.id, user_id));
      
      return res.status(200).json({
        success: true,
        message: `Mission completed. ${reward} UNI added to balance.`,
        reward: reward
      });
      
    } catch (error) {
      console.error("Error completing mission:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to complete mission" 
      });
    }
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
