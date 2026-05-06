import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import type {
  BalanceSnapshot,
  GraphData,
  InteractionDetail,
  PnLData,
  PreviousToken,
  RentAccount,
  TokenBalance,
  TokenDetail,
  TokenTransaction,
} from "../types";

const DEFAULT_RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";
const RPC_ENDPOINT = import.meta.env.VITE_SOLANA_RPC_URL || DEFAULT_RPC_ENDPOINT;
const JUPITER_API_KEY = import.meta.env.VITE_JUPITER_API_KEY || "";
const JUPITER_BASE_URL = JUPITER_API_KEY ? "https://api.jup.ag" : "https://lite-api.jup.ag";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";
const LAMPORTS_PER_SOL = 1_000_000_000;
const PROGRAM_LABELS: Record<string, { name: string; category: "exchange" | "program" | "token" }> = {
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: { name: "Jupiter", category: "exchange" },
  JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB: { name: "Jupiter", category: "exchange" },
  "675kPX9MHTjS2zt1qfr1NY1kZ4oK8szXhD7xPvSXbMp8": { name: "Raydium AMM", category: "exchange" },
  CAMMCzo5YL8w4VFF8KVHrK22GGUQp5Y5f9iRBf1mb9j: { name: "Raydium CLMM", category: "exchange" },
  whirLbMiicVdio4qvUfM5KAg6Ct8Vccgm7pCAzs4mb: { name: "Orca Whirlpool", category: "exchange" },
  Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB: { name: "Meteora", category: "exchange" },
  PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY: { name: "Phoenix", category: "exchange" },
  srmqPvymJeFKQ4z4b6iXKnZcB5VYb1W4c9JtY8hM6b6: { name: "OpenBook", category: "exchange" },
  "6EF8rrecthR5DkQX5W7FduXWnP6r6c5qHhGkAUR8pump": { name: "Pump.fun", category: "exchange" },
  [TOKEN_PROGRAM_ID.toBase58()]: { name: "SPL Token", category: "token" },
  [TOKEN_2022_PROGRAM_ID.toBase58()]: { name: "Token-2022", category: "token" },
  [SystemProgram.programId.toBase58()]: { name: "System Program", category: "program" },
};

export const connection = new Connection(RPC_ENDPOINT, "confirmed");
export const tokenProgramIds = [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID];

type JupiterPrice = {
  usdPrice?: number;
  priceChange24h?: number;
  blockId?: number;
};

type JupiterToken = {
  id?: string;
  address?: string;
  name?: string;
  symbol?: string;
  icon?: string;
  logoURI?: string;
  decimals?: number;
  usdPrice?: number;
};

type ParsedTokenAccount = {
  pubkey: PublicKey;
  account: {
    lamports: number;
    owner: PublicKey;
    data: {
      parsed?: {
        info?: {
          mint?: string;
          owner?: string;
          state?: string;
          tokenAmount?: {
            amount?: string;
            decimals?: number;
            uiAmount?: number | null;
            uiAmountString?: string;
          };
        };
      };
    };
  };
};

function headers() {
  return JUPITER_API_KEY ? { "x-api-key": JUPITER_API_KEY } : undefined;
}

