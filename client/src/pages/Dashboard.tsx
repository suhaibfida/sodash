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

  const portfolioUp = totalValue >= 0;
  const visibleTokens = tokens.slice(0, 6);

  // 3 most recently interacted tokens not in current wallet
  const recentPrev = previousTokens
    .slice()
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, 3);

  const miniSeries = portfolioUp
    ? [28, 32, 30, 35, 34, 38, 41, 46]
    : [46, 44, 42, 39, 37, 35, 32, 29];
  const min = Math.min(...miniSeries);
  const max = Math.max(...miniSeries);
  const points = miniSeries
    .map((v, i) => {
      const x = (i / (miniSeries.length - 1)) * 100;
      const y = 44 - ((v - min) / Math.max(1, max - min)) * 36;
      return `${x},${y}`;
    })
    .join(" ");

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
    <div className="dashboard-shell">
      {/* PORTFOLIO VALUE */}
      <div className="glass-panel value-card">
        <div className="value-left">
          <div className="value-label text-xs">Portfolio Value</div>
          <div
            className={`value-amount text-lg ${portfolioUp ? "portfolio-up" : "portfolio-down"}`}
          >
            ${totalValue.toFixed(2)}
          </div>
          <div className="value-subtext text-xs">
            <span
              className={`portfolio-indicator ${portfolioUp ? "portfolio-indicator-up" : "portfolio-indicator-down"}`}
            />
            {portfolioUp ? "↑ Up" : "↓ Down"}
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
              <linearGradient
                id="portfolioMiniFill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={
                    portfolioUp ? "rgba(34,197,94,.38)" : "rgba(239,68,68,.34)"
                  }
                />
                <stop
                  offset="100%"
                  stopColor={
                    portfolioUp ? "rgba(34,197,94,0)" : "rgba(239,68,68,0)"
                  }
                />
              </linearGradient>
            </defs>
            <polyline
              points={points}
              fill="none"
              className={`live-chart-line ${portfolioUp ? "live-chart-line-up" : "live-chart-line-down"}`}
            />
            <polygon
              points={`0,46 ${points} 100,46`}
              fill="url(#portfolioMiniFill)"
            />
          </svg>
        </div>
      </div>

      {/* TOKEN TABLE — current holdings + recent previous tokens below */}
      <div className="glass-panel token-table">
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
                            { month: "short", day: "numeric" },
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
