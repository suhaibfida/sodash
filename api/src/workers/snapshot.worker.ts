// =============================================
// Snapshot Worker
// Runs every 5 minutes.
// Fetches portfolio data for all verified users
// and stores WalletSnapshot records.
// =============================================

import prisma from "../db/client";
import { fetchPortfolioSnapshot } from "../services/portfolio.service";
import { updateWalletProfile } from "../services/wallet-profile.service";
import { env } from "../utils/env";

const SNAPSHOT_INTERVAL_MS = env.SNAPSHOT_INTERVAL_MINUTES * 60 * 1000;
let snapshotTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

/**
 * Take snapshots for all users with verified Telegram connections.
 * Designed to be retry-safe — failures for one wallet don't block others.
 */
async function runSnapshotCycle(): Promise<void> {
  if (isRunning) {
    console.warn("[snapshot] Previous cycle still running — skipping.");
    return;
  }

  isRunning = true;
  const cycleStart = Date.now();

  try {
    // Fetch all verified, notification-enabled users
    const connections = await prisma.telegramConnection.findMany({
      where: {
        verified: true,
        notificationsEnabled: true,
      },
      select: { walletAddress: true },
    });

    if (connections.length === 0) {
      console.log("[snapshot] No active wallets to snapshot.");
      return;
    }

    console.log(`[snapshot] Snapshotting ${connections.length} wallets...`);

    // Process wallets concurrently with a concurrency limit
    const BATCH_SIZE = 5;
    for (let i = 0; i < connections.length; i += BATCH_SIZE) {
      const batch = connections.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async ({ walletAddress }) => {
          try {
            const snapshot = await fetchPortfolioSnapshot(walletAddress);

            // Compute pnl vs previous snapshot
            const [prev] = await prisma.walletSnapshot.findMany({
              where: { walletAddress },
              orderBy: { snapshotAt: "desc" },
              take: 1,
            });

            const prevValue = prev?.portfolioValue ?? snapshot.portfolioValueUsd;
            const pnlUsd = snapshot.portfolioValueUsd - prevValue;
            const pnlPercent =
              prevValue > 0 ? (pnlUsd / prevValue) * 100 : 0;

            await prisma.walletSnapshot.create({
              data: {
                walletAddress,
                portfolioValue: snapshot.portfolioValueUsd,
                solBalance: snapshot.solBalance,
                pnlUsd,
                pnlPercent,
                topTokensJson: JSON.stringify(snapshot.topGainers),
                snapshotAt: snapshot.fetchedAt,
              },
            });

            // Update wallet profile
            await updateWalletProfile(walletAddress);
          } catch (err) {
            console.error(`[snapshot] Failed for ${walletAddress}:`, err);
          }
        })
      );
    }

    const elapsed = ((Date.now() - cycleStart) / 1000).toFixed(1);
    console.log(`[snapshot] Cycle complete in ${elapsed}s`);
  } catch (err) {
    console.error("[snapshot] Cycle error:", err);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the snapshot worker.
 * Runs immediately, then every 5 minutes.
 */
export function startSnapshotWorker(): void {
  console.log(`[snapshot] Worker started (interval: ${env.SNAPSHOT_INTERVAL_MINUTES} min)`);

  // Run immediately on start
  runSnapshotCycle();

  snapshotTimer = setInterval(runSnapshotCycle, SNAPSHOT_INTERVAL_MS);
}

/**
 * Stop the snapshot worker gracefully.
 */
export function stopSnapshotWorker(): void {
  if (snapshotTimer) {
    clearInterval(snapshotTimer);
    snapshotTimer = null;
    console.log("[snapshot] Worker stopped.");
  }
}