function shortAddress(address: string, head = 4, tail = 4) {
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

function numberFromUiAmount(value?: string | number | null) {
  if (value === undefined || value === null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getKnownProgram(address: string) {
  return PROGRAM_LABELS[address];
}

function getNodeType(address: string, executable = false): GraphData["nodes"][number]["type"] {
  const known = getKnownProgram(address);
  if (known?.category === "token") return "token";
  if (known || executable) return "program";
  return "wallet";
}

function getNodeLabel(address: string) {
  return getKnownProgram(address)?.name || shortAddress(address, 5, 5);
}

async function getRecentParsedTransactions(publicKey: PublicKey, limit = 40) {
  const signatures = await connection.getSignaturesForAddress(publicKey, { limit });
  const transactions = await Promise.all(
    signatures.map((signature) =>
      connection.getParsedTransaction(signature.signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      })
    )
  );

  return signatures.map((signature, index) => ({
    signature,
    transaction: transactions[index],
  }));
}

async function getOwnedTokenAccounts(publicKey: PublicKey): Promise<ParsedTokenAccount[]> {
  const accountGroups = await Promise.all(
    tokenProgramIds.map((programId) =>
      connection.getParsedTokenAccountsByOwner(publicKey, { programId })
    )
  );

  return accountGroups.flatMap((group) => group.value as ParsedTokenAccount[]);
}

async function getPrices(mints: string[]): Promise<Record<string, JupiterPrice>> {
  const uniqueMints = [...new Set(mints)].filter(Boolean).slice(0, 50);
  if (uniqueMints.length === 0) return {};

  try {
    const response = await fetch(
      `${JUPITER_BASE_URL}/price/v3?ids=${encodeURIComponent(uniqueMints.join(","))}`,
      { headers: headers() }
    );
    if (!response.ok) return {};
    return await response.json();
  } catch (error) {
    console.warn("Price fetch failed:", error);
    return {};
  }
}

async function getTokenMetadata(mints: string[]): Promise<Record<string, JupiterToken>> {
  const uniqueMints = [...new Set(mints)].filter(Boolean).slice(0, 100);
  if (uniqueMints.length === 0) return {};

  try {
    const response = await fetch(
      `${JUPITER_BASE_URL}/tokens/v2/search?query=${encodeURIComponent(uniqueMints.join(","))}`,
      { headers: headers() }
    );
    if (!response.ok) return {};
    const tokens = (await response.json()) as JupiterToken[];
    return tokens.reduce<Record<string, JupiterToken>>((acc, token) => {
      const mint = token.id || token.address;
      if (mint) acc[mint] = token;
      return acc;
    }, {});
  } catch (error) {
    console.warn("Token metadata fetch failed:", error);
    return {};
  }
}

export async function getWalletBalance(publicKey: PublicKey): Promise<number> {
  const balance = await connection.getBalance(publicKey, "confirmed");
  return balance / LAMPORTS_PER_SOL;
}

export async function getSolPrice(): Promise<JupiterPrice> {
  const prices = await getPrices([WRAPPED_SOL_MINT]);
  return prices[WRAPPED_SOL_MINT] || {};
}

export async function getTokenBalances(publicKey: PublicKey): Promise<TokenBalance[]> {
  try {
    const accounts = await getOwnedTokenAccounts(publicKey);
    const grouped = new Map<string, TokenBalance>();

    for (const tokenAccount of accounts) {
      const info = tokenAccount.account.data.parsed?.info;
      const mint = info?.mint;
      const amount = info?.tokenAmount;
      if (!mint || !amount) continue;

      const balance = numberFromUiAmount(amount.uiAmountString ?? amount.uiAmount);
      if (balance <= 0) continue;

      const existing = grouped.get(mint);
      if (existing) {
        existing.balance += balance;
      } else {
        grouped.set(mint, {
          mint,
          symbol: shortAddress(mint),
          name: `Token ${shortAddress(mint, 6, 6)}`,
          logo: "",
          balance,
          decimals: amount.decimals ?? 0,
          usdValue: 0,
          priceChange24h: 0,
          tokenAccounts: [tokenAccount.pubkey.toBase58()],
        });
      }
    }

    const tokens = [...grouped.values()];
    const [prices, metadata] = await Promise.all([
      getPrices(tokens.map((token) => token.mint)),
      getTokenMetadata(tokens.map((token) => token.mint)),
    ]);

    return tokens
      .map((token) => {
        const price = prices[token.mint]?.usdPrice ?? metadata[token.mint]?.usdPrice ?? 0;
        const meta = metadata[token.mint];
        return {
          ...token,
          symbol: meta?.symbol || token.symbol,
          name: meta?.name || token.name,
          logo: meta?.icon || meta?.logoURI || token.logo,
          decimals: meta?.decimals ?? token.decimals,
          usdValue: token.balance * price,
          priceChange24h: prices[token.mint]?.priceChange24h ?? 0,
        };
      })
      .sort((a, b) => b.usdValue - a.usdValue);
  } catch (error) {
    console.error("Error fetching token balances:", error);
    return [];
  }
}

export async function getPreviousTokens(publicKey: PublicKey): Promise<PreviousToken[]> {
  try {
    const accounts = await getOwnedTokenAccounts(publicKey);
    const grouped = new Map<string, PreviousToken>();

    for (const tokenAccount of accounts) {
      const info = tokenAccount.account.data.parsed?.info;
      const mint = info?.mint;
      const amount = info?.tokenAmount;
      if (!mint || !amount) continue;

      const balance = numberFromUiAmount(amount.uiAmountString ?? amount.uiAmount);
      const programId = tokenAccount.account.owner.toBase58();
      if (balance > 0 || info?.state !== "initialized") continue;

      const existing = grouped.get(mint);
      if (existing) {
        existing.tokenAccounts.push(tokenAccount.pubkey.toBase58());
        existing.reclaimableLamports += tokenAccount.account.lamports;
      } else {
        grouped.set(mint, {
          mint,
          symbol: shortAddress(mint),
          name: `Previous token ${shortAddress(mint, 6, 6)}`,
          logo: "",
          decimals: amount.decimals ?? 0,
          tokenAccounts: [tokenAccount.pubkey.toBase58()],
          reclaimableLamports: tokenAccount.account.lamports,
          program: programId === TOKEN_2022_PROGRAM_ID.toBase58() ? "Token-2022" : "SPL Token",
          source: "rent-account",
        });
      }
    }

    const currentTokens = new Set((await getTokenBalances(publicKey)).map((token) => token.mint));
    const owner = publicKey.toBase58();
    const recentTransactions = await getRecentParsedTransactions(publicKey, 80);

    for (const { signature, transaction } of recentTransactions) {
      if (!transaction?.meta) continue;
      const balances = [
        ...(transaction.meta.preTokenBalances || []),
        ...(transaction.meta.postTokenBalances || []),
      ].filter((balance) => balance.owner === owner && !currentTokens.has(balance.mint));

      for (const balance of balances) {
        const mint = balance.mint;
        const existing = grouped.get(mint);
        if (existing) {
          existing.lastSeen = Math.max(existing.lastSeen || 0, signature.blockTime || 0);
          existing.source = existing.source === "rent-account" ? "both" : existing.source;
        } else {
          grouped.set(mint, {
            mint,
            symbol: shortAddress(mint),
            name: `Previous token ${shortAddress(mint, 6, 6)}`,
            logo: "",
            decimals: balance.uiTokenAmount.decimals,
            tokenAccounts: [],
            reclaimableLamports: 0,
            program: "Historical",
            lastSeen: signature.blockTime || 0,
            source: "history",
          });
        }
      }
    }

    const previousTokens = [...grouped.values()];
    const metadata = await getTokenMetadata(previousTokens.map((token) => token.mint));

    return previousTokens
      .map((token) => {
        const meta = metadata[token.mint];
        return {
          ...token,
          symbol: meta?.symbol || token.symbol,
          name: meta?.name || token.name,
          logo: meta?.icon || meta?.logoURI || token.logo,
          decimals: meta?.decimals ?? token.decimals,
        };
      })
      .sort((a, b) => b.reclaimableLamports - a.reclaimableLamports);
  } catch (error) {
    console.error("Error fetching previous tokens:", error);
    return [];
  }
}

export async function getTokenDetail(
  mint: string,
  publicKey: PublicKey
): Promise<TokenDetail | null> {
  const [tokenBalances, transactions] = await Promise.all([
    getTokenBalances(publicKey),
    getTokenTransactions(mint, publicKey),
  ]);
  const token = tokenBalances.find((item) => item.mint === mint);
  if (!token) return null;

  const price = token.balance > 0 ? token.usdValue / token.balance : 0;
  const priceHistory = buildTokenHistory(price, token.priceChange24h);

  return {
    ...token,
    description: `Live wallet position for mint ${mint}. Prices are best-effort from Jupiter when available.`,
    price,
    priceHistory,
    transactions: transactions.map((transaction) => ({
      ...transaction,
      usdValue: transaction.amount * price,
    })),
  };
}

async function getTokenTransactions(mint: string, publicKey: PublicKey): Promise<TokenTransaction[]> {
  try {
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 50 });
    const transactions = await Promise.all(
      signatures.slice(0, 25).map((signature) =>
        connection.getParsedTransaction(signature.signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        })
      )
    );

    const rows: Array<TokenTransaction | null> = transactions.map((transaction, index) => {
        if (!transaction?.meta) return null;
        const owner = publicKey.toBase58();
        const pre = transaction.meta.preTokenBalances?.find(
          (balance) => balance.mint === mint && balance.owner === owner
        );
        const post = transaction.meta.postTokenBalances?.find(
          (balance) => balance.mint === mint && balance.owner === owner
        );
        if (!pre && !post) return null;

        const preAmount = numberFromUiAmount(pre?.uiTokenAmount.uiAmountString);
        const postAmount = numberFromUiAmount(post?.uiTokenAmount.uiAmountString);
        const delta = postAmount - preAmount;
        if (delta === 0) return null;

        const accountKeys = transaction.transaction.message.accountKeys.map((key) =>
          key.pubkey.toBase58()
        );
        const counterparty =
          accountKeys.find((key) => key !== owner && key !== mint) || SystemProgram.programId.toBase58();
        const type = delta > 0 ? "buy" : "sell";

        const row: TokenTransaction = {
          signature: signatures[index].signature,
          type,
          amount: Math.abs(delta),
          usdValue: 0,
          timestamp: signatures[index].blockTime || transaction.blockTime || 0,
          counterparty,
        };
        return row;
      });

    return rows.filter((transaction): transaction is TokenTransaction => transaction !== null);
  } catch (error) {
    console.error("Error fetching token transactions:", error);
    return [];
  }
}

