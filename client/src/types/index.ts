export interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  logo: string;
  balance: number;
  decimals: number;
  usdValue: number;
  priceChange24h: number;
  tokenAccounts?: string[];
}

export interface PreviousToken {
  mint: string;
  symbol: string;
  name: string;
  logo: string;
  decimals: number;
  tokenAccounts: string[];
  reclaimableLamports: number;
  program: string;
  lastSeen?: number;
  source: "rent-account" | "history" | "both";
}

export interface TokenDetail {
  mint: string;
  symbol: string;
  name: string;
  logo: string;
  description: string;
  balance: number;
  decimals: number;
  usdValue: number;
  price: number;
  priceChange24h: number;
  priceHistory: { time: string; price: number }[];
  transactions: TokenTransaction[];
}

export interface TokenTransaction {
  signature: string;
  type: "buy" | "sell" | "transfer";
  amount: number;
  usdValue: number;
  timestamp: number;
  counterparty: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: "wallet" | "program" | "token";
  val: number;
  category?: "wallet" | "exchange" | "program" | "token";
  exchange?: string;
  programName?: string;
  interactions?: number;
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  label: string;
  value: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface InteractionDetail {
  address: string;
  label: string;
  type: "wallet" | "program" | "token";
  category?: "wallet" | "exchange" | "program" | "token";
  programName?: string;
  exchange?: string;
  interactionCount: number;
  totalSolTransferred: number;
  lastInteraction: number;
  transactions: {
    signature: string;
    type: string;
    amount: number;
    timestamp: number;
  }[];
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
    invested: number;
    current: number;
    pnl: number;
    pnlPercent: number;
  }[];
}
