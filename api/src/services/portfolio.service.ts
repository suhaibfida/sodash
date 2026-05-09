// =============================================
// Portfolio Service
// Server-side wallet data fetching for workers.
// Reuses Helius RPC — same source as frontend.
// =============================================

import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { env } from "../utils/env";
import type { TokenPnL, TokenHolding } from "./ai-summary.service";

const connection = new Connection(env.HELIUS_RPC_URL, "confirmed");

// =============================================
// TYPES
// =============================================

export interface PortfolioSnapshot {
  walletAddress: string;
  portfolioValueUsd: number;
  solBalance: number;
  topHoldings: TokenHolding[];
  topGainers: TokenPnL[];
  topLosers: TokenPnL[];
  reclaimableSol: number;
  concentrationRisk: "LOW" | "MEDIUM" | "HIGH";
  fetchedAt: Date;
}

// =============================================
// SOL PRICE (CoinGecko — no API key needed)
// =============================================

let cachedSolPrice: { price: number; fetchedAt: number } | null = null;
const SOL_PRICE_CACHE_MS = 30_000; // 30 seconds

export async function getSolPrice(): Promise<number> {
  if (cachedSolPrice && Date.now() - cachedSolPrice.fetchedAt < SOL_PRICE_CACHE_MS) {
    return cachedSolPrice.price;
  }

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    );
    const data = (await res.json()) as { solana: { usd: number } };
    const price = data.solana.usd;
    cachedSolPrice = { price, fetchedAt: Date.now() };
    return price;
  } catch {
    // Fallback to cache or 0
    return cachedSolPrice?.price ?? 0;
  }
}

// =============================================
// TOKEN ACCOUNTS (Helius DAS)
// =============================================

interface HeliusTokenBalance {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  usdValue: number;
  priceChange24h: number;
  logoURI?: string;
}

async function fetchTokenBalances(
  walletAddress: string
): Promise<HeliusTokenBalance[]> {
  try {
    const url = `${env.HELIUS_RPC_URL}`;
    const body = {
      jsonrpc: "2.0",
      id: "sodash-worker",
      method: "getTokenAccountsByOwner",
      params: [
        walletAddress,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed" },
      ],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as {
      result?: { value: Array<{ account: { data: { parsed: { info: { mint: string; tokenAmount: { uiAmount: number; decimals: number } } } } } }> };
    };

    if (!data.result?.value) return [];

    // Map to simplified token balances
    // In production, enrich with Helius DAS API for price/metadata
    return data.result.value
      .filter((acc) => {
        const amount = acc.account.data.parsed.info.tokenAmount.uiAmount;
        return amount > 0;
      })
      .map((acc) => {
        const info = acc.account.data.parsed.info;
        return {
          mint: info.mint,
          symbol: info.mint.slice(0, 4).toUpperCase(),
          name: "Unknown",
          balance: info.tokenAmount.uiAmount,
          decimals: info.tokenAmount.decimals,
          usdValue: 0, // Would be enriched by DAS API
          priceChange24h: 0,
        };
      });
  } catch (err) {
    console.error("[portfolio] fetchTokenBalances error:", err);
    return [];
  }
}

// =============================================
// CONCENTRATION RISK
// =============================================

function computeConcentrationRisk(holdings: TokenHolding[]): "LOW" | "MEDIUM" | "HIGH" {
  if (holdings.length === 0) return "LOW";
  const topPercent = holdings[0]?.percentOfPortfolio ?? 0;
  if (topPercent > 70) return "HIGH";
  if (topPercent > 40) return "MEDIUM";
  return "LOW";
}

// =============================================
// MAIN PORTFOLIO FETCH
// =============================================

export async function fetchPortfolioSnapshot(
  walletAddress: string
): Promise<PortfolioSnapshot> {
  const [lamports, tokenBalances, solPrice] = await Promise.all([
    connection.getBalance(new PublicKey(walletAddress)),
    fetchTokenBalances(walletAddress),
    getSolPrice(),
  ]);

  const solBalance = lamports / LAMPORTS_PER_SOL;
  const solValueUsd = solBalance * solPrice;

  const tokenValueUsd = tokenBalances.reduce((sum, t) => sum + t.usdValue, 0);
  const portfolioValueUsd = solValueUsd + tokenValueUsd;

  // Build holdings list (include SOL)
  const allHoldings: TokenHolding[] = [
    {
      symbol: "SOL",
      usdValue: solValueUsd,
      percentOfPortfolio: portfolioValueUsd > 0 ? (solValueUsd / portfolioValueUsd) * 100 : 0,
    },
    ...tokenBalances.map((t) => ({
      symbol: t.symbol,
      usdValue: t.usdValue,
      percentOfPortfolio: portfolioValueUsd > 0 ? (t.usdValue / portfolioValueUsd) * 100 : 0,
    })),
  ].sort((a, b) => b.usdValue - a.usdValue);

  // Build PnL lists from 24h price changes
  const tokenPnLs: TokenPnL[] = tokenBalances.map((t) => ({
    symbol: t.symbol,
    pnlPercent: t.priceChange24h,
    pnlUsd: (t.usdValue * t.priceChange24h) / 100,
  }));

  const topGainers = [...tokenPnLs]
    .filter((t) => t.pnlPercent > 0)
    .sort((a, b) => b.pnlPercent - a.pnlPercent);

  const topLosers = [...tokenPnLs]
    .filter((t) => t.pnlPercent < 0)
    .sort((a, b) => a.pnlPercent - b.pnlPercent);

  const concentrationRisk = computeConcentrationRisk(allHoldings);

  return {
    walletAddress,
    portfolioValueUsd,
    solBalance,
    topHoldings: allHoldings.slice(0, 10),
    topGainers: topGainers.slice(0, 5),
    topLosers: topLosers.slice(0, 5),
    reclaimableSol: 0, // TODO: integrate rent reclaim detection
    concentrationRisk,
    fetchedAt: new Date(),
  };
}