export async function getAddressInteractions(publicKey: PublicKey): Promise<GraphData> {
  try {
    const owner = publicKey.toBase58();
    const recentTransactions = await getRecentParsedTransactions(publicKey, 65);
    const nodes = new Map<string, GraphData["nodes"][number]>();
    const links = new Map<string, GraphData["links"][number]>();

    nodes.set(owner, {
      id: owner,
      label: "You",
      type: "wallet",
      category: "wallet",
      val: 14,
    });

    for (const { transaction } of recentTransactions) {
      if (!transaction) continue;
      const keys = transaction.transaction.message.accountKeys;
      for (const key of keys) {
        const address = key.pubkey.toBase58();
        if (address === owner) continue;

        const known = getKnownProgram(address);
        const isProgram = Boolean(known) || (key.signer === false && key.writable === false);
        const category = known?.category || (isProgram ? "program" : "wallet");
        const type = getNodeType(address, isProgram);
        const existing = nodes.get(address);
        nodes.set(address, {
          id: address,
          label: getNodeLabel(address),
          type,
          category,
          exchange: category === "exchange" ? known?.name : undefined,
          programName: known?.name,
          val: existing ? Math.min(existing.val + 1, 18) : category === "exchange" ? 9 : type === "program" ? 6 : 4,
        });

        const linkId = `${owner}-${address}`;
        const existingLink = links.get(linkId);
        links.set(linkId, {
          source: owner,
          target: address,
          label: "interaction",
          value: existingLink ? existingLink.value + 1 : 1,
        });
      }
    }

    const sortedNodes = [...nodes.values()].sort((a, b) => {
      if (a.id === owner) return -1;
      if (b.id === owner) return 1;
      return (b.val || 0) - (a.val || 0);
    });
    const nonOwnerNodes = sortedNodes.filter((node) => node.id !== owner).slice(0, 33);
    const exchangeNodes = nonOwnerNodes.filter((node) => node.category === "exchange");
    const walletNodes = nonOwnerNodes.filter((node) => node.category === "wallet");
    const programNodes = nonOwnerNodes.filter((node) => node.category === "program");
    const tokenNodes = nonOwnerNodes.filter((node) => node.category === "token");
    const orderedNodes = [...exchangeNodes, ...walletNodes, ...programNodes, ...tokenNodes];
    const visibleIds = new Set([owner, ...orderedNodes.map((node) => node.id)]);
    const placeNode = (
      node: GraphData["nodes"][number],
      index: number,
      count: number,
      ring: number,
      angleOffset: number
    ) => {
      const angle = angleOffset + (index / Math.max(1, count)) * Math.PI * 2;
      return {
        ...node,
        interactions: node.val,
        x: Math.cos(angle) * ring,
        y: Math.sin(angle) * ring,
      };
    };

    const visibleNodes = [
      { ...nodes.get(owner)!, x: 0, y: 0, interactions: nodes.get(owner)!.val },
      ...exchangeNodes.map((node, index) => placeNode(node, index, exchangeNodes.length, 155, -Math.PI / 2)),
      ...walletNodes.map((node, index) => placeNode(node, index, walletNodes.length, 260, -Math.PI / 5)),
      ...programNodes.map((node, index) => placeNode(node, index, programNodes.length, 365, -Math.PI / 3)),
      ...tokenNodes.map((node, index) => placeNode(node, index, tokenNodes.length, 455, Math.PI / 6)),
    ];
    const visibleLinks = [...links.values()]
      .filter((link) => visibleIds.has(String(link.source)) && visibleIds.has(String(link.target)))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50);

    return { nodes: visibleNodes, links: visibleLinks };
  } catch (error) {
    console.error("Error fetching interactions:", error);
    return { nodes: [], links: [] };
  }
}

