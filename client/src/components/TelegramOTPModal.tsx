// =============================================
// Telegram OTP Modal
// Handles wallet-to-Telegram verification flow.
// =============================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, ExternalLink, Loader2, CheckCircle } from "lucide-react";

interface TelegramOTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  onSuccess: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function TelegramOTPModal({
  isOpen,
  onClose,
  walletAddress,
  onSuccess: _onSuccess,
}: TelegramOTPModalProps) {
  const [step, setStep] = useState<"init" | "waiting">("init");
  const [otpCode, setOtpCode] = useState("");
  const [botLink, setBotLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const initiateVerification = async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/v1/telegram/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await res.json();

      if (data.success) {
        setOtpCode(data.otpCode);
        setBotLink(data.botLink);
        setStep("waiting");
      } else {
        setError(data.error || "Failed to generate OTP");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const openTelegram = () => {
    window.open(botLink, "_blank");
  };

  const handleClose = () => {
    setStep("init");
    setOtpCode("");
    setBotLink("");
    setError("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Connect Telegram</h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            {step === "init" && (
              <div className="space-y-4">
                <p className="text-gray-300 text-sm">
                  Link your Telegram account to receive:
                </p>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Morning & evening portfolio summaries
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Real-time drop alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    AI-powered insights
                  </li>
                </ul>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  onClick={initiateVerification}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl py-3 font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating OTP...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Generate OTP
                    </>
                  )}
                </button>
              </div>
            )}

            {step === "waiting" && (
              <div className="space-y-4">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">Your OTP Code:</p>
                  <p className="text-3xl font-mono font-bold text-white tracking-wider">
                    {otpCode}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    Expires in 10 minutes
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-gray-300 text-sm">Next steps:</p>
                  <ol className="space-y-2 text-sm text-gray-400 list-decimal list-inside">
                    <li>Click the button below to open Telegram</li>
                    <li>Enter the OTP code in the bot</li>
                    <li>Wait for verification confirmation</li>
                  </ol>
                </div>

                <button
                  onClick={openTelegram}
                  className="w-full bg-[#0088cc] text-white rounded-xl py-3 font-semibold hover:bg-[#0077b3] transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Open Telegram Bot
                </button>

                <button
                  onClick={handleClose}
                  className="w-full bg-gray-800 text-gray-300 rounded-xl py-3 font-semibold hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
