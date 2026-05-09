// =============================================
// Frontend API Client
// All blockchain calls go through the backend.
// The only @solana/web3.js usage is in
// createCloseTokenAccountTransaction which must
// return a real Transaction for sendTransaction().
// =============================================

import {
  Transaction,
  TransactionInstruction,
  PublicKey,
} from "@solana/web3.js";

import type {
  WalletSummary,
  TokenBalance,
  PreviousToken,
  WalletInteractions,
  InteractionDetail,
  GraphData,
  TokenDetail,
  RentAccount,
  BalanceSnapshot,
  PnLData,
} from "../types";

// ─── Base URL ────────────────────────────────────────────────────────────────

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Generic fetcher ─────────────────────────────────────────────────────────

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, options);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Network error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// =============================================
// PRICE FUNCTIONS
// =============================================

export async function getSolPrice(): Promise<{
  usdPrice: number;
  priceChange24h: number;
}> {
  const data = await apiFetch<{
    sol: { usdPrice: number; priceChange24h: number };
    tokens: Record<string, unknown>;
  }>("/prices");
  // Backend wraps sol price under `data.sol`
  return (
    data.sol ??
    (data as unknown as { usdPrice: number; priceChange24h: number })
  );
}

export async function getTokenPrice(
  mint: string,
): Promise<{ usdPrice: number; priceChange24h: number }> {
  return apiFetch<{ usdPrice: number; priceChange24h: number }>(
    `/prices/token/${mint}`,
  );
}

export async function getTokenMetadata(mint: string): Promise<{
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
} | null> {
  try {
    return await apiFetch<{
      symbol: string;
      name: string;
      decimals: number;
      logoURI?: string;
    }>(`/prices/metadata/${mint}`);
  } catch {
    return null;
  }
}

// =============================================
// WALLET FUNCTIONS
// =============================================

export async function getWalletSummary(
  address: string,
): Promise<WalletSummary> {
  const raw = await apiFetch<{
    address: string;
    solBalance: number;
    totalValue: number;
    tokens: Array<{
      mint: string;
      symbol: string;
      name: string;
      amount: number;
      decimals: number;
      usdValue: number;
      price: number;
      priceChange24h?: number;
      logoURI?: string;
    }>;
    previousTokens: Array<{
      mint: string;
      symbol: string;
      name: string;
      logo?: string;
      logoURI?: string;
      decimals: number;
      source: string;
      lastSeen: number;
      totalReceived: number;
      totalSent: number;
      txCount: number;
      reclaimableLamports: number;
      tokenAccounts: string[];
      program: string;
      lastAmount?: number;
      lastValue?: number;
    }>;
  }>(`/wallet/${address}/summary`);

  // Map tokens: add `balance` alias for `amount`, `logo` alias for `logoURI`
  const tokens: TokenBalance[] = raw.tokens.map((t) => ({
    ...t,
    balance: t.amount,
    logo: t.logoURI,
    priceChange24h: t.priceChange24h ?? 0,
  }));

  // Map previousTokens — pass through all fields
  const previousTokens: PreviousToken[] = raw.previousTokens.map((pt) => ({
    mint: pt.mint,
    symbol: pt.symbol,
    name: pt.name,
    logo: pt.logo ?? pt.logoURI,
    logoURI: pt.logoURI,
    decimals: pt.decimals ?? 0,
    source: pt.source ?? "history",
    lastSeen: pt.lastSeen ?? 0,
    totalReceived: pt.totalReceived ?? 0,
    totalSent: pt.totalSent ?? 0,
    txCount: pt.txCount ?? 0,
    reclaimableLamports: pt.reclaimableLamports ?? 0,
    tokenAccounts: pt.tokenAccounts ?? [],
    program: pt.program ?? "SPL Token",
    lastAmount: pt.lastAmount,
    lastValue: pt.lastValue,
  }));

  return {
    address: raw.address,
    solBalance: raw.solBalance,
    totalValue: raw.totalValue,
    tokens,
    previousTokens,
  };
}

export async function getWalletBalance(
  address: string | PublicKey,
): Promise<number> {
  const addr = typeof address === "string" ? address : address.toBase58();
  const summary = await getWalletSummary(addr);
  return summary.solBalance;
}