export async function getInteractionDetail(
  address: string,
  publicKey: PublicKey
): Promise<InteractionDetail | null> {
  try {
    const owner = publicKey.toBase58();
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 60 });
    const rows = [];
    let totalLamports = 0;

    for (const signature of signatures.slice(0, 30)) {
      const transaction = await connection.getParsedTransaction(signature.signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!transaction?.meta) continue;

      const keys = transaction.transaction.message.accountKeys.map((key) => key.pubkey.toBase58());
      if (!keys.includes(address)) continue;

      const ownerIndex = keys.indexOf(owner);
      const addressIndex = keys.indexOf(address);
      const preOwner = ownerIndex >= 0 ? transaction.meta.preBalances[ownerIndex] : 0;
      const postOwner = ownerIndex >= 0 ? transaction.meta.postBalances[ownerIndex] : 0;
      const preAddress = addressIndex >= 0 ? transaction.meta.preBalances[addressIndex] : 0;
      const postAddress = addressIndex >= 0 ? transaction.meta.postBalances[addressIndex] : 0;
      const lamportDelta = Math.max(Math.abs(postOwner - preOwner), Math.abs(postAddress - preAddress));

      totalLamports += lamportDelta;
      rows.push({
        signature: signature.signature,
        type: lamportDelta > 0 ? "transfer" : "program call",
        amount: lamportDelta / LAMPORTS_PER_SOL,
        timestamp: signature.blockTime || transaction.blockTime || 0,
      });
    }

    const account = await connection.getAccountInfo(new PublicKey(address), "confirmed");
    const known = getKnownProgram(address);
    const category = known?.category || (account?.executable ? "program" : "wallet");
    return {
      address,
      label: known?.name || shortAddress(address, 8, 8),
      type: getNodeType(address, Boolean(account?.executable)),
      category,
      programName: known?.name,
      exchange: category === "exchange" ? known?.name : undefined,
      interactionCount: rows.length,
      totalSolTransferred: totalLamports / LAMPORTS_PER_SOL,
      lastInteraction: rows[0]?.timestamp || 0,
      transactions: rows,
    };
  } catch (error) {
    console.error("Error fetching interaction detail:", error);
    return null;
  }
}

