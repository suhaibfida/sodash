// =============================================
// Cleanup Worker
// Removes expired OTP sessions and old data.
// =============================================

import { cleanupExpiredSessions } from "../services/telegram-auth.service";
import { env } from "../utils/env";

const CLEANUP_INTERVAL_MS = env.CLEANUP_WORKER_INTERVAL * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

async function runCleanupCycle(): Promise<void> {
  try {
    const deleted = await cleanupExpiredSessions();
    if (deleted > 0) {
      console.log(`[cleanup] Removed ${deleted} expired sessions`);
    }
  } catch (err) {
    console.error("[cleanup] Cycle error:", err);
  }
}

export function startCleanupWorker(): void {
  console.log(`[cleanup] Worker started (interval: ${env.CLEANUP_WORKER_INTERVAL} min)`);
  runCleanupCycle();
  cleanupTimer = setInterval(runCleanupCycle, CLEANUP_INTERVAL_MS);
}

export function stopCleanupWorker(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.log("[cleanup] Worker stopped.");
  }
}
