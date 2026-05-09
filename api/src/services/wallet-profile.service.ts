// =============================================
// Wallet Profile Service
// Generates and updates wallet intelligence profiles.
// =============================================

import prisma from "../db/client";
import { fetchPortfolioSnapshot } from "./portfolio.service";

/**
 * Generate or update wallet intelligence profile.
 */
export async function updateWalletProfile(walletAddress: string): Promise<void> {
  try {
    const snapshot = await fetchPortfolioSnapshot(walletAddress);

    // Compute risk score (0-100)
    let riskScore = 0;
    if (snapshot.concentrationRisk === "HIGH") riskScore += 40;
    else if (snapshot.concentrationRisk === "MEDIUM") riskScore += 20;
    
    // Add risk for high volatility tokens
    const volatileTokens = snapshot.topHoldings.filter(
      h => h.percentOfPortfolio > 30 && h.symbol !== "SOL"
    );
    riskScore += volatileTokens.length * 15;
    riskScore = Math.min(riskScore, 100);

    // Build wallet behavior summary
    const walletBehavior = JSON.stringify({
      totalHoldings: snapshot.topHoldings.length,
      diversification: snapshot.concentrationRisk,
      topTokenPercent: snapshot.topHoldings[0]?.percentOfPortfolio ?? 0,
    });

    await prisma.walletProfile.upsert({
      where: { walletAddress },
      create: {
        walletAddress,
        portfolioValue: snapshot.portfolioValueUsd,
        riskScore,
        concentrationRisk: snapshot.concentrationRisk,
        reclaimableSol: snapshot.reclaimableSol,
        walletBehavior,
        topHoldings: JSON.stringify(snapshot.topHoldings.slice(0, 5)),
        interactionSummary: JSON.stringify({ analyzed: true }),
      },
      update: {
        portfolioValue: snapshot.portfolioValueUsd,
        riskScore,
        concentrationRisk: snapshot.concentrationRisk,
        reclaimableSol: snapshot.reclaimableSol,
        walletBehavior,
        topHoldings: JSON.stringify(snapshot.topHoldings.slice(0, 5)),
        lastAnalyzedAt: new Date(),
      },
    });
  } catch (err) {
    console.error(`[wallet-profile] Failed to update profile for ${walletAddress}:`, err);
  }
}

/**
 * Get wallet profile for AI context.
 */
export async function getWalletProfile(walletAddress: string) {
  return prisma.walletProfile.findUnique({
    where: { walletAddress },
  });
}
