import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Info, X } from "lucide-react";

const PAGE_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard",
    description: "Your central hub for monitoring Solana portfolio. View total balance, token distributions, and real-time PnL analytics.",
  },
  "/web": {
    title: "Web Graph",
    description: "An interactive 3D visualization of your wallet's ecosystem. Click on any node (Exchange, Program, or Wallet) to view deep interaction history, transaction volume, and direct links to block explorers.",
  },
  "/reclaim": {
    title: "Rent Reclaim",
    description: "Recover SOL locked in empty token accounts. ⚠️ WARNING: Only close accounts you know are empty. Closing an account with tokens will destroy them permanently.",
  },
  "/notifications": {
    title: "Notifications",
    description: "Set up and manage AI-powered alerts. Get notified about significant price drops or portfolio milestones.",
  },
  "/profile": {
    title: "Portfolio Analytics",
    description: "Deep-dive into your portfolio performance. View historical balance trends, asset allocation across tokens, and detailed P&L breakdowns.",
  },
};

export function PageGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Handle dynamic routes like /token/:mint
  const getPageInfo = () => {
    if (location.pathname.startsWith("/token/")) {
      return {
        title: "Token Analytics",
        description: "Deep-dive into specific token metrics, including price trends, holder data, and your personal position details.",
      };
    }
    return PAGE_DESCRIPTIONS[location.pathname] || {
      title: "Sodash",
      description: "Your advanced Solana portfolio management platform.",
    };
  };

  const info = getPageInfo();

  return (
    <div className="fixed bottom-[72px] right-4 z-[100]">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="info-btn"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
            }}
            className={`w-12 h-12 bg-gray-900/80 backdrop-blur-md border rounded-full flex items-center justify-center transition-all ${
              location.pathname === "/reclaim"
                ? "border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:text-red-300 hover:border-red-400/70"
                : "border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:text-blue-300 hover:border-blue-400/50"
            }`}
            title="Page Information"
          >
            <Info className="w-6 h-6" />
          </motion.button>
        ) : (
          <motion.div
            key="info-panel"
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            className="w-72 bg-gray-900/95 backdrop-blur-xl border border-blue-500/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="absolute top-3 right-3 p-2 hover:bg-gray-800 rounded-lg transition-colors z-[110] group"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500 group-hover:text-gray-300" />
            </button>
            
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className={`p-2 rounded-xl border ${
                location.pathname === "/reclaim" 
                  ? "bg-red-500/10 border-red-500/20" 
                  : "bg-blue-500/10 border-blue-500/20"
              }`}>
                <Info className={`w-5 h-5 ${
                  location.pathname === "/reclaim" ? "text-red-400" : "text-blue-400"
                }`} />
              </div>
              <div>
                <h4 className="font-bold text-white text-base leading-tight">{info.title}</h4>
                <p className={`text-[10px] font-mono uppercase tracking-wider mt-0.5 ${
                  location.pathname === "/reclaim" ? "text-red-400/70" : "text-blue-400/70"
                }`}>Page Guide</p>
              </div>
            </div>
            
            <p className={`text-sm leading-relaxed relative z-10 mb-4 ${
              location.pathname === "/reclaim" ? "text-red-400 font-medium" : "text-gray-300"
            }`}>
              {info.description}
            </p>
            
            <div className="pt-3 border-t border-gray-800/50 flex justify-between items-center relative z-10">
              <div className="flex gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  location.pathname === "/reclaim" ? "bg-red-500" : "bg-blue-500"
                }`} />
                <div className={`w-1.5 h-1.5 rounded-full ${
                  location.pathname === "/reclaim" ? "bg-red-500/40" : "bg-blue-500/40"
                }`} />
                <div className={`w-1.5 h-1.5 rounded-full ${
                  location.pathname === "/reclaim" ? "bg-red-500/10" : "bg-blue-500/10"
                }`} />
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className={`text-[11px] font-bold transition-colors uppercase tracking-widest ${
                  location.pathname === "/reclaim" ? "text-red-400 hover:text-red-300" : "text-blue-400 hover:text-blue-300"
                }`}
              >
                Got it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
