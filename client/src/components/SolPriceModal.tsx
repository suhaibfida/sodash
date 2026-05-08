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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Solana (SOL)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Token Header */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-700">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
              ◎
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Solana</h1>
              <p className="text-gray-400">SOL</p>
            </div>
          </div>

          {/* Price Information */}
          <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-2">Current Price</p>
            <p className="text-3xl font-bold text-white">
              ${price !== null ? price.toFixed(2) : "Loading..."}
            </p>
          </div>

          {/* Token Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Network</p>
              <p className="text-white font-bold text-sm">Solana</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Decimals</p>
              <p className="text-white font-bold text-sm">9</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Type</p>
              <p className="text-white font-bold text-sm">Native</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Status</p>
              <p className="text-green-400 font-bold text-sm">Active</p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-white mb-2">About SOL</h3>
            <p className="text-gray-300 text-xs leading-relaxed">
              Solana is a high-performance blockchain supporting builders and developers creating crypto apps that scale today. The network is validated by thousands of nodes and secured by millions of SOL tokens.
            </p>
          </div>

          {/* Mint Address */}
          <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-3">
            <code className="text-xs text-gray-300 flex-1 break-all font-mono">{solMint}</code>
            <button
              onClick={() => handleCopy(solMint)}
              className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
              title="Copy mint address"
            >
              <Copy size={16} />
            </button>
            {copied && <span className="text-xs text-green-400 flex-shrink-0">Copied!</span>}
          </div>

          {/* Links */}
          <div className="flex gap-2 pt-2">
            <a
              href="https://solscan.io/token/So11111111111111111111111111111111111111112"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg py-2 transition-colors text-sm"
            >
              <ExternalLink size={16} />
              Solscan
            </a>
            <a
              href="https://www.coingecko.com/en/coins/solana"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg py-2 transition-colors text-sm"
            >
              <ExternalLink size={16} />
              CoinGecko
            </a>
          </div>
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

export default SolPriceModal;
