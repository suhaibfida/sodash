// =============================================
// Blockchain Service
// Handles all Solana RPC calls through Helius
// =============================================

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { env } from "../../utils/env";
import { cache } from "../cache/cache.service";
import { priceService } from "../price/price.service";
import type {
  WalletSummary,
  TokenBalance,
  PreviousToken,
  WalletInteractions,
  InteractionDetail,
  GraphData,
  GraphNode,
  GraphLink,
} from "../../types/api";

// =============================================
// KNOWN PROGRAMS MAP
// Maps program address → { name, category, exchange? }
// =============================================

interface ProgramInfo {
  name: string;
  category: "exchange" | "program" | "token";
  exchange?: string;
}

const KNOWN_PROGRAMS: Record<string, ProgramInfo> = {
  // ---- System / Core ----
  "11111111111111111111111111111111": {
    name: "System Program",
    category: "program",
  },
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: {
    name: "Token Program",
    category: "token",
  },
  TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: {
    name: "Token-2022",
    category: "token",
  },
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: {
    name: "Memo",
    category: "program",
  },
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bJ: {
    name: "ATA Program",
    category: "program",
  },
  ComputeBudget111111111111111111111111111111: {
    name: "Compute Budget",
    category: "program",
  },
  // ---- Metaplex ----
  metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s: {
    name: "Metaplex Token Metadata",
    category: "program",
  },
  auth9SigNpDKz4zZVZFKL9rj8esYYHkCtW5FZXZz7gF: {
    name: "Metaplex Auth Rules",
    category: "program",
  },
  // ---- Raydium ----
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": {
    name: "Raydium AMM v4",
    category: "exchange",
    exchange: "Raydium",
  },
  RVKd61ztZW9GUwhRbbLoYVRE5Xf1B2tVscKqwZqXgEr: {
    name: "Raydium AMM v3",
    category: "exchange",
    exchange: "Raydium",
  },
  "27haf8L6oxUeXrHrgEgsexjSY5hbVUWEmvv9Nyxg8vQv": {
    name: "Raydium CLMM",
    category: "exchange",
    exchange: "Raydium",
  },
  CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: {
    name: "Raydium CAMM",
    category: "exchange",
    exchange: "Raydium",
  },
  // ---- Orca ----
  "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP": {
    name: "Orca Swap v2",
    category: "exchange",
    exchange: "Orca",
  },
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: {
    name: "Orca Whirlpool",
    category: "exchange",
    exchange: "Orca",
  },
  // ---- Jupiter ----
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: {
    name: "Jupiter v6",
    category: "exchange",
    exchange: "Jupiter",
  },
  JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB: {
    name: "Jupiter v4",
    category: "exchange",
    exchange: "Jupiter",
  },
  // ---- Serum / OpenBook ----
  "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin": {
    name: "Serum DEX v3",
    category: "exchange",
    exchange: "Serum",
  },
  srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX: {
    name: "OpenBook DEX",
    category: "exchange",
    exchange: "OpenBook",
  },
  // ---- Magic Eden ----
  M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K: {
    name: "Magic Eden v2",
    category: "exchange",
    exchange: "Magic Eden",
  },
  // ---- Mango ----
  mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68: {
    name: "Mango v3",
    category: "exchange",
    exchange: "Mango",
  },
  "4MangoMjqJ2firMokCjjGgoK8d4MXcrgL7XJaL3w6fVg": {
    name: "Mango v4",
    category: "exchange",
    exchange: "Mango",
  },
  // ---- Drift ----
  dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH: {
    name: "Drift Protocol",
    category: "exchange",
    exchange: "Drift",
  },
  // ---- Phoenix ----
  PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY: {
    name: "Phoenix DEX",
    category: "exchange",
    exchange: "Phoenix",
  },
  // ---- Marinade ----
  MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD: {
    name: "Marinade Finance",
    category: "program",
  },
  // ---- Lido ----
  CrX7kMhLC3cSsXJdT7JDgqrRVWGnUpX3gfEfxxU2NVLi: {
    name: "Lido for Solana",
    category: "program",
  },
  // ---- Jito ----
  Jito4APyf642JPzcbKoaVAkGVxh4rSXVdrZCNQcDVMR: {
    name: "Jito Staking",
    category: "program",
  },
};

