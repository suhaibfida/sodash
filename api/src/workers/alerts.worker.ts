// =============================================
// Alerts Worker
// Runs every 5 minutes.
// Checks for portfolio drops and sends alerts.
// =============================================

import prisma from "../db/client";
import { runAlertCheck } from "../services/alert.service";
import { env } from "../utils/env";

const ALERTS_INTERVAL_MS = env.SNAPSHOT_INTERVAL_MINUTES * 60 * 1000;
let alertsTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

/**
 * Run drop detection for all eligible wallets.
 */
async function runAlertsCycle(): Promise<void> {
  if (isRunning) {
    console.warn("[alerts] Previous cycle still running — skipping.");
    return;
  }

  isRunning = true;

  try {
    // Find all users with verified Telegram + notifications enabled
    const users = await prisma.telegramConnection.findMany({
      where: {
        verified: true,
        notificationsEnabled: true,
      },
      include: {
        user: {
          include: {
            notificationSettings: true,
          },
        },
      },
    });

    if (users.length === 0) return;

    console.log(`[alerts] Checking ${users.length} wallets for drops...`);

    await Promise.allSettled(
      users.map(async (conn) => {
        const threshold =
          conn.user.notificationSettings?.alertThreshold ??
          env.DEFAULT_ALERT_THRESHOLD;

        await runAlertCheck({
          walletAddress: conn.walletAddress,
          chatId: conn.telegramChatId,
          threshold,
        });
      })
    );
  } catch (err) {
    console.error("[alerts] Cycle error:", err);
  } finally {
    isRunning = false;
  }
}

export function startAlertsWorker(): void {
  console.log(`[alerts] Worker started (interval: ${env.SNAPSHOT_INTERVAL_MINUTES} min)`);
  runAlertsCycle();
  alertsTimer = setInterval(runAlertsCycle, ALERTS_INTERVAL_MS);
}

export function stopAlertsWorker(): void {
  if (alertsTimer) {
    clearInterval(alertsTimer);
    alertsTimer = null;
    console.log("[alerts] Worker stopped.");
  }
}
