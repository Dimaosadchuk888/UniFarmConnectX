import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Импортируем модели и зависимости
import { missions, userMissions, users, transactions } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { db } from "./db";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Простой маршрут для проверки API (для отладки)
  app.get("/api/test-json", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify({ status: "ok", message: "API работает" }));
  });

  // API маршрут для получения транзакций пользователя
  app.get("/api/transactions", async (req, res) => {
    try {
      const userIdParam = req.query.user_id;
      
      // Отладка: логируем запрос
      console.log("[DEBUG] /api/transactions - Request query:", req.query);
      
      // Явно устанавливаем правильный заголовок Content-Type
      res.setHeader('Content-Type', 'application/json');
      
      if (!userIdParam || typeof userIdParam !== 'string') {
        console.log("[DEBUG] /api/transactions - Missing or invalid user_id:", userIdParam);
        return res.status(400).json({ error: "Missing or invalid user_id parameter" });
      }
      
      const userId = parseInt(userIdParam);
      
      if (isNaN(userId)) {
        console.log("[DEBUG] /api/transactions - Invalid user_id (NaN):", userIdParam);
        return res.status(400).json({ error: "Invalid user_id parameter" });
      }
      
      console.log("[DEBUG] /api/transactions - Fetching for user_id:", userId);
      
      // Получаем все транзакции пользователя, сортированные по дате создания (новые сначала)
      const userTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.user_id, userId))
        .orderBy(sql`${transactions.created_at} DESC`);
      
      console.log("[DEBUG] /api/transactions - Found transactions:", userTransactions.length);
      
      // Проверяем, что ответ не пустой
      if (!userTransactions || userTransactions.length === 0) {
        console.log("[DEBUG] /api/transactions - No transactions found for user:", userId);
        // Возвращаем пустой массив с кодом 200, а не ошибку
        return res.status(200).send("[]");
      }
      
      // Для отладки добавляем фейковую транзакцию для проверки
      if (userId === 1 && userTransactions.length > 0) {
        // Клонируем первую транзакцию для создания тестовой записи (только если уже есть транзакции)
        // Это поможет проверить, что данные точно доходят до клиента
        const testTransaction = {
          ...userTransactions[0],
          id: 999999,
          type: "debug",
          amount: "1.00000000",
          currency: "UNI",
          status: "confirmed"
        };
        // Добавляем в начало массива для быстрой визуальной проверки
        userTransactions.unshift(testTransaction);
      }
      
      // Используем явный JSON.stringify для обеспечения правильного формата ответа
      const jsonResponse = JSON.stringify(userTransactions);
      console.log("[DEBUG] /api/transactions - Response first 100 chars:", jsonResponse.substring(0, 100));
      
      return res.status(200).send(jsonResponse);
    } catch (error) {
      console.error("[DEBUG] Error fetching user transactions:", error);
      return res.status(500).json({ error: "Failed to fetch user transactions" });
    }
  });
  
  // API маршрут для получения активных миссий
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
  
  // API маршрут для получения выполненных миссий конкретного пользователя
  app.get("/api/user_missions", async (req, res) => {
    try {
      const userIdParam = req.query.user_id;
      
      if (!userIdParam || typeof userIdParam !== 'string') {
        return res.status(400).json({ error: "Missing or invalid user_id parameter" });
      }
      
      const userId = parseInt(userIdParam);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user_id parameter" });
      }
      
      // Получаем все выполненные миссии пользователя
      const completedMissions = await db
        .select()
        .from(userMissions)
        .where(eq(userMissions.user_id, userId));
      
      res.json(completedMissions);
    } catch (error) {
      console.error("Error fetching user completed missions:", error);
      res.status(500).json({ error: "Failed to fetch user completed missions" });
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
      const rewardUni = mission.reward_uni;
      const reward = rewardUni ? parseFloat(rewardUni) : 0;
      
      // Обновляем баланс пользователя
      await db
        .update(users)
        .set({ 
          balance_uni: sql`${users.balance_uni} + ${reward.toString()}`
        })
        .where(eq(users.id, user_id));
      
      // Создаем запись о транзакции награды
      await db.insert(transactions).values({
        user_id,
        type: "reward",
        currency: "UNI",
        amount: reward.toString(),
        status: "confirmed"
      });
      
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
