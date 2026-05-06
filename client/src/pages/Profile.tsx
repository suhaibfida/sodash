import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { User, TrendingUp, TrendingDown, Copy } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getBalanceHistory, getPnLData } from "../lib/solana";
import type { BalanceSnapshot, PnLData } from "../types";

const Profile = () => {
  const { publicKey, connected } = useWallet();
  const [balanceHistory, setBalanceHistory] = useState<BalanceSnapshot[]>([]);
  const [pnlData, setPnlData] = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey || !connected) {
      setBalanceHistory([]);
      setPnlData(null);
      return;
    }

    let active = true;
    const loadProfile = () => {
      setLoading(true);
      Promise.all([
        getBalanceHistory(publicKey),
        getPnLData(publicKey),
      ]).then(([history, pnl]) => {
        if (!active) return;
        setBalanceHistory(history);
        setPnlData(pnl);
        setLoading(false);
      });
    };

    loadProfile();
    const interval = window.setInterval(loadProfile, 45_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [publicKey, connected]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <User size={48} className="text-gray-600" />
        <p className="text-gray-400">Connect your wallet to view your profile</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
        <p className="text-gray-400">Your portfolio analytics</p>
        <div className="flex items-center gap-2 mt-3 bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2">
          <span className="text-gray-400 text-sm">Address:</span>
          <span className="text-purple-400 text-sm font-mono">
            {publicKey?.toBase58().slice(0, 12)}...{publicKey?.toBase58().slice(-8)}
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(publicKey?.toBase58() || "")}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="h-64 bg-gray-900/50 border border-gray-800 rounded-2xl animate-pulse" />
          <div className="h-48 bg-gray-900/50 border border-gray-800 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <p className="text-gray-400 text-sm mb-1">24h Baseline</p>
              <p className="text-2xl font-bold text-white">
                ${pnlData?.totalInvested.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <p className="text-gray-400 text-sm mb-1">Current Value</p>
              <p className="text-2xl font-bold text-white">
                ${pnlData?.currentValue.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <p className="text-gray-400 text-sm mb-1">Overall P&L</p>
              <p
                className={`text-2xl font-bold ${
                  (pnlData?.totalPnL || 0) >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                ${(pnlData?.totalPnL || 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <p className="text-gray-400 text-sm mb-1">24h Move</p>
              <div className="flex items-center gap-2">
                {(pnlData?.pnlPercent || 0) >= 0 ? (
                  <TrendingUp className="text-green-400" size={20} />
                ) : (
                  <TrendingDown className="text-red-400" size={20} />
                )}
                <p
                  className={`text-2xl font-bold ${
                    (pnlData?.pnlPercent || 0) >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {Math.abs(pnlData?.pnlPercent || 0).toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Balance History</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={balanceHistory}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
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
                    dataKey="balance"
                    stroke="#8b5cf6"
                    fill="url(#balanceGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Portfolio Profit / Loss</h2>
            {pnlData?.byToken.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No token data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-gray-400 text-sm border-b border-gray-800">
                      <th className="text-left pb-3 font-medium">Token</th>
                      <th className="text-right pb-3 font-medium">24h Baseline</th>
                      <th className="text-right pb-3 font-medium">Current</th>
                      <th className="text-right pb-3 font-medium">P&L</th>
                      <th className="text-right pb-3 font-medium">P&L %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pnlData?.byToken.map((token) => (
                      <tr
                        key={token.mint}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                              {token.symbol.slice(0, 2)}
                            </div>
                            <span className="text-white text-sm">{token.symbol}</span>
                          </div>
                        </td>
                        <td className="py-4 text-right text-gray-300 text-sm">
                          ${token.invested.toFixed(2)}
                        </td>
                        <td className="py-4 text-right text-gray-300 text-sm">
                          ${token.current.toFixed(2)}
                        </td>
                        <td
                          className={`py-4 text-right text-sm font-medium ${
                            token.pnl >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          ${token.pnl.toFixed(2)}
                        </td>
                        <td
                          className={`py-4 text-right text-sm font-medium ${
                            token.pnlPercent >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {token.pnlPercent >= 0 ? "+" : ""}
                          {token.pnlPercent.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Profile;
