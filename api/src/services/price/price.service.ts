// =============================================
// Price Service
// Handles price data from DexScreener + Helius DAS
// =============================================

import { env } from "../../utils/env";
import { cache } from "../cache/cache.service";

// =============================================
// TYPES
// =============================================

interface DexScreenerPair {
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd: string;
  priceChange: {
    h24: number;
  };
  volume: {
    h24: number;
  };
  liquidity: {
    usd: number;
  };
}

interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[] | null;
}

// Helius DAS getAsset response (simplified)
interface HeliusDASAsset {
  id: string;
  content?: {
    metadata?: {
      name?: string;
      symbol?: string;
      description?: string;
    };
    links?: {
      image?: string;
    };
  };
  token_info?: {
    symbol?: string;
    decimals?: number;
  };
}

interface HeliusDASResponse {
  jsonrpc: string;
  id: string;
  result?: HeliusDASAsset;
  error?: { code: number; message: string };
}

// =============================================
// PRICE SERVICE
// =============================================

class PriceService {
  private readonly DEXSCREENER_BASE_URL = "https://api.dexscreener.com";

  // ------------------------------------------
  // fetchWithRetry — generic HTTP helper
  // ------------------------------------------

  private async fetchWithRetry<T>(
    url: string,
    options?: RequestInit,
  ): Promise<T> {
    const maxRetries = 3;
    let lastError: Error = new Error("Unknown error");

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError;
  }

  // ------------------------------------------
  // getSolPrice
  // ------------------------------------------

