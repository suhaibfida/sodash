import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { User, TrendingUp, TrendingDown, Copy } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
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

  const tokenAllocation = (pnlData?.byToken || [])
    .slice(0, 5)
    .map((token) => ({
      name: token.symbol,
      value: Math.max(0.01, token.current),
    }));

  const radarData = (pnlData?.byToken || [])
    .slice(0, 6)
    .map((token) => ({
      token: token.symbol,
      pnl: Math.min(100, Math.max(-100, token.pnlPercent)),
    }));

  const chartColors = ["#22d3ee", "#8b5cf6", "#3b82f6", "#22c55e", "#f59e0b", "#ec4899"];

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <User size={48} className="text-gray-600" />
        <p className="text-gray-400">Connect your wallet to view your profile</p>
      </div>
    );
  }

  return (
    <div className="profile-shell">
      <div className="profile-head">
        <div>
          <h1 className="text-base font-bold text-white">Profile</h1>
          <p className="text-gray-400 text-sm">Portfolio analytics</p>
        </div>
        <div className="profile-address">
          <span className="text-gray-400 text-xs">Address:</span>
          <span className="text-purple-400 text-xs font-mono truncate">
            {publicKey?.toBase58().slice(0, 6)}...{publicKey?.toBase58().slice(-6)}
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(publicKey?.toBase58() || "")}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <Copy size={10} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="profile-loading">
          <div className="h-20 bg-gray-900/50 border border-gray-800 rounded-xl animate-pulse" />
          <div className="h-44 bg-gray-900/50 border border-gray-800 rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="profile-content">
          <div className="profile-kpis">
            <div className="profile-kpi">
              <p className="text-gray-400 text-xs mb-0.5">24h Base</p>
              <p className="text-sm font-bold text-white">${pnlData?.totalInvested.toFixed(2) || "0.00"}</p>
            </div>
            <div className="profile-kpi">
              <p className="text-gray-400 text-xs mb-0.5">Current</p>
              <p className="text-sm font-bold text-white">${pnlData?.currentValue.toFixed(2) || "0.00"}</p>
            </div>
            <div className="profile-kpi">
              <p className="text-gray-400 text-xs mb-0.5">P&L</p>
              <p className={`text-sm font-bold ${(pnlData?.totalPnL || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                ${(pnlData?.totalPnL || 0).toFixed(2)}
              </p>
            </div>
            <div className="profile-kpi">
              <p className="text-gray-400 text-xs mb-0.5">Move</p>
              <div className="flex items-center gap-1">
                {(pnlData?.pnlPercent || 0) >= 0 ? <TrendingUp className="text-green-400" size={12} /> : <TrendingDown className="text-red-400" size={12} />}
                <p className={`text-sm font-bold ${(pnlData?.pnlPercent || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {Math.abs(pnlData?.pnlPercent || 0).toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          <div className="profile-grid">
            <div className="profile-panel">
              <h2 className="text-sm font-semibold text-white mb-1">Balance</h2>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={balanceHistory}>
                    <defs>
                      <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={{ stroke: "#374151" }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={{ stroke: "#374151" }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="balance" stroke="#8b5cf6" fill="url(#balanceGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="profile-panel">
              <h2 className="text-sm font-semibold text-white mb-1">Allocation</h2>
              {tokenAllocation.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-xs">No allocation data</p>
              ) : (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tokenAllocation}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={38}
                        outerRadius={62}
                        paddingAngle={2}
                        stroke="transparent"
                      >
                        {tokenAllocation.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="profile-panel">
              <h2 className="text-sm font-semibold text-white mb-1">P&L Radar</h2>
              {radarData.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-xs">No radar data</p>
              ) : (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius={68}>
                      <PolarGrid stroke="rgba(148,163,184,.35)" />
                      <PolarAngleAxis dataKey="token" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                      <Radar
                        dataKey="pnl"
                        stroke="#22d3ee"
                        fill="rgba(34,211,238,.26)"
                        strokeWidth={2}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="profile-panel">
              <h2 className="text-sm font-semibold text-white mb-1">P&L</h2>
              {!pnlData?.byToken || pnlData.byToken.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-xs">No token data available</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-gray-400 text-xs border-b border-gray-800">
                      <th className="text-left pb-2 font-medium">Token</th>
                      <th className="text-right pb-2 font-medium">P&L</th>
                      <th className="text-right pb-2 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pnlData.byToken.slice(0, 6).map((token) => (
                      <tr key={token.mint} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="profile-token-avatar">
                              {token.logo ? (
                                <img
                                  src={token.logo}
                                  alt={token.symbol}
                                  className="token-logo-img"
                                  loading="lazy"
                                />
                              ) : (
                                <span>{token.symbol.slice(0, 2)}</span>
                              )}
                            </div>
                            <span className="text-white text-xs">{token.symbol}</span>
                          </div>
                        </td>
                        <td className={`py-2 text-right text-xs font-medium ${token.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                          ${token.pnl.toFixed(2)}
                        </td>
                        <td className={`py-2 text-right text-xs font-medium ${token.pnlPercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {token.pnlPercent >= 0 ? "+" : ""}{token.pnlPercent.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
