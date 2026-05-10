import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Wallet, Clock } from "lucide-react";
import { getWalletSummary, getSolPrice } from "../lib/solana";
import TokenDetailModal from "../components/TokenDetailModal";
import type { PreviousToken, TokenBalance } from "../types";

const Dashboard = () => {
  const { publicKey, connected } = useWallet();

  const [solBalance, setSolBalance] = useState<number>(0);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [previousTokens, setPreviousTokens] = useState<PreviousToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey || !connected) {
      setSolBalance(0);
      setSolPrice(0);
      setTokens([]);
      setPreviousTokens([]);
      return;
    }

    let active = true;

    const loadPortfolio = async () => {
      try {
        setLoading(true);
        const [summary, solPriceData] = await Promise.all([
          getWalletSummary(publicKey.toBase58()),
          getSolPrice(),
        ]);
        if (!active) return;
        setSolBalance(summary.solBalance);
        setTokens(summary.tokens);
        setPreviousTokens(summary.previousTokens);
        setSolPrice(solPriceData.usdPrice);
      } catch (error) {
        console.error("Failed to load portfolio:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPortfolio();
    const interval = window.setInterval(loadPortfolio, 20_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [publicKey, connected]);

  const totalValue =
    solBalance * solPrice + tokens.reduce((sum, t) => sum + t.usdValue, 0);

  // 3 most recently interacted tokens not in current wallet
  const recentPrev = previousTokens
    .slice()
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, 3);

  // Build mini chart from real token data
  // Use weighted priceChange24h across holdings to shape the curve
  const hasHoldings = totalValue > 0;
  const weightedChange = hasHoldings
    ? tokens.reduce((sum, t) => sum + t.priceChange24h * (t.usdValue / totalValue), 0)
    : 0;
  const chartUp = weightedChange >= 0;
  const portfolioUp = chartUp;
  const visibleTokens = tokens.slice(0, 6);

  // Generate 8 data points simulating 24h price movement based on weighted change
  const miniSeries: number[] = (() => {
    if (!hasHoldings) return [23, 23, 23, 23, 23, 23, 23, 23]; // flat line
    const startVal = 30;
    const endVal = 30 + weightedChange * 0.4;
    const pts: number[] = [];
    for (let i = 0; i < 8; i++) {
      const progress = i / 7;
      const base = startVal + (endVal - startVal) * progress;
      // small jitter for realism
      const jitter = (Math.sin(i * 1.8) * 1.5);
      pts.push(Math.max(5, Math.min(45, base + jitter)));
    }
    return pts;
  })();

  const minV = Math.min(...miniSeries);
  const maxV = Math.max(...miniSeries);
  const range = Math.max(1, maxV - minV);
  const points = miniSeries
    .map((v, i) => {
      const x = (i / (miniSeries.length - 1)) * 100;
      const y = 44 - ((v - minV) / range) * 36;
      return `${x},${y}`;
    })
    .join(" ");

  const lineColor = !hasHoldings
    ? "rgba(148,163,184,.45)" // grey flat
    : chartUp
      ? "#22c55e"
      : "#ef4444";
  const fillTop = !hasHoldings
    ? "rgba(148,163,184,.12)"
    : chartUp
      ? "rgba(34,197,94,.32)"
      : "rgba(239,68,68,.28)";
  const fillBot = !hasHoldings
    ? "rgba(148,163,184,0)"
    : chartUp
      ? "rgba(34,197,94,0)"
      : "rgba(239,68,68,0)";

  const gradients = [
    "linear-gradient(135deg,#8b5cf6,#6366f1)",
    "linear-gradient(135deg,#3b82f6,#06b6d4)",
    "linear-gradient(135deg,#22c55e,#14b8a6)",
  ];
  const bars = ["#8b5cf6", "#3b82f6", "#22c55e"];

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-purple-500/25">
          <Wallet size={48} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white">Sodash</h1>
        <p className="text-gray-400 text-lg max-w-md text-center">
          Connect your Solana wallet to view your portfolio, track interactions,
          and reclaim rent.
        </p>
        <div className="mt-4 px-6 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-gray-300 text-sm">
          Use the wallet button in the top right to connect
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell dashboard-sticky-layout">
      {/* PORTFOLIO VALUE — sticky */}
      <div className="glass-panel value-card value-card-sticky">
        <div className="value-left">
          <div className="value-label text-xs">Portfolio Value</div>
          <div
            className={`value-amount text-lg ${!hasHoldings ? "text-slate-400" : portfolioUp ? "portfolio-up" : "portfolio-down"}`}
          >
            ${totalValue.toFixed(2)}
          </div>
          <div className="value-subtext text-xs">
            {!hasHoldings ? (
              <span className="text-slate-500">—</span>
            ) : (
              <>
                <span
                  className={`portfolio-indicator ${portfolioUp ? "portfolio-indicator-up" : "portfolio-indicator-down"}`}
                />
                {portfolioUp ? "↑ Up" : "↓ Down"}
                <span className="ml-1 opacity-70">({Math.abs(weightedChange).toFixed(2)}%)</span>
              </>
            )}
          </div>
        </div>
        <div className="mini-chart-container">
          <svg
            className="mini-chart"
            viewBox="0 0 100 46"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="portfolioMiniFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fillTop} />
                <stop offset="100%" stopColor={fillBot} />
              </linearGradient>
            </defs>
            <polyline
              points={points}
              fill="none"
              stroke={lineColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="live-chart-line"
            />
            <polygon
              points={`0,46 ${points} 100,46`}
              fill="url(#portfolioMiniFill)"
            />
          </svg>
        </div>
      </div>

      {/* TOKEN TABLE — scrollable */}
      <div className="glass-panel token-table token-table-scroll">
        {/* Header */}
        <div className="token-header text-[10px]">
          <div>ASSET</div>
          <div>VALUE</div>
          <div>BALANCE</div>
        </div>

        {/* Current tokens */}
        {loading ? (
          <div className="loading-state">Loading portfolio...</div>
        ) : visibleTokens.length === 0 ? (
          <div className="loading-state">No tokens found</div>
        ) : (
          visibleTokens.map((token, index) => (
            <div
              key={token.mint}
              className="token-row cursor-pointer hover:bg-gray-800/20 transition-colors"
              onClick={() => setSelectedToken(token.mint)}
            >
              <div
                className="token-color-bar"
                style={{ background: bars[index % bars.length] }}
              />
              <div className="token-left">
                <div className="token-icon">
                  {token.logo ? (
                    <img
                      src={token.logo}
                      alt={token.symbol}
                      className="token-logo-img"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="token-logo-fallback"
                      style={{
                        background: gradients[index % gradients.length],
                      }}
                    >
                      {token.symbol.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="token-name">{token.symbol}</div>
                  <div
                    className={`token-change ${token.priceChange24h >= 0 ? "positive" : "negative"}`}
                  >
                    {token.priceChange24h >= 0 ? "+" : ""}
                    {token.priceChange24h.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="token-price">${token.usdValue.toFixed(2)}</div>
              <div className="token-market">
                {token.balance.toLocaleString()}
              </div>
            </div>
          ))
        )}

        {/* Divider + Recent buys */}
        {!loading && recentPrev.length > 0 && (
          <>
            <div className="prev-tokens-divider">
              <Clock size={11} />
              <span>Recently Bought</span>
            </div>

            {recentPrev.map((token, index) => (
              <div
                key={token.mint}
                className="token-row prev-token-row cursor-pointer hover:bg-gray-800/20 transition-colors"
                onClick={() => setSelectedToken(token.mint)}
              >
                <div
                  className="token-color-bar"
                  style={{ background: "rgba(139,92,246,0.5)" }}
                />
                <div className="token-left">
                  <div className="token-icon">
                    {token.logo ? (
                      <img
                        src={token.logo}
                        alt={token.symbol}
                        className="token-logo-img"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="token-logo-fallback"
                        style={{
                          background: gradients[index % gradients.length],
                        }}
                      >
                        {token.symbol.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="token-name">{token.symbol}</div>
                    <div
                      className="token-change"
                      style={{ color: "#a78bfa", fontSize: "11px" }}
                    >
                      {token.txCount} tx{token.txCount !== 1 ? "s" : ""}
                      {token.lastSeen > 0 && (
                        <>
                          {" "}
                          ·{" "}
                          {new Date(token.lastSeen * 1000).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className="token-price"
                  style={{ color: "#94a3b8", fontSize: "14px" }}
                >
                  {token.totalReceived > 0
                    ? token.totalReceived > 1_000_000
                      ? `${(token.totalReceived / 1_000_000).toFixed(1)}M`
                      : token.totalReceived > 1_000
                        ? `${(token.totalReceived / 1_000).toFixed(1)}K`
                        : token.totalReceived.toFixed(2)
                    : "—"}
                </div>
                <div className="token-market prev-token-sold-badge">sold</div>
              </div>
            ))}
          </>
        )}
      </div>

      {selectedToken && (
        <TokenDetailModal
          mint={selectedToken}
          onClose={() => setSelectedToken(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