  async getSolPrice(): Promise<{ usdPrice: number; priceChange24h: number }> {
    const cacheKey = "sol_price";
    const cached = await cache.get<{
      usdPrice: number;
      priceChange24h: number;
    }>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry<DexScreenerResponse>(
        `${this.DEXSCREENER_BASE_URL}/latest/dex/tokens/So11111111111111111111111111111111111111112`,
      );

      const pairs = response.pairs ?? [];

      if (pairs.length === 0) {
        // Fallback: try a known SOL/USDC pair
        const fallbackResponse = await this.fetchWithRetry<DexScreenerResponse>(
          `${this.DEXSCREENER_BASE_URL}/latest/dex/pairs/solana/So11111111111111111111111111111111111111112-EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
        );

        const fallbackPairs = fallbackResponse.pairs ?? [];
        if (fallbackPairs.length > 0) {
          const pair = fallbackPairs[0]!;
          const result = {
            usdPrice: parseFloat(pair.priceUsd),
            priceChange24h: pair.priceChange.h24,
          };
          await cache.set(cacheKey, result, 60 * 1000);
          return result;
        }

        throw new Error("No SOL pairs found on DexScreener");
      }

      // Use the pair with highest liquidity
      const bestPair = pairs.sort(
        (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
      )[0];
      if (!bestPair) throw new Error("No pairs after sort");

      const result = {
        usdPrice: parseFloat(bestPair.priceUsd),
        priceChange24h: bestPair.priceChange?.h24 ?? 0,
      };

      await cache.set(cacheKey, result, 60 * 1000); // 1 minute cache
      return result;
    } catch (error) {
      console.error("[PriceService] Failed to get SOL price:", error);
      const fallback = { usdPrice: 150.0, priceChange24h: 0 };
      await cache.set(cacheKey, fallback, 60 * 1000);
      return fallback;
    }
  }

  // ------------------------------------------
  // getTokenPrices
  // ------------------------------------------

  async getTokenPrices(
    mints: string[],
  ): Promise<Record<string, { usdPrice: number; priceChange24h: number }>> {
    if (mints.length === 0) return {};

    const cacheKey = `token_prices_${mints.sort().join("_")}`;
    const cached =
      await cache.get<
        Record<string, { usdPrice: number; priceChange24h: number }>
      >(cacheKey);
    if (cached) return cached;

    const result: Record<string, { usdPrice: number; priceChange24h: number }> =
      {};

    for (const mint of mints) {
      try {
        const response = await this.fetchWithRetry<DexScreenerResponse>(
          `${this.DEXSCREENER_BASE_URL}/latest/dex/tokens/${mint}`,
        );

        const pairs = response.pairs ?? [];

        if (pairs.length > 0) {
          const bestPair = pairs.sort(
            (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
          )[0]!;
          result[mint] = {
            usdPrice: parseFloat(bestPair.priceUsd),
            priceChange24h: bestPair.priceChange?.h24 ?? 0,
          };
        } else {
          result[mint] = { usdPrice: 0, priceChange24h: 0 };
        }
      } catch (error) {
        console.warn(`[PriceService] Failed to get price for ${mint}:`, error);
        result[mint] = { usdPrice: 0, priceChange24h: 0 };
      }
    }

    await cache.set(cacheKey, result, 60 * 1000); // 1 minute cache
    return result;
  }

  // ------------------------------------------
  // getTokenMetadataHelius
  // Uses Helius DAS getAsset for richer metadata.
  // Cached for 24h.
  // ------------------------------------------

  async getTokenMetadataHelius(
    mint: string,
    apiKey: string,
  ): Promise<{
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
  } | null> {
    const cacheKey = `helius_metadata_${mint}`;
    const cached = await cache.get<{
      symbol: string;
      name: string;
      decimals: number;
      logoURI?: string;
    }>(cacheKey);
    if (cached) return cached;

    try {
      const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

      const body = {
        jsonrpc: "2.0",
        id: "sodash",
        method: "getAsset",
        params: { id: mint },
      };

      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Helius DAS error: HTTP ${response.status}`);
      }

      const data = (await response.json()) as HeliusDASResponse;

      if (data.error || !data.result) {
        return null;
      }

      const asset = data.result;
      const symbol =
        asset.token_info?.symbol ??
        asset.content?.metadata?.symbol ??
        "UNKNOWN";
      const name = asset.content?.metadata?.name ?? "Unknown Token";
      const decimals = asset.token_info?.decimals ?? 9;
      const logoURI = asset.content?.links?.image;

      const result = { symbol, name, decimals, logoURI };
      await cache.set(cacheKey, result, 24 * 60 * 60 * 1000); // 24h
      return result;
    } catch (error) {
      console.warn(
        `[PriceService] Helius DAS metadata failed for ${mint}:`,
        error,
      );
      return null;
    }
  }

  // ------------------------------------------
  // getTokenMetadata
  // Primary: Helius DAS (if key available) → Fallback: DexScreener
  // Helius is preferred because it reliably returns logoURI.
  // ------------------------------------------

  async getTokenMetadata(mint: string): Promise<{
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
  } | null> {
    const cacheKey = `token_metadata_${mint}`;
    const cached = await cache.get<{
      symbol: string;
      name: string;
      decimals: number;
      logoURI?: string;
    }>(cacheKey);
    if (cached) return cached;

    // Primary: Helius DAS (reliably returns logoURI + decimals)
    if (env.HELIUS_API_KEY) {
      try {
        const heliusResult = await this.getTokenMetadataHelius(
          mint,
          env.HELIUS_API_KEY,
        );
        if (heliusResult) {
          await cache.set(cacheKey, heliusResult, 24 * 60 * 60 * 1000); // 24h
          return heliusResult;
        }
      } catch (error) {
        console.warn(
          `[PriceService] Helius DAS metadata failed for ${mint}, falling back to DexScreener:`,
          error,
        );
      }
    }

    // Fallback: DexScreener (no logo or decimals, but covers unlisted tokens)
    try {
      const response = await this.fetchWithRetry<DexScreenerResponse>(
        `${this.DEXSCREENER_BASE_URL}/latest/dex/tokens/${mint}`,
      );

      const pairs = response.pairs ?? [];

      if (pairs.length > 0) {
        const bestPair = pairs.sort(
          (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
        )[0]!;

        const token =
          bestPair.baseToken.address === mint
            ? bestPair.baseToken
            : bestPair.quoteToken;

        const result = {
          symbol: token.symbol,
          name: token.name,
          decimals: 9, // DexScreener doesn't provide decimals
          logoURI: undefined as string | undefined,
        };

        await cache.set(cacheKey, result, 24 * 60 * 60 * 1000); // 24h
        return result;
      }
    } catch (error) {
      console.warn(
        `[PriceService] DexScreener metadata failed for ${mint}:`,
        error,
      );
    }

    return null;
  }

  // ------------------------------------------
  // getFullTokenInfo
  // Returns rich token metadata: logo, description,
  // price, decimals, market data. Cached 2 min.
  // ------------------------------------------

  async getFullTokenInfo(mint: string): Promise<{
    mint: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    description?: string;
    usdPrice: number;
    priceChange24h: number;
    volume24h?: number;
    liquidity?: number;
    fdv?: number;
    dexUrl?: string;
  } | null> {
    const cacheKey = `full_token_info_${mint}`;
    const cached = await cache.get<{
      mint: string;
      symbol: string;
      name: string;
      decimals: number;
      logoURI?: string;
      description?: string;
      usdPrice: number;
      priceChange24h: number;
      volume24h?: number;
      liquidity?: number;
      fdv?: number;
      dexUrl?: string;
    }>(cacheKey);
    if (cached) return cached;

    try {
      // Run all three data sources in parallel
      const [priceMap, heliusAsset, dexData] = await Promise.all([
        // (a) Price + 24h change from DexScreener via getTokenPrices
        this.getTokenPrices([mint]),

        // (b) Rich metadata from Helius DAS (logo, name, symbol, decimals, description)
        env.HELIUS_API_KEY
          ? (async () => {
              try {
                const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`;
                const body = {
                  jsonrpc: "2.0",
                  id: "sodash",
                  method: "getAsset",
                  params: { id: mint },
                };
                const response = await fetch(rpcUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                if (!response.ok) return null;
                const data = (await response.json()) as HeliusDASResponse;
                return data.error || !data.result ? null : data.result;
              } catch {
                return null;
              }
            })()
          : Promise.resolve(null),

        // (c) Market data from DexScreener (volume, liquidity, fdv, logo fallback)
        (async () => {
          try {
            return await this.fetchWithRetry<DexScreenerResponse>(
              `${this.DEXSCREENER_BASE_URL}/latest/dex/tokens/${mint}`,
            );
          } catch {
            return null;
          }
        })(),
      ]);

      // --- Price data (from getTokenPrices → DexScreener) ---
      const priceData = priceMap[mint] ?? { usdPrice: 0, priceChange24h: 0 };

      // --- Helius DAS: symbol, name, decimals, logo, description ---
      let symbol = "UNKNOWN";
      let name = "Unknown Token";
      let decimals = 9;
      let logoURI: string | undefined;
      let description: string | undefined;

      if (heliusAsset) {
        symbol =
          heliusAsset.token_info?.symbol ??
          heliusAsset.content?.metadata?.symbol ??
          "UNKNOWN";
        name = heliusAsset.content?.metadata?.name ?? "Unknown Token";
        decimals = heliusAsset.token_info?.decimals ?? 9;
        logoURI = heliusAsset.content?.links?.image;
        description = heliusAsset.content?.metadata?.description;
      }

      // --- DexScreener: market data + logo/name/symbol fallback ---
      let volume24h: number | undefined;
      let liquidity: number | undefined;
      let fdv: number | undefined;

      const dexPairs = dexData?.pairs ?? [];
      if (dexPairs.length > 0) {
        const bestPair = dexPairs.sort(
          (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
        )[0]!;

        volume24h = bestPair.volume?.h24;
        liquidity = bestPair.liquidity?.usd;
        // fdv not in current DexScreenerPair type; safe cast via unknown
        fdv = (bestPair as unknown as { fdv?: number }).fdv;

        // Fallback for name/symbol if Helius returned nothing
        if (symbol === "UNKNOWN" || name === "Unknown Token") {
          const dexToken =
            bestPair.baseToken.address === mint
              ? bestPair.baseToken
              : bestPair.quoteToken;
          if (symbol === "UNKNOWN") symbol = dexToken.symbol;
          if (name === "Unknown Token") name = dexToken.name;
        }

        // Logo fallback: DexScreener pairs don't carry images,
        // but keep logoURI from Helius if available.
      }

      // --- Build smart description fallback if none found ---
      if (!description) {
        description = `${name} (${symbol}) is a token on the Solana blockchain.`;
      }

      const result = {
        mint,
        symbol,
        name,
        decimals,
        logoURI,
        description,
        usdPrice: priceData.usdPrice,
        priceChange24h: priceData.priceChange24h,
        volume24h,
        liquidity,
        fdv,
        dexUrl: `https://dexscreener.com/solana/${mint}`,
      };

      await cache.set(cacheKey, result, 2 * 60 * 1000); // 2 min TTL
      return result;
    } catch (error) {
      console.error(
        `[PriceService] getFullTokenInfo failed for ${mint}:`,
        error,
      );
      return null;
    }
  }
}

export const priceService = new PriceService();
