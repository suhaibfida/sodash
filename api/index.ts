// =============================================
// Sodash API — Entry Point
// Bun runtime + Express
//
// Startup order:
// 1. Validate env vars
// 2. Mount routes
// 3. Launch Telegram bot
// 4. Start background workers
// 5. Start scheduler
// =============================================

// Validate env first — fails fast with clear error
import "dotenv/config";
import cors from "cors";
import express from "express";
import router from "./router/router";
import telegramRoutes from "./src/routes/telegram.routes";
import notificationsRoutes from "./src/routes/notifications.routes";
import aiRoutes from "./src/routes/ai.routes";
import { launchBot } from "./src/telegram/bot";
import { startSnapshotWorker, stopSnapshotWorker } from "./src/workers/snapshot.worker";
import { startAlertsWorker, stopAlertsWorker } from "./src/workers/alerts.worker";
import { startCleanupWorker, stopCleanupWorker } from "./src/workers/cleanup.worker";
import { startScheduler, stopScheduler } from "./src/scheduler/scheduler.service";
import { env } from "./src/utils/env";

const app = express();

// =============================================
// MIDDLEWARE
// =============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for dev — restrict in production
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://sodash.suhaibfida.dev",
      "https://sodash.pages.dev",
    ],
    credentials: true,
  })
);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// =============================================
// ROUTES
// =============================================
app.use("/api/v1", router);
app.use("/api/v1/telegram", telegramRoutes);
app.use("/api/v1/notifications", notificationsRoutes);
app.use("/api/v1/ai", aiRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// =============================================
// START SERVER
// =============================================
const server = app.listen(env.PORT, () => {
  console.log(`\n🚀 Sodash API running on port ${env.PORT}`);
  console.log(`   Health: http://localhost:${env.PORT}/health\n`);
});

// =============================================
// START BACKGROUND SERVICES
// =============================================
let stopBot: (() => void) | null = null;

async function startServices() {
  try {
    // Launch Telegram bot
    stopBot = await launchBot();

    // Start background workers
    startSnapshotWorker();
    startAlertsWorker();
    startCleanupWorker();

    // Start summary scheduler
    startScheduler();
  } catch (err) {
    console.error("[startup] Service initialization error:", err);
  }
}

startServices();

// =============================================
// GRACEFUL SHUTDOWN
// =============================================
function shutdown(signal: string) {
  console.log(`\n[shutdown] Received ${signal}. Shutting down gracefully...`);

  stopSnapshotWorker();
  stopAlertsWorker();
  stopCleanupWorker();
  stopScheduler();
  stopBot?.();

  server.close(() => {
    console.log("[shutdown] HTTP server closed.");
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => process.exit(1), 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));