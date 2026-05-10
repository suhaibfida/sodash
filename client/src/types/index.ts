// =============================================
// Frontend Types
// Consistent with backend API responses AND
// what frontend components actually consume.
// =============================================

export interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  /** Raw token amount (what the backend sends as `amount`) */
  amount: number;
  /** Alias for `amount` — used by Dashboard / TokenDetailModal */
  balance: number;
  decimals: number;
  usdValue: number;
  price: number;
  priceChange24h: number;
  logoURI?: string;
  /** Alias for `logoURI` — used by Dashboard / CoinDetail */
  logo?: string;
}

export interface PreviousToken {
  mint: string;
  symbol: string;
  name: string;
  logo?: string;
  logoURI?: string;
  decimals: number;
  source: string;
  // Transaction history fields (from Helius enhanced tx API)
  lastSeen: number; // unix timestamp of last interaction
  totalReceived: number; // total tokens received across all txs
  totalSent: number; // total tokens sent
  txCount: number; // how many txs touched this token
  // Legacy/compat fields
  reclaimableLamports: number;
  tokenAccounts: string[];
  program: string;
  lastAmount?: number;
  lastValue?: number;
}

export interface TokenDetail {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  supply?: number;
  price: number;
  priceChange24h: number;
  logoURI?: string;
  /** Alias for `logoURI` — used by TokenDetailModal / CoinDetail */
  logo?: string;
  description?: string;
  /** Token amount held in the wallet */
  balance: number;
  usdValue: number;
  priceHistory: Array<{ time: string; price: number }>;
  transactions: Array<{
    signature: string;
    type: "buy" | "sell" | "transfer";
    amount: number;
    usdValue: number;
    timestamp: number;
    counterparty?: string;
  }>;
}

export interface GraphNode {
  id: string;
  label: string;
  type: "wallet" | "program" | "token";
  category?: string;
  val?: number;
  x?: number;
  y?: number;
  exchange?: string;
  programName?: string;
  value?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  sol?: number;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface InteractionDetail {
  address: string;
  label: string;
  type: "wallet" | "program" | "token";
  category: string;
  programName?: string;
  exchange?: string;
  interactionCount: number;
  totalSolTransferred: number;
  lastInteraction: number;
  transactions: Array<{
    signature: string;
    type: string;
    amount: number;
    timestamp: number;
    tokenAmount?: number;
    tokenMint?: string;
    tokenDecimals?: number;
    tokenSymbol?: string;
  }>;
}

export interface RentAccount {
  address: string;
  mint: string;
  lamports: number;
  dataLength: number;
  rentExemptMinimum: number;
  reclaimable: boolean;
  program: string;
  programId: string;
}

export interface WalletSummary {
  address: string;
  solBalance: number;
  totalValue: number;
  tokens: TokenBalance[];
  previousTokens: PreviousToken[];
}

export interface WalletInteractions {
  address: string;
  interactions: InteractionDetail[];
}

export interface SolPrice {
  usdPrice: number;
  priceChange24h: number;
}

export interface TokenPrice {
  usdPrice: number;
  priceChange24h: number;
}

export interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface BalanceSnapshot {
  date: string;
  balance: number;
}

export interface PnLData {
  totalInvested: number;
  currentValue: number;
  totalPnL: number;
  pnlPercent: number;
  byToken: {
    mint: string;
    symbol: string;
    logo?: string;
    invested: number;
    current: number;
    pnl: number;
    pnlPercent: number;
  }[];
}
