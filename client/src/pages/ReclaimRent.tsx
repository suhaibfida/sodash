import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Recycle, CheckCircle, AlertCircle, Trash2, Loader2 } from "lucide-react";
import { createCloseTokenAccountTransaction, getRentAccounts } from "../lib/solana";
import type { RentAccount } from "../types";

const ReclaimRent = () => {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const [accounts, setAccounts] = useState<RentAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [reclaiming, setReclaiming] = useState<string | null>(null);
  const [reclaimed, setReclaimed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!publicKey || !connected) {
      setAccounts([]);
      return;
    }

    let active = true;
    const loadAccounts = () => {
      setLoading(true);
      getRentAccounts(publicKey).then((accs) => {
        if (!active) return;
        setAccounts(accs);
        setLoading(false);
      });
    };

    loadAccounts();
    const interval = window.setInterval(loadAccounts, 30_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [publicKey, connected]);

  const handleReclaim = async (account: RentAccount) => {
    if (!publicKey) return;
    setReclaiming(account.address);
    try {
      const transaction = createCloseTokenAccountTransaction(
        publicKey,
        account.address,
        account.programId
      );
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      setReclaimed((prev) => new Set(prev).add(account.address));
      setAccounts((prev) => prev.filter((item) => item.address !== account.address));
    } catch (err) {
      console.error("Reclaim failed:", err);
    }
    setReclaiming(null);
  };

  const totalReclaimable = accounts
    .filter((a) => a.reclaimable)
    .reduce((sum, a) => sum + a.lamports, 0);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Recycle size={48} className="text-gray-600" />
        <p className="text-gray-400">Connect your wallet to reclaim rent</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Reclaim Rent</h1>
        <p className="text-gray-400">
          Close empty token accounts and reclaim your SOL rent
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <p className="text-gray-400 text-sm mb-1">Empty Accounts</p>
          <p className="text-3xl font-bold text-white">
            {accounts.filter((a) => a.reclaimable).length}
          </p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <p className="text-gray-400 text-sm mb-1">Total Reclaimable</p>
          <p className="text-3xl font-bold text-purple-400">
            {(totalReclaimable / 1e9).toFixed(6)} SOL
          </p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <p className="text-gray-400 text-sm mb-1">Total Accounts</p>
          <p className="text-3xl font-bold text-white">{accounts.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Recycle size={48} className="mx-auto mb-4 opacity-50" />
          <p>No token accounts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => {
            const isReclaimed = reclaimed.has(account.address);
            const isReclaiming = reclaiming === account.address;

            return (
              <div
                key={account.address}
                className={`bg-gray-900/50 border rounded-2xl p-5 flex items-center justify-between transition-all ${
                  isReclaimed
                    ? "border-green-600/30 bg-green-900/10"
                    : "border-gray-800"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isReclaimed
                        ? "bg-green-600/20"
                        : account.reclaimable
                        ? "bg-yellow-600/20"
                        : "bg-gray-700/50"
                    }`}
                  >
                    {isReclaimed ? (
                      <CheckCircle size={20} className="text-green-400" />
                    ) : account.reclaimable ? (
                      <AlertCircle size={20} className="text-yellow-400" />
                    ) : (
                      <Trash2 size={20} className="text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-mono text-sm">
                      {account.address.slice(0, 16)}...{account.address.slice(-8)}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {account.program} - {account.mint.slice(0, 8)}...{account.mint.slice(-6)} -{" "}
                      {(account.lamports / 1e9).toFixed(6)} SOL
                    </p>
                  </div>
                </div>

                {account.reclaimable && !isReclaimed && (
                  <button
                    onClick={() => handleReclaim(account)}
                    disabled={isReclaiming}
                    className="px-4 py-2 rounded-xl bg-purple-600/20 text-purple-400 text-sm font-medium hover:bg-purple-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isReclaiming ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Reclaiming...
                      </>
                    ) : (
                      "Reclaim"
                    )}
                  </button>
                )}
                {isReclaimed && (
                  <span className="text-green-400 text-sm font-medium">Reclaimed</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReclaimRent;
