import { useState, useEffect } from "react";
import { X, ExternalLink, TrendingUp, TrendingDown, Copy } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getTokenDetail } from "../lib/solana";
import { useWallet } from "@solana/wallet-adapter-react";
import type { TokenDetail } from "../types";

interface TokenDetailModalProps {
  mint: string;
  onClose: () => void;
}

const TokenDetailModal = ({ mint, onClose }: TokenDetailModalProps) => {
  const { publicKey } = useWallet();
  const [token, setToken] = useState<TokenDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!mint || !publicKey) {
      setLoading(false);
      return;
    }

    let active = true;
    getTokenDetail(mint, publicKey).then((detail) => {
      if (!active) return;
      setToken(detail);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [mint, publicKey]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!token && !loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">Token Details</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <p className="text-gray-400 text-center">Token not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Token Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-16 bg-gray-800 rounded-lg" />
              <div className="h-32 bg-gray-800 rounded-lg" />
            </div>
          ) : token ? (
            <div className="space-y-4">
              {/* Token Header */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-700">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {token.logo ? (
                    <img src={token.logo} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    token.symbol.slice(0, 2)
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-white">{token.name}</h1>
                  <p className="text-gray-400">{token.symbol}</p>
                  <p className="text-xs text-gray-500 mt-1 font-mono break-all">{token.mint}</p>
                </div>
              </div>

              {/* Price Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Current Price</p>
                  <p className="text-white font-bold text-lg">${token.price.toFixed(6)}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">24h Change</p>
                  <div
                    className={`flex items-center gap-1 font-bold text-lg ${
                      token.priceChange24h >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {token.priceChange24h >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {Math.abs(token.priceChange24h).toFixed(2)}%
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Balance</p>
                  <p className="text-white font-bold text-sm">
                    {token.balance.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Value</p>
                  <p className="text-white font-bold text-sm">${token.usdValue.toFixed(2)}</p>
                </div>
              </div>

              {/* Token Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Decimals</p>
                  <p className="text-white font-bold">{token.decimals}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Status</p>
                  <p className="text-green-400 font-bold text-sm">Active</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Network</p>
                  <p className="text-white font-bold text-sm">Solana</p>
                </div>
              </div>

              {/* Price History */}
              {token.priceHistory && token.priceHistory.length > 0 && (
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-sm font-semibold text-white mb-3">Price History</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={token.priceHistory}>
                        <defs>
                          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
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
                          fill="url(#priceGrad)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Transactions */}
              {token.transactions && token.transactions.length > 0 && (
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-sm font-semibold text-white mb-3">Recent Transactions</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {token.transactions.slice(0, 8).map((tx, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-gray-700/30 rounded-lg p-2 hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                              tx.type === "buy"
                                ? "bg-green-600/20 text-green-400"
                                : tx.type === "sell"
                                ? "bg-red-600/20 text-red-400"
                                : "bg-blue-600/20 text-blue-400"
                            }`}
                          >
                            {tx.type === "buy" ? "B" : tx.type === "sell" ? "S" : "T"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white text-xs font-medium capitalize">
                              {tx.type}
                            </p>
                            <p className="text-gray-500 text-[10px]">
                              {new Date(tx.timestamp * 1000).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <p className="text-white text-xs">
                            {tx.amount.toFixed(4)}
                          </p>
                          <p className="text-gray-400 text-[10px]">${tx.usdValue.toFixed(2)}</p>
                        </div>
                        <a
                          href={`https://solscan.io/tx/${tx.signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-gray-500 hover:text-purple-400 transition-colors flex-shrink-0"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mint Address Copy */}
              <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-3 mt-4">
                <code className="text-xs text-gray-300 flex-1 break-all">{token.mint}</code>
                <button
                  onClick={() => handleCopy(token.mint)}
                  className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                  title="Copy mint address"
                >
                  <Copy size={16} />
                </button>
                {copied && <span className="text-xs text-green-400">Copied!</span>}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TokenDetailModal;