export async function getTokenBalances(
  address: string | PublicKey,
): Promise<TokenBalance[]> {
  const addr = typeof address === "string" ? address : address.toBase58();
  // The /tokens endpoint returns the token array directly
  const raw = await apiFetch<
    Array<{
      mint: string;
      symbol: string;
      name: string;
      amount: number;
      decimals: number;
      usdValue: number;
      price: number;
      priceChange24h?: number;
      logoURI?: string;
    }>
  >(`/wallet/${addr}/tokens`);

  return raw.map((t) => ({
    ...t,
    balance: t.amount,
    logo: t.logoURI,
    priceChange24h: t.priceChange24h ?? 0,
  }));
}

// =============================================
// GRAPH / INTERACTION FUNCTIONS
// =============================================

export async function getWalletGraph(address: string): Promise<GraphData> {
  return apiFetch<GraphData>(`/blockchain/graph/${address}`);
}

export async function getInteractionDetail(
  targetAddress: string,
  walletAddress: string | PublicKey,
): Promise<InteractionDetail | null> {
  const walletAddr =
    typeof walletAddress === "string"
      ? walletAddress
      : walletAddress.toBase58();
  try {
    return await apiFetch<InteractionDetail>(
      `/wallet/${walletAddr}/interaction/${targetAddress}`,
    );
  } catch {
    return null;
  }
}

export async function getAddressInteractions(
  address: string | PublicKey,
): Promise<WalletInteractions> {
  const addr = typeof address === "string" ? address : address.toBase58();
  return apiFetch<WalletInteractions>(`/wallet/${addr}/interactions`);
}

// =============================================
// TOKEN DETAIL
// =============================================

export async function getTokenDetail(
  mint: string,
  walletPublicKey: PublicKey | string,
): Promise<TokenDetail | null> {
  const address =
    typeof walletPublicKey === "string"
      ? walletPublicKey
      : walletPublicKey.toBase58();

  try {
    const [summary, priceData] = await Promise.all([
      getWalletSummary(address),
      getTokenPrice(mint).catch(() => ({
        usdPrice: 0,
        priceChange24h: 0,
      })),
    ]);

    const token = summary.tokens.find((t) => t.mint === mint);
    if (!token) return null;

    const price = token.price > 0 ? token.price : priceData.usdPrice;
    const priceChange24h = token.priceChange24h ?? priceData.priceChange24h;
    const priceHistory = buildTokenHistory(price, priceChange24h);

    // Pull recent interactions to synthesise a transaction list
    let transactions: TokenDetail["transactions"] = [];
    try {
      const interactions = await apiFetch<WalletInteractions>(
        `/wallet/${address}/interactions`,
      );
      // Map interaction entries to a synthetic transaction list
      transactions = interactions.interactions.slice(0, 10).map((ix) => ({
        signature: ix.address,
        type: "transfer" as const,
        amount: ix.totalSolTransferred,
        usdValue: ix.totalSolTransferred * price,
        timestamp: ix.lastInteraction,
        counterparty: ix.address,
      }));
    } catch {
      // interactions are optional; continue without them
    }

    return {
      mint: token.mint,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      price,
      priceChange24h,
      logoURI: token.logoURI,
      logo: token.logoURI,
      balance: token.amount,
      usdValue: token.usdValue,
      priceHistory,
      transactions,
      description: `Live wallet position for mint ${mint}.`,
    };
  } catch {
    return null;
  }
}

// =============================================
// RENT / RECLAIM
// =============================================

