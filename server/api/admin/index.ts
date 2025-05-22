/**
 * Адміністративні API-ендпоінти
 */

import { Router } from "express";
import { getDbStatus, resetDbConnection, testCreateTable } from "./db-status";

const router = Router();

// Ендпоінти для перевірки стану бази даних
router.get("/db-status", getDbStatus);
router.post("/db-reset", resetDbConnection);
router.post("/db-test", testCreateTable);

export default router;