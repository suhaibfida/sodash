// =============================================
// Scheduler Service
// Sends morning and evening AI summaries at
// each user's configured local time.
//
// Architecture: polls every minute, converts
// user's configured time from their IANA 
// timezone to UTC for comparison.
// No external cron libs needed.
// =============================================

import prisma from "../db/client";
import { fetchPortfolioSnapshot } from "../services/portfolio.service";
import { generatePortfolioSummary } from "../services/ai-summary.service";
import { sendPortfolioSummary } from "../services/telegram.service";
import { env } from "../utils/env";

const SCHEDULER_INTERVAL_MS = env.SUMMARY_WORKER_INTERVAL * 60 * 1000;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;

// =============================================
// TIMEZONE HELPER
// =============================================

/**
 * Get the current HH:MM time string in a given IANA timezone.
 * Uses built-in Intl — no external libs needed.
 */
function getCurrentTimeInZone(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    // Returns "HH:MM" in the target timezone
    const parts = formatter.formatToParts(new Date());
    const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${hour}:${minute}`;
  } catch {
    // Invalid timezone — fall back to UTC
    return new Date().toISOString().slice(11, 16);
  }
}

/**
 * Check if today a summary was already sent (prevent double-send).
 */
function isSameDay(date: Date | null | undefined, timezone: string): boolean {
  if (!date) return false;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayStr = formatter.format(new Date());
  const sentStr = formatter.format(date);
  return todayStr === sentStr;
}

// =============================================
// SUMMARY DISPATCH
// =============================================

async function dispatchSummary(
  walletAddress: string,
  chatId: string,
  summaryType: "MORNING" | "NIGHT",
  timezone: string
): Promise<void> {
  try {
    const snapshot = await fetchPortfolioSnapshot(walletAddress);

    // Get previous snapshot for change calculation
    const [prev] = await prisma.walletSnapshot.findMany({
      where: { walletAddress },
      orderBy: { snapshotAt: "desc" },
      take: 1,
    });

    const prevValue = prev?.portfolioValue ?? snapshot.portfolioValueUsd;
    const portfolioChangeUsd = snapshot.portfolioValueUsd - prevValue;
    const portfolioChange =
      prevValue > 0 ? (portfolioChangeUsd / prevValue) * 100 : 0;

    const aiSummary = await generatePortfolioSummary({
      portfolioValue: snapshot.portfolioValueUsd,
      portfolioChange,
      portfolioChangeUsd,
      topGainers: snapshot.topGainers,
      topLosers: snapshot.topLosers,
      topHoldings: snapshot.topHoldings,
      concentrationRisk: snapshot.concentrationRisk,
      reclaimableSol: snapshot.reclaimableSol,
      summaryType,
      timezone,
    });

    await sendPortfolioSummary(chatId, {
      summaryType,
      portfolioValue: snapshot.portfolioValueUsd,
      portfolioChange,
      portfolioChangeUsd,
      topGainers: snapshot.topGainers,
      topLosers: snapshot.topLosers,
      topHoldings: snapshot.topHoldings,
      reclaimableSol: snapshot.reclaimableSol,
      aiSummary,
    });

    // Update last sent timestamp
    const field =
      summaryType === "MORNING"
        ? { lastMorningSentAt: new Date() }
        : { lastNightSentAt: new Date() };

    await prisma.notificationSettings.update({
      where: { walletAddress },
      data: field,
    });

    console.log(`[scheduler] ${summaryType} summary sent to ${walletAddress}`);
  } catch (err) {
    console.error(`[scheduler] Failed to dispatch ${summaryType} for ${walletAddress}:`, err);
  }
}

// =============================================
// SCHEDULER TICK
// =============================================

async function schedulerTick(): Promise<void> {
  try {
    // Fetch all users with notification settings + verified telegram
    const users = await prisma.notificationSettings.findMany({
      include: {
        user: {
          include: {
            telegramConnection: true,
          },
        },
      },
    });

    for (const settings of users) {
      const conn = settings.user.telegramConnection;
      if (!conn || !conn.verified || !conn.notificationsEnabled) continue;

      const { walletAddress, timezone } = settings;
      const currentTime = getCurrentTimeInZone(timezone);

      // Check morning summary
      if (
        settings.morningSummaryEnabled &&
        currentTime === settings.morningSummaryTime &&
        !isSameDay(settings.lastMorningSentAt, timezone)
      ) {
        await dispatchSummary(walletAddress, conn.telegramChatId, "MORNING", timezone);
      }

      // Check night summary
      if (
        settings.nightSummaryEnabled &&
        currentTime === settings.nightSummaryTime &&
        !isSameDay(settings.lastNightSentAt, timezone)
      ) {
        await dispatchSummary(walletAddress, conn.telegramChatId, "NIGHT", timezone);
      }
    }
  } catch (err) {
    console.error("[scheduler] Tick error:", err);
  }
}

export function startScheduler(): void {
  console.log(`[scheduler] Started (tick: ${env.SUMMARY_WORKER_INTERVAL} min)`);
  schedulerTimer = setInterval(schedulerTick, SCHEDULER_INTERVAL_MS);
}

export function stopScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log("[scheduler] Stopped.");
  }
}
