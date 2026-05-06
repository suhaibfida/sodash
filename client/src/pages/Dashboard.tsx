import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Link } from "react-router-dom";
import { ArrowRight, History, TrendingUp, TrendingDown, Wallet, Coins, DollarSign } from "lucide-react";
import { getPreviousTokens, getSolPrice, getWalletBalance, getTokenBalances } from "../lib/solana";
import type { PreviousToken, TokenBalance } from "../types";

const Dashboard = () => {
  const { publicKey, connected } = useWallet();
  const [solBalance, setSolBalance] = useState<number>(0);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [previousTokens, setPreviousTokens] = useState<PreviousToken[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey || !connected) {
      setSolBalance(0);
      setSolPrice(0);
      setTokens([]);
      setPreviousTokens([]);
      return;
    }

    let active = true;
    const loadPortfolio = () => {
      setLoading(true);
      Promise.all([
        getWalletBalance(publicKey),
        getTokenBalances(publicKey),
        getPreviousTokens(publicKey),
        getSolPrice(),
      ]).then(([bal, toks, previous, sol]) => {
        if (!active) return;
        setSolBalance(bal);
        setTokens(toks);
        setPreviousTokens(previous);
        setSolPrice(sol.usdPrice || 0);
        setLoading(false);
      }).catch(() => {
        if (active) setLoading(false);
      });
    };

    loadPortfolio();
    const interval = window.setInterval(loadPortfolio, 20_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [publicKey, connected]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-purple-500/25">
          <Wallet size={48} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white">Sodash</h1>
        <p className="text-gray-400 text-lg max-w-md text-center">
          Connect your Solana wallet to view your portfolio, track interactions, and reclaim rent.
        </p>
        <div className="mt-4 px-6 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-gray-300 text-sm">
          Use the wallet button in the top right to connect
        </div>
      </div>
    );
  }

  const totalValue = solBalance * solPrice + tokens.reduce((sum, t) => sum + t.usdValue, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">
          Your Solana portfolio overview
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <DollarSign size={20} className="text-purple-400" />
            </div>
            <span className="text-gray-400 text-sm">Total Value</span>
          </div>
          <p className="text-3xl font-bold text-white">${totalValue.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
              <Coins size={20} className="text-indigo-400" />
            </div>
            <span className="text-gray-400 text-sm">SOL Balance</span>
          </div>
          <p className="text-3xl font-bold text-white">{solBalance.toFixed(4)} SOL</p>
          <p className="text-gray-500 text-sm">${(solBalance * solPrice).toFixed(2)}</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Wallet size={20} className="text-blue-400" />
            </div>
            <span className="text-gray-400 text-sm">Tokens</span>
          </div>
          <p className="text-3xl font-bold text-white">{tokens.length}</p>
          <p className="text-gray-500 text-sm">{previousTokens.length} previous</p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Your Tokens</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-3" />
              <div className="h-8 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Coins size={48} className="mx-auto mb-4 opacity-50" />
          <p>No tokens found in your wallet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tokens.map((token) => (
            <Link
              key={token.mint}
              to={`/token/${token.mint}`}
              className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 hover:bg-gray-800/50 hover:border-purple-600/30 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                    {token.logo ? (
                      <img src={token.logo} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      token.symbol.slice(0, 2)
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm group-hover:text-purple-300 transition-colors">
                      {token.symbol}
                    </p>
                    <p className="text-gray-500 text-xs">{token.name}</p>
                  </div>
                </div>
                {token.priceChange24h !== 0 && (
                  <div
                    className={`flex items-center gap-1 text-xs font-medium ${
                      token.priceChange24h >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {token.priceChange24h >= 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    {Math.abs(token.priceChange24h).toFixed(2)}%
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">
                  {token.balance.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}
                </p>
                <p className="text-gray-400 text-sm">
                  ${token.usdValue.toFixed(2)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-10 mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Previous Tokens</h2>
          <p className="text-sm text-gray-500">
            Zero-balance token accounts from tokens you previously held
          </p>
        </div>
        <Link
          to="/reclaim"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:border-purple-500/40 hover:text-white"
        >
          Reclaim rent
          <ArrowRight size={14} />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-gray-800 bg-gray-900/50 animate-pulse" />
          ))}
        </div>
      ) : previousTokens.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 px-5 py-8 text-center text-gray-500">
          <History size={34} className="mx-auto mb-3 opacity-60" />
          <p>No previous tokens found in open accounts or recent RPC history</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {previousTokens.slice(0, 12).map((token) => (
            <div
              key={token.mint}
              className="flex items-center justify-between gap-4 rounded-lg border border-gray-800 bg-gray-900/50 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-gray-300">
                  {token.logo ? (
                    <img src={token.logo} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    token.symbol.slice(0, 2)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{token.symbol}</p>
                  <p className="truncate text-xs text-gray-500">{token.name}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-purple-300">
                  {(token.reclaimableLamports / 1e9).toFixed(5)} SOL
                </p>
                <p className="text-xs text-gray-500">
                  {token.source === "history"
                    ? token.lastSeen
                      ? new Date(token.lastSeen * 1000).toLocaleDateString()
                      : "seen in history"
                    : `${token.tokenAccounts.length} account(s)`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