export async function getRentAccounts(publicKey: PublicKey): Promise<RentAccount[]> {
  try {
    const accounts = await getOwnedTokenAccounts(publicKey);
    return accounts
      .map((account) => {
        const parsed = account.account.data.parsed?.info;
        const amount = numberFromUiAmount(parsed?.tokenAmount?.uiAmountString);
        const programId = account.account.owner.toBase58();

        return {
          address: account.pubkey.toBase58(),
          mint: parsed?.mint || "",
          lamports: account.account.lamports,
          dataLength: 165,
          rentExemptMinimum: account.account.lamports,
          reclaimable: amount === 0 && parsed?.state === "initialized",
          program: programId === TOKEN_2022_PROGRAM_ID.toBase58() ? "Token-2022" : "SPL Token",
          programId,
        };
      })
      .sort((a, b) => Number(b.reclaimable) - Number(a.reclaimable));
  } catch (error) {
    console.error("Error fetching rent accounts:", error);
    return [];
  }
}

export function createCloseTokenAccountTransaction(
  publicKey: PublicKey,
  accountAddress: string,
  programId: string
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
    data: Buffer.from([9]),
  });

  return new Transaction().add(closeInstruction);
}

export async function getBalanceHistory(publicKey: PublicKey): Promise<BalanceSnapshot[]> {
  const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 80 });
  const currentBalance = await getWalletBalance(publicKey);
  const now = new Date();
  const buckets = new Map<string, number>();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 86_400_000).toISOString().split("T")[0];
    buckets.set(date, currentBalance);
  }

  for (const signature of signatures) {
    if (!signature.blockTime) continue;
    const date = new Date(signature.blockTime * 1000).toISOString().split("T")[0];
    if (!buckets.has(date)) continue;
    buckets.set(date, currentBalance);
  }

  return [...buckets.entries()].map(([date, balance]) => ({ date, balance }));
}