// =============================================
// RING RADII for node positioning
// =============================================

const RING = {
  exchange: 140,
  wallet: 240,
  program: 340,
  token: 420,
} as const;

// =============================================
// HELPERS
// =============================================

function shortLabel(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

function positionOnRing(
  index: number,
  total: number,
  radius: number,
): { x: number; y: number } {
  const angle = (2 * Math.PI * index) / Math.max(total, 1) - Math.PI / 2;
  return {
    x: Math.round(radius * Math.cos(angle)),
    y: Math.round(radius * Math.sin(angle)),
  };
}

// =============================================
// BLOCKCHAIN SERVICE
// =============================================

// Wrap any promise with a hard timeout — returns null on timeout instead of hanging
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn(`[BlockchainService] ${label} timed out after ${ms}ms`);
        resolve(null);
      }, ms);
    }),
  ]);
}

class BlockchainService {
  private connection: Connection;

  constructor() {
    // Prefer HELIUS_RPC_URL (already has API key embedded if set correctly),
    // otherwise fall back to constructing it from the API key.
    const rpcUrl =
      env.HELIUS_RPC_URL !== "https://api.mainnet-beta.solana.com" &&
      env.HELIUS_RPC_URL
        ? env.HELIUS_RPC_URL
        : env.HELIUS_API_KEY
          ? `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`
          : "https://api.mainnet-beta.solana.com";

    console.log(`[BlockchainService] Using RPC: ${rpcUrl.slice(0, 60)}...`);

    this.connection = new Connection(rpcUrl, {
      commitment: "confirmed",
      fetchMiddleware: undefined,
      disableRetryOnRateLimit: false,
    });
  }

  // ------------------------------------------
  // getWalletSummary
  // ------------------------------------------

  async getWalletSummary(address: string): Promise<WalletSummary> {
    const cacheKey = `wallet_summary_${address}`;
    const cached = await cache.get<WalletSummary>(cacheKey);
    if (cached) return cached;

    try {
      const publicKey = new PublicKey(address);

      // Fetch SOL balance + ALL token accounts in parallel (one Helius call each)
      const [solBalance, allAccounts] = await Promise.all([
        this.getSolBalance(publicKey),
        this.fetchAllTokenAccounts(address),
      ]);

      // Split into active tokens and zero-balance (previous) tokens
      const activeAccounts = allAccounts.filter((a) => a.amount > 0);
      const zeroAccounts = allAccounts.filter((a) => a.amount === 0);

      console.log(
        `[WalletSummary] ${address.slice(0, 8)}: total_accounts=${allAccounts.length} active=${activeAccounts.length} zero=${zeroAccounts.length}`,
      );

      // ── Build token balances ──────────────────────────────────────────────
      const activeMetadata = await Promise.all(
        activeAccounts.map(({ mint }) =>
          Promise.race([
            priceService.getTokenMetadata(mint),
            new Promise<null>((r) => setTimeout(() => r(null), 3_000)),
          ]).catch(() => null),
        ),
      );

      const rawTokens: TokenBalance[] = activeAccounts.map(
        ({ mint, amount, decimals }, i) => {
          const meta = activeMetadata[i];
          return {
            mint,
            symbol: meta?.symbol ?? "UNKNOWN",
            name: meta?.name ?? "Unknown Token",
            amount,
            decimals,
            usdValue: 0,
            price: 0,
            logoURI: meta?.logoURI,
          };
        },
      );

      const prices = await priceService.getTokenPrices(
        rawTokens.map((t) => t.mint),
      );
      const tokensWithPrices: TokenBalance[] = rawTokens.map((token) => ({
        ...token,
        usdValue: token.amount * (prices[token.mint]?.usdPrice ?? 0),
        price: prices[token.mint]?.usdPrice ?? 0,
      }));

      // ── Build previous tokens from transaction history ────────────────────
      // Fetch last 100 txs from Helius enhanced API — gives us tokenTransfers
      const previousTokens = await this.fetchPreviousTokensFromHistory(
        address,
        new Set(tokensWithPrices.map((t) => t.mint)),
      );

      console.log(
        `[WalletSummary] ${address.slice(0, 8)}: tokens=${tokensWithPrices.length} prev=${previousTokens.length}`,
      );

      // ── Assemble result ───────────────────────────────────────────────────
      const solPrice = await priceService.getSolPrice();
      const totalValue =
        solBalance * solPrice.usdPrice +
        tokensWithPrices.reduce((sum, t) => sum + t.usdValue, 0);

      const result: WalletSummary = {
        address,
        solBalance,
        totalValue,
        tokens: tokensWithPrices,
        previousTokens,
      };

      const ttl = previousTokens.length > 0 ? 30_000 : 5_000;
      await cache.set(cacheKey, result, ttl);
      return result;
    } catch (error) {
      console.error(
        `[BlockchainService] getWalletSummary failed for ${address}:`,
        error,
      );
      throw new Error("Failed to fetch wallet summary");
    }
  }

