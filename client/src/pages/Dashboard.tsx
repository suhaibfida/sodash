import { useEffect, useState } from "react";

import { useWallet } from "@solana/wallet-adapter-react";

import {
  Wallet,
} from "lucide-react";

import {
  getPreviousTokens,
  getSolPrice,
  getWalletBalance,
  getTokenBalances,
} from "../lib/solana";

import TokenDetailModal from "../components/TokenDetailModal";

import type {
  PreviousToken,
  TokenBalance,
} from "../types";

const Dashboard = () => {
  const { publicKey, connected } = useWallet();

  /* =====================================
     STATE
  ===================================== */

  const [solBalance, setSolBalance] =
    useState<number>(0);

  const [solPrice, setSolPrice] =
    useState<number>(0);

  const [tokens, setTokens] =
    useState<TokenBalance[]>([]);

  const [previousTokens, setPreviousTokens] =
    useState<PreviousToken[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [selectedToken, setSelectedToken] =
    useState<string | null>(null);

  const [selectedPreviousToken, setSelectedPreviousToken] =
    useState<PreviousToken | null>(null);

  /* =====================================
     LOAD PORTFOLIO
  ===================================== */

  useEffect(() => {
    if (!publicKey || !connected) {
      setSolBalance(0);
      setSolPrice(0);
      setTokens([]);
      setPreviousTokens([]);
      return;
    }

    let active = true;

    const loadPortfolio =
      async () => {
        try {
          setLoading(true);

          const [
            balance,
            tokenBalances,
            previous,
            sol,
          ] = await Promise.all([
            getWalletBalance(
              publicKey
            ),

            getTokenBalances(
              publicKey
            ),

            getPreviousTokens(
              publicKey
            ),

            getSolPrice(),
          ]);

          if (!active) return;

          setSolBalance(balance);

          setTokens(
            tokenBalances
          );

          setPreviousTokens(
            previous
          );

          setSolPrice(
            sol.usdPrice || 0
          );
        } catch (error) {
          console.error(error);
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

    loadPortfolio();

    const interval =
      window.setInterval(
        loadPortfolio,
        20_000
      );

    return () => {
      active = false;

      window.clearInterval(
        interval
      );
    };
  }, [publicKey, connected]);

  /* =====================================
     TOTAL VALUE
  ===================================== */

  const totalValue =
    solBalance * solPrice +
    tokens.reduce(
      (sum, token) =>
        sum + token.usdValue,
      0
    );

  const portfolioUp =
    totalValue >= 0;
  const visibleTokens = tokens.slice(0, 6);

  const miniSeries = portfolioUp
    ? [28, 32, 30, 35, 34, 38, 41, 46]
    : [46, 44, 42, 39, 37, 35, 32, 29];

  const min = Math.min(...miniSeries);
  const max = Math.max(...miniSeries);
  const points = miniSeries
    .map((value, index) => {
      const x = (index / (miniSeries.length - 1)) * 100;
      const y = 44 - ((value - min) / Math.max(1, max - min)) * 36;
      return `${x},${y}`;
    })
    .join(" ");

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

  return (
    <div className="dashboard-shell">
      {/* =====================================
          PORTFOLIO VALUE
      ===================================== */}

      <div className="glass-panel value-card">

        <div className="value-left">

          <div className="value-label text-xs">
            Portfolio Value
          </div>

          <div
            className={`value-amount text-lg ${
              portfolioUp
                ? "portfolio-up"
                : "portfolio-down"
            }`}
          >
            $
            {totalValue.toFixed(
              2
            )}
          </div>

          <div className="value-subtext text-xs">

            <span
              className={`portfolio-indicator ${
                portfolioUp
                  ? "portfolio-indicator-up"
                  : "portfolio-indicator-down"
              }`}
            />

            {portfolioUp
              ? "↑ Up"
              : "↓ Down"}

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
                <stop
                  offset="0%"
                  stopColor={portfolioUp ? "rgba(34,197,94,.38)" : "rgba(239,68,68,.34)"}
                />
                <stop
                  offset="100%"
                  stopColor={portfolioUp ? "rgba(34,197,94,0)" : "rgba(239,68,68,0)"}
                />
              </linearGradient>
            </defs>
            <polyline
              points={points}
              fill="none"
              className={`live-chart-line ${portfolioUp ? "live-chart-line-up" : "live-chart-line-down"}`}
            />
            <polygon points={`0,46 ${points} 100,46`} fill="url(#portfolioMiniFill)" />
          </svg>
          <div className="mini-chart-metrics">
            <div className="text-right">
              <p className="text-gray-400 text-[10px]">SOL Balance</p>
              <p className="text-cyan-300 text-xs font-bold">{solBalance.toFixed(4)}</p>
              <p className="text-gray-500 text-[10px]">${(solBalance * solPrice).toFixed(2)}</p>
            </div>
          </div>
        </div>

      </div>

      {/* =====================================
          TOKENS
      ===================================== */}

      <div className="glass-panel token-table">

        <div className="token-header text-[10px]">

          <div>ASSET</div>

          <div>VALUE</div>

          <div>BALANCE</div>

        </div>

        {loading ? (
          <div className="loading-state">
            Loading portfolio...
          </div>
        ) : visibleTokens.length === 0 ? (
          <div className="loading-state">
            No tokens found
          </div>
        ) : (
          visibleTokens.map(
            (token, index) => {

              const gradients = [
                "linear-gradient(135deg,#8b5cf6,#6366f1)",
                "linear-gradient(135deg,#3b82f6,#06b6d4)",
                "linear-gradient(135deg,#22c55e,#14b8a6)",
              ];

              const bars = [
                "#8b5cf6",
                "#3b82f6",
                "#22c55e",
              ];

              return (
                <div
                  key={token.mint}
                  className="token-row cursor-pointer hover:bg-gray-800/20 transition-colors"
                  onClick={() => setSelectedToken(token.mint)}
                >

                  <div
                    className="token-color-bar"
                    style={{
                      background:
                        bars[
                          index %
                            bars.length
                        ],
                    }}
                  />

                  {/* LEFT */}

                  <div className="token-left">

                    <div
                      className="token-icon"
                    >
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
                            background:
                              gradients[
                                index %
                                  gradients.length
                              ],
                          }}
                        >
                          {token.symbol
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div>

                      <div className="token-name">
                        {
                          token.symbol
                        }
                      </div>

                      <div
                        className={`token-change ${
                          token.priceChange24h >=
                          0
                            ? "positive"
                            : "negative"
                        }`}
                      >
                        {token.priceChange24h >=
                        0
                          ? "+"
                          : ""}
                        {token.priceChange24h.toFixed(
                          2
                        )}
                        %
                      </div>

                    </div>

                  </div>

                  {/* VALUE */}

                  <div className="token-price">
                    $
                    {token.usdValue.toFixed(
                      2
                    )}
                  </div>

                  {/* BALANCE */}

                  <div className="token-market">
                    {token.balance.toLocaleString()}
                  </div>

                </div>
              );
            }
          )
        )}

      </div>

      {/* =====================================
          PREVIOUS TOKENS
      ===================================== */}

      {previousTokens.length >
        0 && (
        <div className="previous-section">

          <div className="section-title">
            Previous Tokens
          </div>

          <div className="previous-grid">

            {previousTokens.map(
              (token) => (
                <div
                  key={token.mint}
                  className="glass-card previous-card cursor-pointer hover:border-cyan-400/50 transition-all hover:shadow-lg hover:shadow-cyan-500/10"
                  onClick={() => setSelectedPreviousToken(token)}
                >

                  <div className="previous-left">
                    <div className="previous-token-avatar">
                      {token.logo ? (
                        <img
                          src={token.logo}
                          alt={token.symbol}
                          className="token-logo-img"
                          loading="lazy"
                        />
                      ) : (
                        <span>{token.symbol.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>

                      <div className="previous-symbol">
                        {
                          token.symbol
                        }
                      </div>

                      <div className="previous-name">
                        {token.name}
                      </div>
                    </div>
                  </div>

                  <div className="previous-value">
                    {(
                      token.reclaimableLamports /
                      1e9
                    ).toFixed(5)}{" "}
                    SOL
                  </div>

                </div>
              )
            )}

          </div>

        </div>
      )}

      {selectedToken && (
        <TokenDetailModal 
          mint={selectedToken} 
          onClose={() => setSelectedToken(null)}
        />
      )}

      {selectedPreviousToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full my-8">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">Token Details</h2>
              <button 
                onClick={() => setSelectedPreviousToken(null)} 
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-700">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {selectedPreviousToken.logo ? (
                    <img src={selectedPreviousToken.logo} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    selectedPreviousToken.symbol.slice(0, 2)
                  )}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">{selectedPreviousToken.name}</h1>
                  <p className="text-gray-400 text-sm">{selectedPreviousToken.symbol}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Network</p>
                  <p className="text-white font-bold">{selectedPreviousToken.program}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Decimals</p>
                  <p className="text-white font-bold">{selectedPreviousToken.decimals}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Reclaimable SOL</p>
                  <p className="text-white font-bold">{(selectedPreviousToken.reclaimableLamports / 1e9).toFixed(5)} SOL</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Token Accounts</p>
                  <p className="text-white font-bold">{selectedPreviousToken.tokenAccounts.length}</p>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
                <p className="text-gray-400 text-xs mb-2">Mint Address</p>
                <code className="text-xs text-gray-300 break-all font-mono">{selectedPreviousToken.mint}</code>
              </div>

              <p className="text-gray-400 text-xs">Source: {selectedPreviousToken.source}</p>
            </div>
            <div className="border-t border-gray-700 p-4 flex justify-end">
              <button
                onClick={() => setSelectedPreviousToken(null)}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
