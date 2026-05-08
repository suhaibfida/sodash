import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { getTokenDetail } from "../lib/solana";
import type { TokenDetail } from "../types";

const CoinDetail = () => {
  const { mint } = useParams<{ mint: string }>();
  const { publicKey } = useWallet();
  const [token, setToken] = useState<TokenDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mint || !publicKey) {
      setToken(null);
      setLoading(false);
      return;
    }

    let active = true;
    const loadToken = () => {
      setLoading(true);
      getTokenDetail(mint, publicKey).then((detail) => {
        if (!active) return;
        setToken(detail);
        setLoading(false);
      });
    };

    loadToken();
    const interval = window.setInterval(loadToken, 30_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [mint, publicKey]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-700 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-400">Token not found</p>
        <Link to="/" className="text-purple-400 hover:text-purple-300 mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
      <div className="coin-shell max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-2">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-gray-400 hover:text-white mb-3 transition-colors text-xs"
      >
        <ArrowLeft size={14} />
        Back
      </Link>

        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-2.5 mb-3">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {token.logo ? (
              <img src={token.logo} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              token.symbol.slice(0, 2)
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-white">{token.name}</h1>
            <p className="text-gray-400 text-xs">{token.symbol}</p>
          </div>
          <div className="text-right ml-auto">
            <p className="text-sm font-bold text-white">
              ${token.price.toFixed(4)}
            </p>
            <div
              className={`flex items-center gap-0.5 justify-end text-xs font-medium ${
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
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <div className="bg-gray-800/50 rounded-lg p-2">
            <p className="text-gray-400 text-[9px] mb-0.5">Balance</p>
            <p className="text-white font-semibold text-xs">
              {token.balance.toLocaleString(undefined, { maximumFractionDigits: 3 })}
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <p className="text-gray-400 text-[9px] mb-0.5">Value</p>
            <p className="text-white font-semibold text-xs">${token.usdValue.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <p className="text-gray-400 text-[9px] mb-0.5">Decimals</p>
            <p className="text-white font-semibold text-xs">{token.decimals}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <p className="text-gray-400 text-[9px] mb-0.5">Mint</p>
            <p className="text-white font-semibold text-[10px] truncate">
              {token.mint.slice(0, 4)}...{token.mint.slice(-4)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-2 mb-3">
        <h2 className="text-xs font-semibold text-white mb-1">Price History</h2>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={token.priceHistory}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                axisLine={{ stroke: "#374151" }}
              />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                axisLine={{ stroke: "#374151" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "11px",
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#8b5cf6"
                fill="url(#priceGradient)"
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-2">
        <h2 className="text-xs font-semibold text-white mb-2">Transactions</h2>
        {token.transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-4 text-xs">No transactions</p>
        ) : (
          <div className="space-y-1">
            {token.transactions.slice(0, 6).map((tx, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 bg-gray-800/30 rounded-lg p-2 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                      tx.type === "buy"
                        ? "bg-green-600/20 text-green-400"
                        : tx.type === "sell"
                        ? "bg-red-600/20 text-red-400"
                        : "bg-blue-600/20 text-blue-400"
                    }`}
                  >
                    {tx.type === "buy" ? "B" : tx.type === "sell" ? "S" : "T"}
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium capitalize">
                      {tx.type}
                    </p>
                    <p className="text-gray-500 text-[10px]">
                      {new Date(tx.timestamp * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm">
                    {tx.amount.toFixed(4)} tokens
                  </p>
                  <p className="text-gray-400 text-xs">${tx.usdValue.toFixed(2)}</p>
                </div>
                <a
                  href={`https://solscan.io/tx/${tx.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-gray-500 hover:text-purple-400 transition-colors"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoinDetail;
