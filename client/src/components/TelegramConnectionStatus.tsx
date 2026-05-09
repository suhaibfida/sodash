// =============================================
// Telegram Connection Status
// Shows connection state and manage button.
// =============================================

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { TelegramOTPModal } from "./TelegramOTPModal";

interface TelegramConnectionStatusProps {
  walletAddress: string | null;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function TelegramConnectionStatus({
  walletAddress,
}: TelegramConnectionStatusProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string>();

  const checkStatus = async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/telegram/status/${walletAddress}`
      );
      const data = await res.json();

      if (data.success) {
        setIsVerified(data.verified);
        setTelegramUsername(data.telegramUsername);
      }
    } catch (err) {
      console.error("Failed to check Telegram status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [walletAddress]);

  const handleRevoke = async () => {
    if (!walletAddress) return;

    try {
      await fetch(`${API_BASE}/api/v1/telegram/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });
      setIsVerified(false);
      setTelegramUsername(undefined);
    } catch (err) {
      console.error("Failed to revoke:", err);
    }
  };

  if (!walletAddress) return null;

  return (
    <>
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : isVerified ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-500" />
            )}
            <div>
              <p className="text-white font-semibold">Telegram Notifications</p>
              {isVerified && telegramUsername && (
                <p className="text-sm text-gray-400">@{telegramUsername}</p>
              )}
              {!isVerified && (
                <p className="text-sm text-gray-500">Not connected</p>
              )}
            </div>
          </div>

          {isVerified ? (
            <button
              onClick={handleRevoke}
              className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-shadow text-sm font-medium"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      <TelegramOTPModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        walletAddress={walletAddress}
        onSuccess={() => {
          setShowModal(false);
          checkStatus();
        }}
      />
    </>
  );
}
