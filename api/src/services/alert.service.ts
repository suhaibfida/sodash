// =============================================
// Alert Service
// Drop detection with dedup / cooldown guard.
// =============================================

import prisma from "../db/client";
import { env } from "../utils/env";
import { sendDropAlert } from "./telegram.service";
import { generateDropAlertExplanation } from "./ai-summary.service";
import type { TokenPnL } from "./ai-summary.service";

const COOLDOWN_MS = env.ALERT_COOLDOWN_MINUTES * 60 * 1000;

export interface AlertCheck {
  walletAddress: string;
  chatId: string;
  threshold: number;
}

/**
 * Compare latest snapshot vs snapshot from ~1 hour ago.
 * Returns drop percent or null if no drop.
 */
async function computeDrop(walletAddress: string): Promise<{
  dropPercent: number;
  currentValue: number;
  changeUsd: number;
} | null> {
  // Get the two most recent snapshots — latest and one from ≥ 55 minutes ago
  const [latest] = await prisma.walletSnapshot.findMany({
    where: { walletAddress },
    orderBy: { snapshotAt: "desc" },
    take: 1,
  });

  if (!latest) return null;

  const hourAgo = new Date(Date.now() - 55 * 60 * 1000);
  const [baseline] = await prisma.walletSnapshot.findMany({
    where: {
      walletAddress,
      snapshotAt: { lte: hourAgo },
    },
    orderBy: { snapshotAt: "desc" },
    take: 1,
  });

  if (!baseline) return null;
  if (baseline.portfolioValue === 0) return null;

  const dropPercent =
    ((baseline.portfolioValue - latest.portfolioValue) / baseline.portfolioValue) * 100;

  if (dropPercent <= 0) return null; // Not a drop

  return {
    dropPercent,
    currentValue: latest.portfolioValue,
    changeUsd: latest.portfolioValue - baseline.portfolioValue,
  };
}

/**
 * Check if an alert was already sent within the cooldown period.
 */
async function isInCooldown(walletAddress: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - COOLDOWN_MS);
  const recent = await prisma.alertHistory.findFirst({
    where: {
      walletAddress,
      sentAt: { gte: cutoff },
    },
  });
  return !!recent;
}

/**
 * Run drop alert check for a single wallet.
 * Handles dedup, cooldown, AI explanation, and Telegram send.
 */
export async function runAlertCheck(check: AlertCheck): Promise<void> {
  const { walletAddress, chatId, threshold } = check;

  try {
    const drop = await computeDrop(walletAddress);
    if (!drop) return;
    if (drop.dropPercent < threshold) return;

    // Cooldown guard — prevent spam
    if (await isInCooldown(walletAddress)) {
      return;
    }

    // Parse top losers from latest snapshot JSON
    const [latest] = await prisma.walletSnapshot.findMany({
      where: { walletAddress },
      orderBy: { snapshotAt: "desc" },
      take: 1,
    });

    let topLosers: TokenPnL[] = [];
    try {
      const parsed = JSON.parse(latest?.topTokensJson ?? "[]");
      topLosers = Array.isArray(parsed) ? parsed : [];
    } catch {}

    // Generate AI explanation
    let aiExplanation = "Portfolio experienced a significant decline.";
    try {
      aiExplanation = await generateDropAlertExplanation({
        dropPercent: drop.dropPercent,
        portfolioValue: drop.currentValue,
        topLosers,
      });
    } catch (err) {
      console.error("[alert] AI explanation failed:", err);
    }

    // Determine alert type
    const alertType =
      drop.dropPercent >= 20
        ? ("DROP_20" as const)
        : drop.dropPercent >= 15
        ? ("DROP_15" as const)
        : ("DROP_10" as const);

    const messageText =
      `Portfolio dropped ${drop.dropPercent.toFixed(2)}% to $${drop.currentValue.toFixed(2)}`;

    // Send Telegram alert
    await sendDropAlert(chatId, {
      portfolioValue: drop.currentValue,
      dropPercent: drop.dropPercent,
      portfolioChangeUsd: drop.changeUsd,
      topLosers,
      aiExplanation,
      timestamp: new Date(),
    });

    // Record in alert history (dedup guard for next check)
    await prisma.alertHistory.create({
      data: {
        walletAddress,
        alertType,
        portfolioValue: drop.currentValue,
        dropPercent: drop.dropPercent,
        messageText,
      },
    });

    console.log(
      `[alert] Sent drop alert to ${walletAddress}: ${drop.dropPercent.toFixed(2)}% drop`
    );
  } catch (err) {
    console.error(`[alert] Error checking wallet ${walletAddress}:`, err);
  }
}