  // ------------------------------------------
  // fetchPreviousTokensFromHistory
  // Uses Helius enhanced transactions API to find tokens the user
  // previously held but no longer has in their current wallet.
  // ------------------------------------------

  private async fetchPreviousTokensFromHistory(
    address: string,
    currentMints: Set<string>,
  ): Promise<PreviousToken[]> {
    const cacheKey = `prev_tokens_history_${address}`;
    const cached = await cache.get<PreviousToken[]>(cacheKey);
    if (cached) return cached;

    const heliusUrl = this.getHeliusUrl();
    if (!heliusUrl || !env.HELIUS_API_KEY) {
      console.warn("[PreviousTokens] No Helius API key — skipping tx history");
      return [];
    }

    try {
      // Helius enhanced transactions REST endpoint
      const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${env.HELIUS_API_KEY}&limit=100`;
      const resp = await withTimeout(
        fetch(url).then((r) => r.json()),
        15_000,
        "Helius enhanced txs",
      );

      if (!resp || !Array.isArray(resp)) {
        console.warn("[PreviousTokens] No tx data from Helius");
        return [];
      }

      // Accumulate per-mint stats from tokenTransfers
      const mintStats = new Map<
        string,
        { received: number; sent: number; lastSeen: number; txCount: number }
      >();

      for (const tx of resp as any[]) {
        const ts: number = tx.timestamp ?? 0;
        const transfers: any[] = tx.tokenTransfers ?? [];

        for (const transfer of transfers) {
          const mint: string = transfer.mint ?? "";
          if (!mint || mint.length < 32) continue;
          // Only track fungible tokens (skip NFTs by checking tokenStandard)
          if (transfer.tokenStandard && transfer.tokenStandard !== "Fungible")
            continue;

          const amount: number = Number(transfer.tokenAmount ?? 0);
          const isReceived = transfer.toUserAccount === address;
          const isSent = transfer.fromUserAccount === address;
          if (!isReceived && !isSent) continue;

          const existing = mintStats.get(mint);
          if (existing) {
            if (isReceived) existing.received += amount;
            if (isSent) existing.sent += amount;
            if (ts > existing.lastSeen) existing.lastSeen = ts;
            existing.txCount++;
          } else {
            mintStats.set(mint, {
              received: isReceived ? amount : 0,
              sent: isSent ? amount : 0,
              lastSeen: ts,
              txCount: 1,
            });
          }
        }
      }

      // Only keep mints NOT currently in the wallet
      const prevMints = [...mintStats.entries()].filter(
        ([mint]) => !currentMints.has(mint),
      );

      // Sort by lastSeen descending (most recently traded first), cap at 20
      prevMints.sort((a, b) => b[1].lastSeen - a[1].lastSeen);
      const top = prevMints.slice(0, 20);

      // Fetch metadata for all in parallel
      const metaList = await Promise.all(
        top.map(([mint]) =>
          Promise.race([
            priceService.getTokenMetadata(mint),
            new Promise<null>((r) => setTimeout(() => r(null), 3_000)),
          ]).catch(() => null),
        ),
      );

      const previousTokens: PreviousToken[] = top.map(([mint, stats], i) => {
        const meta = metaList[i];
        return {
          mint,
          symbol: meta?.symbol ?? mint.slice(0, 6).toUpperCase(),
          name: meta?.name ?? "Unknown Token",
          logoURI: meta?.logoURI,
          logo: meta?.logoURI,
          decimals: meta?.decimals ?? 0,
          lastSeen: stats.lastSeen,
          totalReceived: stats.received,
          totalSent: stats.sent,
          txCount: stats.txCount,
          // legacy rent fields — not applicable here
          reclaimableLamports: 0,
          tokenAccounts: [],
          program: "SPL Token",
          source: "history",
        };
      });

      console.log(
        `[PreviousTokens] ${address.slice(0, 8)}: found ${previousTokens.length} previously traded tokens from ${resp.length} txs`,
      );

      await cache.set(cacheKey, previousTokens, 2 * 60_000); // 2 min cache
      return previousTokens;
    } catch (err) {
      console.error(
        "[PreviousTokens] fetchPreviousTokensFromHistory error:",
        err,
      );
      return [];
    }
  }

  // ------------------------------------------
  // getSolBalance
  // ------------------------------------------

  async getSolBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await withTimeout(
        this.connection.getBalance(publicKey),
        8_000,
        "getBalance",
      );
      if (balance === null) return 0;
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error("[BlockchainService] Failed to get SOL balance:", error);
      return 0;
    }
  }

  // ------------------------------------------
  // fetchAllTokenAccounts
  // Uses Helius DAS API when available (fast, one HTTP call).
  // Falls back to web3.js RPC with timeout.
  // Returns raw account data for BOTH zero and non-zero balance accounts.
  // ------------------------------------------

  // Resolve the Helius RPC URL to use for direct fetch calls
  private getHeliusUrl(): string | null {
    // Explicit API key takes priority
    if (env.HELIUS_API_KEY) {
      return `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`;
    }
    // Try to extract key from HELIUS_RPC_URL if it contains one
    if (env.HELIUS_RPC_URL && env.HELIUS_RPC_URL.includes("helius")) {
      return env.HELIUS_RPC_URL;
    }
    return null;
  }

  private async fetchAllTokenAccounts(address: string): Promise<
    Array<{
      mint: string;
      amount: number;
      decimals: number;
      lamports: number;
      pubkey: string;
      program: string;
    }>
  > {
    const heliusUrl = this.getHeliusUrl();
    // Try Helius DAS first — one fast HTTP call, returns all accounts
    if (heliusUrl) {
      try {
        const url = heliusUrl;
        const response = await withTimeout(
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: "get-token-accounts",
              method: "getTokenAccountsByOwner",
              params: [
                address,
                { programId: TOKEN_PROGRAM_ID.toBase58() },
                { encoding: "jsonParsed", commitment: "confirmed" },
              ],
            }),
          }).then((r) => r.json()),
          10_000,
          "Helius getTokenAccountsByOwner",
        );

        const t22Response = await withTimeout(
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: "get-token2022-accounts",
              method: "getTokenAccountsByOwner",
              params: [
                address,
                { programId: TOKEN_2022_PROGRAM_ID.toBase58() },
                { encoding: "jsonParsed", commitment: "confirmed" },
              ],
            }),
          }).then((r) => r.json()),
          10_000,
          "Helius getTokenAccountsByOwner T22",
        );

        const splAccs = (response as any)?.result?.value ?? [];
        const t22Accs = (t22Response as any)?.result?.value ?? [];
        const allAccs = [...splAccs, ...t22Accs];

        if (allAccs.length > 0) {
          console.log(
            `[fetchAllTokenAccounts] Helius returned ${allAccs.length} accounts for ${address.slice(0, 8)}`,
          );
          return allAccs
            .map((acc: any) => {
              const info = acc.account?.data?.parsed?.info ?? {};
              return {
                mint: info.mint ?? "",
                amount: Number(info.tokenAmount?.uiAmount ?? 0),
                decimals: Number(info.tokenAmount?.decimals ?? 0),
                lamports: Number(acc.account?.lamports ?? 0),
                pubkey: acc.pubkey ?? "",
                program:
                  acc.account?.owner === TOKEN_2022_PROGRAM_ID.toBase58()
                    ? "Token-2022"
                    : "SPL Token",
              };
            })
            .filter((a: any) => a.mint);
        }
      } catch (e) {
        console.warn(
          "[fetchAllTokenAccounts] Helius DAS failed, falling back to RPC:",
          e,
        );
      }
    }

    // Fallback: web3.js with timeout
    const publicKey = new PublicKey(address);
    const [splResult, t22Result] = await Promise.all([
      withTimeout(
        this.connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        }),
        12_000,
        "RPC getTokenAccounts(SPL)",
      ),
      withTimeout(
        this.connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        12_000,
        "RPC getTokenAccounts(T22)",
      ),
    ]);

    const allAccounts = [
      ...(splResult?.value ?? []),
      ...(t22Result?.value ?? []),
    ];

    return allAccounts
      .map((acc) => {
        const info = (acc.account.data as any).parsed?.info ?? {};
        return {
          mint: info.mint ?? "",
          amount: Number(info.tokenAmount?.uiAmount ?? 0),
          decimals: Number(info.tokenAmount?.decimals ?? 0),
          lamports: acc.account.lamports,
          pubkey: acc.pubkey.toBase58(),
          program:
            acc.account.owner.toBase58() === TOKEN_2022_PROGRAM_ID.toBase58()
              ? "Token-2022"
              : "SPL Token",
        };
      })
      .filter((a) => a.mint);
  }

  // ------------------------------------------
  // getTokenBalances
  // ------------------------------------------

  async getTokenBalances(publicKey: PublicKey): Promise<TokenBalance[]> {
    try {
      const allAccounts = await this.fetchAllTokenAccounts(
        publicKey.toBase58(),
      );

      // Only non-zero balance accounts
      const active = allAccounts.filter((a) => a.amount > 0);

      // Fetch all metadata in parallel with per-request timeout
      const metadataList = await Promise.all(
        active.map(async ({ mint }) => {
          try {
            return await Promise.race([
              priceService.getTokenMetadata(mint),
              new Promise<null>((resolve) =>
                setTimeout(() => resolve(null), 3_000),
              ),
            ]);
          } catch {
            return null;
          }
        }),
      );

      return active.map(({ mint, amount, decimals }, idx) => {
        const metadata = metadataList[idx];
        return {
          mint,
          symbol: metadata?.symbol ?? "UNKNOWN",
          name: metadata?.name ?? "Unknown Token",
          amount,
          decimals,
          usdValue: 0,
          price: 0,
          logoURI: metadata?.logoURI,
        };
      });
    } catch (error) {
      console.error("[BlockchainService] Failed to get token balances:", error);
      return [];
    }
  }

  // ------------------------------------------
  // buildGraphFromAddress — core graph builder
  // ------------------------------------------

  private async buildGraphFromAddress(address: string): Promise<GraphData> {
    const publicKey = new PublicKey(address);

    // 1. Fetch last 50 signatures
    const signatures = await this.connection.getSignaturesForAddress(
      publicKey,
      { limit: 50 },
    );

    if (signatures.length === 0) {
      const centerNode: GraphNode = {
        id: address,
        label: "You",
        type: "wallet",
        category: "wallet",
        val: 20,
        x: 0,
        y: 0,
      };
      return { nodes: [centerNode], links: [] };
    }

    // 2. Batch-fetch parsed transactions (max 30)
    const sigStrings = signatures.slice(0, 30).map((s) => s.signature);

    const txResults = await Promise.all(
      sigStrings.map((sig) =>
        this.connection
          .getParsedTransaction(sig, {
            maxSupportedTransactionVersion: 0,
          })
          .catch(() => null),
      ),
    );

    // 3. Collect counterparty stats
    // key → { type, interactionCount, totalSolTransferred, programInfo? }
    interface CounterpartyStats {
      type: "wallet" | "program" | "token";
      interactionCount: number;
      totalSolTransferred: number;
      programInfo?: ProgramInfo;
    }

    const counterparties = new Map<string, CounterpartyStats>();

    const bump = (
      key: string,
      type: "wallet" | "program" | "token",
      sol: number,
      programInfo?: ProgramInfo,
    ) => {
      const existing = counterparties.get(key);
      if (existing) {
        existing.interactionCount += 1;
        existing.totalSolTransferred += sol;
      } else {
        counterparties.set(key, {
          type,
          interactionCount: 1,
          totalSolTransferred: sol,
          programInfo,
        });
      }
    };

    for (const tx of txResults) {
      if (!tx?.transaction?.message) continue;

      const message = tx.transaction.message;
      const accountKeys: string[] =
        "accountKeys" in message
          ? (
              message.accountKeys as Array<{ pubkey: { toBase58(): string } }>
            ).map((k) => k.pubkey.toBase58())
          : [];

      // Compute rough SOL delta for this transaction
      const meta = tx.meta;
      const solDelta =
        meta?.fee !== undefined ? Math.abs(meta.fee) / LAMPORTS_PER_SOL : 0;

      for (const key of accountKeys) {
        if (key === address) continue;

        const programInfo = KNOWN_PROGRAMS[key];

        if (programInfo) {
          bump(
            key,
            programInfo.category === "token" ? "token" : "program",
            solDelta,
            programInfo,
          );
        } else {
          // Unknown address — classify as wallet or program heuristic:
          // If it appears only in instructions it's likely a program; otherwise a wallet
          bump(key, "wallet", solDelta);
        }
      }

      // Also pull programs from instructions explicitly
      if ("instructions" in message) {
        const instructions = message.instructions as Array<{
          programId?: { toBase58(): string };
          program?: string;
          parsed?: unknown;
        }>;
        for (const ix of instructions) {
          const pid = ix.programId?.toBase58();
          if (!pid || pid === address) continue;
          const programInfo = KNOWN_PROGRAMS[pid];
          bump(pid, "program", 0, programInfo);
        }
      }
    }

    // 4. Build nodes — cap at 33 counterparties (1 center + 33 = 34 total)
    const sortedCounterparties = Array.from(counterparties.entries())
      .sort((a, b) => b[1].interactionCount - a[1].interactionCount)
      .slice(0, 33);

    // Group by category for ring positioning
    const byCategory: Record<string, string[]> = {
      exchange: [],
      wallet: [],
      program: [],
      token: [],
    };

    for (const [addr, stats] of sortedCounterparties) {
      const cat = stats.programInfo?.exchange
        ? "exchange"
        : stats.type === "token"
          ? "token"
          : stats.type === "program"
            ? "program"
            : "wallet";
      // byCategory always has keys for all four categories
      (byCategory[cat] ??= []).push(addr);
    }

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Center node
    const centerNode: GraphNode = {
      id: address,
      label: "You",
      type: "wallet",
      category: "wallet",
      val: 20,
      x: 0,
      y: 0,
    };
    nodes.push(centerNode);

    // Build counterparty nodes with ring positioning
    for (const [category, addrs] of Object.entries(byCategory)) {
      const radius = RING[category as keyof typeof RING] ?? 300;
      addrs.forEach((addr, idx) => {
        const stats = counterparties.get(addr)!;
        const programInfo = stats.programInfo ?? KNOWN_PROGRAMS[addr];
        const pos = positionOnRing(idx, addrs.length, radius);

        const node: GraphNode = {
          id: addr,
          label: programInfo?.name ?? shortLabel(addr),
          type: stats.type,
          category,
          val: Math.max(4, Math.min(16, stats.interactionCount * 2)),
          x: pos.x,
          y: pos.y,
          ...(programInfo?.exchange ? { exchange: programInfo.exchange } : {}),
          ...(programInfo?.name ? { programName: programInfo.name } : {}),
        };
        nodes.push(node);
      });
    }

    // 5. Build links (cap at 60)
    const allAddrSet = new Set(sortedCounterparties.map(([a]) => a));
    let linkCount = 0;

    for (const [addr, stats] of sortedCounterparties) {
      if (linkCount >= 60) break;
      if (!allAddrSet.has(addr)) continue;

      links.push({
        source: address,
        target: addr,
        value: stats.interactionCount,
        label: `${stats.interactionCount} tx`,
      });
      linkCount++;
    }

    return { nodes, links };
  }

  // ------------------------------------------
  // getWalletGraph
  // ------------------------------------------

  async getWalletGraph(address: string): Promise<GraphData> {
    const cacheKey = `wallet_graph_${address}`;
    const cached = await cache.get<GraphData>(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.buildGraphFromAddress(address);
      await cache.set(cacheKey, result, 2 * 60 * 1000); // 2 minutes
      return result;
    } catch (error) {
      console.error(
        `[BlockchainService] Failed to get wallet graph for ${address}:`,
        error,
      );
      throw new Error("Failed to fetch wallet graph");
    }
  }

  // ------------------------------------------
  // getWalletInteractions
  // ------------------------------------------

  async getWalletInteractions(address: string): Promise<WalletInteractions> {
    const cacheKey = `wallet_interactions_${address}`;
    const cached = await cache.get<WalletInteractions>(cacheKey);
    if (cached) return cached;

    try {
      const graph = await this.buildGraphFromAddress(address);

      // Map graph nodes to InteractionDetail (skip the center node)
      const interactions: InteractionDetail[] = graph.nodes
        .filter((n) => n.id !== address)
        .map((node) => {
          // Find the corresponding link to get interaction count
          const link = graph.links.find(
            (l) =>
              (typeof l.target === "string" ? l.target : l.target.id) ===
              node.id,
          );
          const interactionCount = link?.value ?? 1;

          return {
            address: node.id,
            label: node.label,
            type: node.type,
            category: node.category ?? node.type,
            programName: node.programName,
            exchange: node.exchange,
            interactionCount,
            totalSolTransferred: 0, // aggregate SOL detail requires deeper tx parsing
            lastInteraction: 0,
            transactions: [],
          };
        })
        .sort((a, b) => b.interactionCount - a.interactionCount);

      const result: WalletInteractions = { address, interactions };
      await cache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes
      return result;
    } catch (error) {
      console.error(
        `[BlockchainService] Failed to get wallet interactions for ${address}:`,
        error,
      );
      throw new Error("Failed to fetch wallet interactions");
    }
  }

  // ------------------------------------------
  // getInteractionDetail
  // GET /api/v1/wallet/:address/interaction/:target
  // ------------------------------------------

  async getInteractionDetail(
    targetAddress: string,
    walletAddress: string,
  ): Promise<InteractionDetail> {
    const cacheKey = `interaction_detail_${walletAddress}_${targetAddress}`;
    const cached = await cache.get<InteractionDetail>(cacheKey);
    if (cached) return cached;

    try {
      const walletKey = new PublicKey(walletAddress);

      // Fetch up to 50 recent signatures for the wallet
      const signatures = await this.connection.getSignaturesForAddress(
        walletKey,
        { limit: 50 },
      );

      const sigStrings = signatures.slice(0, 30).map((s) => s.signature);

      const txResults = await Promise.all(
        sigStrings.map((sig) =>
          this.connection
            .getParsedTransaction(sig, {
              maxSupportedTransactionVersion: 0,
            })
            .catch(() => null),
        ),
      );

      interface TxEntry {
        signature: string;
        type: string;
        amount: number;
        timestamp: number;
      }

      const relevantTxs: TxEntry[] = [];
      let totalSol = 0;
      let lastTs = 0;

      for (let i = 0; i < txResults.length; i++) {
        const tx = txResults[i];
        if (!tx?.transaction?.message) continue;

        const message = tx.transaction.message;
        const accountKeys: string[] =
          "accountKeys" in message
            ? (
                message.accountKeys as Array<{
                  pubkey: { toBase58(): string };
                }>
              ).map((k) => k.pubkey.toBase58())
            : [];

        if (!accountKeys.includes(targetAddress)) continue;

        const ts = tx.blockTime ?? 0;
        if (ts > lastTs) lastTs = ts;

        const feeSol = (tx.meta?.fee ?? 0) / LAMPORTS_PER_SOL;
        totalSol += feeSol;

        const sig = sigStrings[i];
        if (!sig) continue;
        relevantTxs.push({
          signature: sig,
          type: "transaction",
          amount: feeSol,
          timestamp: ts,
        });
      }

      // Determine label / program info for target
      const programInfo = KNOWN_PROGRAMS[targetAddress];
      const label = programInfo?.name ?? shortLabel(targetAddress);
      const nodeType: "wallet" | "program" | "token" = programInfo
        ? programInfo.category === "token"
          ? "token"
          : "program"
        : "wallet";
      const category = programInfo?.exchange ? "exchange" : nodeType;

      const result: InteractionDetail = {
        address: targetAddress,
        label,
        type: nodeType,
        category,
        programName: programInfo?.name,
        exchange: programInfo?.exchange,
        interactionCount: relevantTxs.length,
        totalSolTransferred: totalSol,
        lastInteraction: lastTs,
        transactions: relevantTxs.slice(0, 20),
      };

      await cache.set(cacheKey, result, 1 * 60 * 1000); // 1 minute
      return result;
    } catch (error) {
      console.error(
        `[BlockchainService] Failed to get interaction detail for ${targetAddress}:`,
        error,
      );
      throw new Error("Failed to fetch interaction detail");
    }
  }
}

export const blockchainService = new BlockchainService();
