/* src/pages/Dashboard.tsx */

import { useEffect, useState } from "react";

import { useWallet } from "@solana/wallet-adapter-react";

import {
  getPreviousTokens,
  getSolPrice,
  getWalletBalance,
  getTokenBalances,
} from "../lib/solana";

import type {
  PreviousToken,
  TokenBalance,
} from "../types";

const Dashboard = () => {
  const { publicKey, connected } = useWallet();

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

        const [
          balance,
          tokenBalances,
          previous,
          sol,
        ] = await Promise.all([
          getWalletBalance(publicKey),
          getTokenBalances(publicKey),
          getPreviousTokens(publicKey),
          getSolPrice(),
        ]);

        if (!active) return;

        setSolBalance(balance);

        setTokens(tokenBalances);

        setPreviousTokens(previous);

        setSolPrice(sol.usdPrice || 0);
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPortfolio();

    const interval = window.setInterval(
      loadPortfolio,
      20_000
    );

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [publicKey, connected]);

  const totalValue =
    solBalance * solPrice +
    tokens.reduce(
      (sum, token) => sum + token.usdValue,
      0
    );

  return (
    <div className="dashboard-shell">

      {/* =====================================
          HEADER
      ===================================== */}

   

      {/* =====================================
          PORTFOLIO VALUE
      ===================================== */}

      <div className="glass-panel value-card">

        <div className="value-label">
          Portfolio Value
        </div>

        <div className="value-amount">
          ${totalValue.toFixed(2)}
        </div>

        <div className="value-subtext">
          Live Solana wallet overview
        </div>

      </div>

      {/* =====================================
          TOKEN TABLE
      ===================================== */}

      <div className="glass-panel token-table">

        <div className="token-header">

          <div>ASSET</div>

          <div>VALUE</div>

          <div>BALANCE</div>

        </div>

        {loading ? (
          <div className="loading-state">
            Loading portfolio...
          </div>
        ) : tokens.length === 0 ? (
          <div className="loading-state">
            No tokens found
          </div>
        ) : (
          tokens.map((token, index) => {

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
                className="token-row"
              >

                <div
                  className="token-color-bar"
                  style={{
                    background:
                      bars[index % bars.length],
                  }}
                />

                {/* LEFT SIDE */}

                <div className="token-left">

                  <div
                    className="token-icon"
                    style={{
                      background:
                        gradients[
                          index % gradients.length
                        ],
                    }}
                  >
                    {token.symbol
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div>

                    <div className="token-name">
                      {token.symbol}
                    </div>

                    <div
                      className={`token-change ${
                        token.priceChange24h >= 0
                          ? "positive"
                          : "negative"
                      }`}
                    >
                      {token.priceChange24h >= 0
                        ? "+"
                        : ""}
                      {token.priceChange24h.toFixed(2)}%
                    </div>

                  </div>

                </div>

                {/* VALUE */}

                <div className="token-price">
                  ${token.usdValue.toFixed(2)}
                </div>

                {/* BALANCE */}

                <div className="token-market">
                  {token.balance.toLocaleString()}
                </div>

              </div>
            );
          })
        )}

      </div>

      {/* =====================================
          PREVIOUS TOKENS
      ===================================== */}

      {previousTokens.length > 0 && (
        <div className="previous-section">

          <div className="section-title">
            Previous Tokens
          </div>

          <div className="previous-grid">

            {previousTokens.map((token) => (
              <div
                key={token.mint}
                className="glass-card previous-card"
              >

                <div>

                  <div className="previous-symbol">
                    {token.symbol}
                  </div>

                  <div className="previous-name">
                    {token.name}
                  </div>

                </div>

                <div className="previous-value">
                  {(
                    token.reclaimableLamports /
                    1e9
                  ).toFixed(5)} SOL
                </div>

              </div>
            ))}

          </div>

        </div>
      )}

    </div>
  );
};

export default Dashboard;