export async function getRentAccounts(
  walletPublicKey: PublicKey | string,
): Promise<RentAccount[]> {
  const address =
    typeof walletPublicKey === "string"
      ? walletPublicKey
      : walletPublicKey.toBase58();

  try {
    const summary = await getWalletSummary(address);
    return summary.previousTokens.map((token) => ({
      address: token.tokenAccounts[0] ?? "",
      mint: token.mint,
      lamports: token.reclaimableLamports,
      dataLength: 165,
      rentExemptMinimum: token.reclaimableLamports,
      reclaimable: token.reclaimableLamports > 0,
      program: token.program ?? "SPL Token",
      programId:
        token.program === "Token-2022"
          ? "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
          : "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    }));
  } catch {
    return [];
  }
}

/**
 * Build a real @solana/web3.js Transaction so wallet adapter's
 * sendTransaction() can sign and broadcast it on-chain.
 */
export function createCloseTokenAccountTransaction(
  publicKey: PublicKey,
  accountAddress: string,
  programId: string,
): Transaction {
  const account = new PublicKey(accountAddress);
  const tokenProgram = new PublicKey(programId);

  const closeInstruction = new TransactionInstruction({
    programId: tokenProgram,
    keys: [
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: publicKey, isSigner: false, isWritable: true },
      { pubkey: publicKey, isSigner: true, isWritable: false },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: new Uint8Array([9]) as any,
  });

  return new Transaction().add(closeInstruction);
}

// =============================================
// PROFILE / HISTORY HELPERS
// (kept for backward compatibility with Profile.tsx)
// =============================================

export async function getBalanceHistory(
  walletPublicKey: PublicKey | string,
): Promise<BalanceSnapshot[]> {
  const address =
    typeof walletPublicKey === "string"
      ? walletPublicKey
      : walletPublicKey.toBase58();

  try {
    const currentBalance = await getWalletBalance(address);
    const now = new Date();
    const dates: string[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86_400_000);
      dates.push(d.toISOString().split("T")[0]);
    }

    // Simple flat history — real historical data would require a dedicated endpoint
    return dates.map((date) => ({ date, balance: currentBalance }));
  } catch {
    return [];
  }
}

export async function getPnLData(
  walletPublicKey: PublicKey | string,
): Promise<PnLData> {
  const address =
    typeof walletPublicKey === "string"
      ? walletPublicKey
      : walletPublicKey.toBase58();

  const [summary, solPriceData] = await Promise.all([
    getWalletSummary(address),
    getSolPrice(),
  ]);

  const { tokens, solBalance } = summary;
  const solUsdPrice = solPriceData.usdPrice ?? 0;
  const solCurrent = solBalance * solUsdPrice;
  const solPrevious = solPriceData.priceChange24h
    ? solCurrent / (1 + solPriceData.priceChange24h / 100)
    : solCurrent;

  const byToken = [
    {
      mint: "So11111111111111111111111111111111111111112",
      symbol: "SOL",
      logo: "/solana-token.svg",
      invested: solPrevious,
      current: solCurrent,
      pnl: solCurrent - solPrevious,
      pnlPercent:
        solPrevious > 0 ? ((solCurrent - solPrevious) / solPrevious) * 100 : 0,
    },
    ...tokens.map((token) => {
      const previousValue =
        token.priceChange24h && token.priceChange24h !== 0
          ? token.usdValue / (1 + token.priceChange24h / 100)
          : token.usdValue;
      const pnl = token.usdValue - previousValue;
      return {
        mint: token.mint,
        symbol: token.symbol,
        logo: token.logo,
        invested: previousValue,
        current: token.usdValue,
        pnl,
        pnlPercent: previousValue > 0 ? (pnl / previousValue) * 100 : 0,
      };
    }),
  ].filter((t) => t.current > 0 || t.invested > 0);

  const totalInvested = byToken.reduce((s, t) => s + t.invested, 0);
  const currentValue = byToken.reduce((s, t) => s + t.current, 0);
  const totalPnL = currentValue - totalInvested;
  const pnlPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  return { totalInvested, currentValue, totalPnL, pnlPercent, byToken };
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

export function shortAddress(address: string, head = 4, tail = 4): string {
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

export function numberFromUiAmount(value?: string | number | null): number {
  if (value === undefined || value === null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Generate 24 hourly price data points that simulate a smooth curve
 * from the 24h-ago price to the current price.
 */
export function buildTokenHistory(
  currentPrice: number,
  priceChange24h: number,
): Array<{ time: string; price: number }> {
  if (!currentPrice) return [];

  const startPrice = priceChange24h
    ? currentPrice / (1 + priceChange24h / 100)
    : currentPrice;

  const history: Array<{ time: string; price: number }> = [];

  for (let i = 23; i >= 0; i--) {
    const progress = (23 - i) / 23;
    const price = startPrice + (currentPrice - startPrice) * progress;
    const time = new Date(Date.now() - i * 3_600_000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    history.push({ time, price: Number(price.toFixed(8)) });
  }

  return history;
}
