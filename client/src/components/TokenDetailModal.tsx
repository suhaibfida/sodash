import { useState, useEffect } from "react";
import { X, Copy, Check, ExternalLink } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { API_BASE_URL, getWalletSummary } from "../lib/solana";
import type { TokenBalance } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FullTokenInfo {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  description?: string;
  usdPrice: number;
  priceChange24h: number;
  volume24h?: number;
  liquidity?: number;
  fdv?: number;
  dexUrl?: string;
}

interface TokenDetailModalProps {
  mint: string;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(p: number): string {
  if (p >= 1)
    return p.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (p >= 0.01) return p.toFixed(4);
  if (p >= 0.0001) return p.toFixed(6);
  return p.toExponential(4);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = () => (
  <div className="token-modal-skeleton" aria-hidden>
    <div className="token-modal-skel-identity" />
    <div className="token-modal-skel-price" />
    <div className="token-modal-skel-grid">
      <div className="token-modal-skel-cell" />
      <div className="token-modal-skel-cell" />
      <div className="token-modal-skel-cell" />
      <div className="token-modal-skel-cell" />
    </div>
    <div className="token-modal-skel-desc" />
    <div className="token-modal-skel-mint" />
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const TokenDetailModal = ({ mint, onClose }: TokenDetailModalProps) => {
  const { publicKey } = useWallet();

  const [tokenInfo, setTokenInfo] = useState<FullTokenInfo | null>(null);
  const [walletToken, setWalletToken] = useState<TokenBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!mint) return;

    let active = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        // Fetch token metadata + wallet balance in parallel
        const [info, walletData] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/api/v1/token/${mint}`).then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json() as Promise<FullTokenInfo>;
          }),
          publicKey
            ? getWalletSummary(publicKey.toBase58())
            : Promise.reject(new Error("no wallet")),
        ]);

        if (!active) return;

        if (info.status === "fulfilled") {
          setTokenInfo(info.value);
        }

        if (walletData.status === "fulfilled") {
          const found =
            walletData.value.tokens.find((t) => t.mint === mint) ?? null;
          setWalletToken(found);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [mint, publicKey]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Derived display values
  const name = tokenInfo?.name ?? "Unknown Token";
  const symbol = tokenInfo?.symbol ?? "???";
  const logo = tokenInfo?.logoURI;
  const decimals = tokenInfo?.decimals ?? 0;
  const description = tokenInfo?.description;
  const price = tokenInfo?.usdPrice ?? 0;
  const priceChange24h = tokenInfo?.priceChange24h ?? 0;

  return (
    <div className="token-modal-overlay" onClick={onClose}>
      <div className="token-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="token-modal-header">
          <span className="token-modal-title">
            {name} ({symbol})
          </span>
          <button onClick={onClose} className="token-modal-close">
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        {loading ? (
          <Skeleton />
        ) : tokenInfo ? (
          <>
            {/* Token identity row */}
            <div className="token-modal-identity">
              <div className="token-modal-logo">
                {logo ? (
                  <img src={logo} alt={symbol} />
                ) : (
                  <span>{symbol.slice(0, 2)}</span>
                )}
              </div>
              <div>
                <div className="token-modal-name">{name}</div>
                <div className="token-modal-symbol">{symbol}</div>
              </div>
            </div>

            {/* Price hero */}
            <div className="token-modal-price-block">
              <div className="token-modal-price-label">Current Price</div>
              <div className="token-modal-price-value">
                {price > 0 ? `$${formatPrice(price)}` : "No price data"}
              </div>
              {priceChange24h !== 0 && (
                <div
                  className={
                    priceChange24h >= 0
                      ? "token-modal-change-up"
                      : "token-modal-change-down"
                  }
                >
                  {priceChange24h >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(priceChange24h).toFixed(2)}% (24h)
                </div>
              )}
            </div>

            {/* Info grid — 2 cols */}
            <div className="token-modal-grid">
              <div className="token-modal-info-cell">
                <div className="token-modal-info-label">Network</div>
                <div className="token-modal-info-value">Solana</div>
              </div>
              <div className="token-modal-info-cell">
                <div className="token-modal-info-label">Decimals</div>
                <div className="token-modal-info-value">{decimals}</div>
              </div>
              <div className="token-modal-info-cell">
                <div className="token-modal-info-label">Type</div>
                <div className="token-modal-info-value">
                  {symbol === "SOL" ? "Native" : "SPL Token"}
                </div>
              </div>
              <div className="token-modal-info-cell">
                <div className="token-modal-info-label">Status</div>
                <div className="token-modal-info-value token-modal-status-active">
                  Active
                </div>
              </div>

              {/* Wallet balance — only shown if user holds this token */}
              {walletToken && (
                <>
                  <div className="token-modal-info-cell">
                    <div className="token-modal-info-label">Your Balance</div>
                    <div className="token-modal-info-value">
                      {walletToken.balance.toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })}
                    </div>
                  </div>
                  <div className="token-modal-info-cell">
                    <div className="token-modal-info-label">Your Value</div>
                    <div className="token-modal-info-value">
                      ${walletToken.usdValue.toFixed(2)}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Description */}
            {description && (
              <div className="token-modal-description">
                <div className="token-modal-desc-title">About {symbol}</div>
                <div className="token-modal-desc-text">{description}</div>
              </div>
            )}

            {/* Mint address */}
            <div className="token-modal-mint-row">
              <code className="token-modal-mint-addr">{mint}</code>
              <button
                onClick={() => handleCopy(mint)}
                className="token-modal-copy-btn"
                title="Copy mint address"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>

            {/* Footer buttons */}
            <div className="token-modal-footer">
              <a
                href={`https://solscan.io/token/${mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="token-modal-btn"
              >
                <ExternalLink size={14} /> Solscan
              </a>
              <a
                href={`https://www.coingecko.com/en/coins/${symbol.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="token-modal-btn"
              >
                <ExternalLink size={14} /> CoinGecko
              </a>
            </div>
          </>
        ) : (
          /* Token not found */
          <div className="token-modal-not-found">
            <p>Token data unavailable.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenDetailModal;
