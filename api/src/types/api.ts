// =============================================
// API Types
// Shared types for API responses and requests
// =============================================

export interface WalletSummary {
  address: string;
  solBalance: number;
  totalValue: number;
  tokens: TokenBalance[];
  previousTokens: PreviousToken[];
}

export interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  amount: number;
  decimals: number;
  usdValue: number;
  price: number;
  logoURI?: string;
}

export interface PreviousToken {
  mint: string;
  symbol: string;
  name: string;
  logoURI?: string;
  logo?: string;
  decimals: number;
  // Transaction history fields
  lastSeen: number; // unix timestamp of last tx
  totalReceived: number; // total amount ever received
  totalSent: number; // total amount ever sent
  txCount: number; // number of transactions involving this token
  // Legacy rent fields (kept for ReclaimRent compat)
  reclaimableLamports: number;
  tokenAccounts: string[];
  program: string;
  source: string;
  lastAmount?: number;
  lastValue?: number;
}

export interface WalletInteractions {
  address: string;
  interactions: InteractionDetail[];
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
  }>;
}

export interface TokenDetail {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  supply: number;
  price: number;
  priceChange24h: number;
  logoURI?: string;
  description?: string;
}

export interface PriceData {
  sol: {
    usdPrice: number;
    priceChange24h: number;
  };
  tokens: Record<
    string,
    {
      usdPrice: number;
      priceChange24h: number;
    }
  >;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
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
  label?: string;
}
