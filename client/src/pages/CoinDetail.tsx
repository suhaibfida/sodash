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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
            {token.logo ? (
              <img src={token.logo} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              token.symbol.slice(0, 2)
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{token.name}</h1>
            <p className="text-gray-400">{token.symbol}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-bold text-white">
              ${token.price.toFixed(4)}
            </p>
            <div
              className={`flex items-center gap-1 justify-end text-sm font-medium ${
                token.priceChange24h >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {token.priceChange24h >= 0 ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              {Math.abs(token.priceChange24h).toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Balance</p>
            <p className="text-white font-semibold">
              {token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Value</p>
            <p className="text-white font-semibold">${token.usdValue.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Decimals</p>
            <p className="text-white font-semibold">{token.decimals}</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Mint Address</p>
            <p className="text-white font-semibold text-xs truncate">
              {token.mint}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Price History</h2>
        <div className="h-72">
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
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                axisLine={{ stroke: "#374151" }}
              />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                axisLine={{ stroke: "#374151" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "12px",
                  color: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#8b5cf6"
                fill="url(#priceGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Transactions</h2>
        {token.transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No matching token transactions found</p>
        ) : (
          <div className="space-y-3">
            {token.transactions.map((tx, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-gray-800/30 rounded-xl p-4 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
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
                    <p className="text-white text-sm font-medium capitalize">
                      {tx.type}
                    </p>
                    <p className="text-gray-500 text-xs">
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
                  className="ml-4 text-gray-500 hover:text-purple-400 transition-colors"
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