export async function getPnLData(publicKey: PublicKey): Promise<PnLData> {
  const [tokens, solBalance, solPrice] = await Promise.all([
    getTokenBalances(publicKey),
    getWalletBalance(publicKey),
    getSolPrice(),
  ]);
  const solCurrent = solBalance * (solPrice.usdPrice || 0);
  const solPrevious = solPrice.priceChange24h
    ? solCurrent / (1 + solPrice.priceChange24h / 100)
    : solCurrent;
  const byToken = [
    {
      mint: WRAPPED_SOL_MINT,
      symbol: "SOL",
      invested: solPrevious,
      current: solCurrent,
      pnl: solCurrent - solPrevious,
      pnlPercent: solPrevious > 0 ? ((solCurrent - solPrevious) / solPrevious) * 100 : 0,
    },
    ...tokens.map((token) => {
      const previousValue = token.priceChange24h
        ? token.usdValue / (1 + token.priceChange24h / 100)
        : token.usdValue;
      const pnl = token.usdValue - previousValue;
      return {
        mint: token.mint,
        symbol: token.symbol,
        invested: previousValue,
        current: token.usdValue,
        pnl,
        pnlPercent: previousValue > 0 ? (pnl / previousValue) * 100 : 0,
      };
    }),
  ].filter((token) => token.current > 0 || token.invested > 0);

  const totalInvested = byToken.reduce((sum, token) => sum + token.invested, 0);
  const currentValue = byToken.reduce((sum, token) => sum + token.current, 0);
  const totalPnL = currentValue - totalInvested;
  const pnlPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  return { totalInvested, currentValue, totalPnL, pnlPercent, byToken };
}

function buildTokenHistory(currentPrice: number, priceChange24h: number) {
  if (!currentPrice) return [];
  const history = [];
  const startPrice = priceChange24h ? currentPrice / (1 + priceChange24h / 100) : currentPrice;

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
