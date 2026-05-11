import React from "react";
import { X, ExternalLink, Copy } from "lucide-react";

interface SolPriceModalProps {
  price: number | null;
  onClose: () => void;
}

const SolPriceModal = ({ price, onClose }: SolPriceModalProps) => {
  const solMint = "So11111111111111111111111111111111111111112";
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-[90vw] max-w-[290px] md:max-w-[330px] max-h-[82dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b border-gray-700">
          <h2 className="text-lg md:text-xl font-bold text-white">
            Solana (SOL)
          </h2>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Token Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-700">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-indigo-100 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
              <img
                src="/solana-token.svg"
                alt="Solana"
                className="w-5 h-5"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>

            <div>
              <h1 className="text-base font-bold text-white">Solana</h1>

              <p className="text-gray-400 text-sm">SOL</p>
            </div>
          </div>

          {/* Price Information */}
          <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Current Price</p>

            <p className="text-2xl md:text-3xl font-bold text-white">
              ${price !== null ? price.toFixed(2) : "Loading..."}
            </p>
          </div>

          {/* Token Details */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/50 rounded-lg p-2">
              <p className="text-gray-400 text-[10px] mb-1">Network</p>

              <p className="text-white font-bold text-sm">Solana</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-2">
              <p className="text-gray-400 text-[10px] mb-1">Decimals</p>

              <p className="text-white font-bold text-sm">9</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-2">
              <p className="text-gray-400 text-[10px] mb-1">Type</p>

              <p className="text-white font-bold text-sm">Native</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-2">
              <p className="text-gray-400 text-[10px] mb-1">Status</p>

              <p className="text-green-400 font-bold text-sm">Active</p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
            <h3 className="text-sm font-semibold text-white mb-2">
              About SOL
            </h3>

            <p className="text-gray-300 text-[11px] leading-relaxed">
              Solana is a high-performance blockchain supporting builders and
              developers creating crypto apps that scale today.
            </p>
          </div>

          {/* Mint Address */}
          <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-2">
            <code className="text-[10px] text-gray-300 flex-1 break-all font-mono">
              {solMint}
            </code>

            <button
              onClick={() => handleCopy(solMint)}
              className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
              title="Copy mint address"
            >
              <Copy size={14} />
            </button>

            {copied && (
              <span className="text-[10px] text-green-400 flex-shrink-0">
                Copied!
              </span>
            )}
          </div>

          {/* Links */}
          <div className="flex gap-2 pt-1">
            <a
              href="https://solscan.io/token/So11111111111111111111111111111111111111112"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg py-2 transition-colors text-xs"
            >
              <ExternalLink size={14} />

              Solscan
            </a>

            <a
              href="https://www.coingecko.com/en/coins/solana"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg py-2 transition-colors text-xs"
            >
              <ExternalLink size={14} />

              CoinGecko
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolPriceModal;