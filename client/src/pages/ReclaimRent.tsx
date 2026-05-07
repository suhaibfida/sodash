import { useEffect, useState } from "react";

import {
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";

import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import {
  createCloseTokenAccountTransaction,
  getRentAccounts,
} from "../lib/solana";

import type { RentAccount } from "../types";

const ReclaimRent = () => {
  const { connection } = useConnection();

  const {
    publicKey,
    connected,
    sendTransaction,
  } = useWallet();

  const [accounts, setAccounts] =
    useState<RentAccount[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [reclaiming, setReclaiming] =
    useState<string | null>(null);

  const [reclaimed, setReclaimed] =
    useState<Set<string>>(new Set());

  useEffect(() => {
    if (!publicKey || !connected) {
      setAccounts([]);
      return;
    }

    let active = true;

    const loadAccounts = () => {
      setLoading(true);

      getRentAccounts(publicKey).then(
        (accs) => {
          if (!active) return;

          setAccounts(accs);

          setLoading(false);
        }
      );
    };

    loadAccounts();

    const interval = window.setInterval(
      loadAccounts,
      30_000
    );

    return () => {
      active = false;

      window.clearInterval(interval);
    };
  }, [publicKey, connected]);

  const handleReclaim = async (
    account: RentAccount
  ) => {
    if (!publicKey) return;

    setReclaiming(account.address);

    try {
      const transaction =
        createCloseTokenAccountTransaction(
          publicKey,
          account.address,
          account.programId
        );

      const signature =
        await sendTransaction(
          transaction,
          connection
        );

      await connection.confirmTransaction(
        signature,
        "confirmed"
      );

      setReclaimed(
        (prev) =>
          new Set(prev).add(account.address)
      );

      setAccounts((prev) =>
        prev.filter(
          (item) =>
            item.address !== account.address
        )
      );
    } catch (err) {
      console.error(err);
    }

    setReclaiming(null);
  };

  const totalReclaimable = accounts
    .filter((a) => a.reclaimable)
    .reduce((sum, a) => sum + a.lamports, 0);

  if (!connected) {
    return (
      <div className="dashboard-shell">

        <div className="reclaim-hero">

          <div className="reclaim-glow-card">

            <div className="reclaim-badge">

              <Sparkles size={28} />

              <span>
                Obtain your Solana
              </span>

              <Sparkles size={28} />

            </div>

            <p className="reclaim-description">
              Connect your wallet to reclaiming
              rent
            </p>

            <div className="reclaim-wallet-button">
              Connect Wallet
            </div>

          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="dashboard-shell">

      {/* HEADER */}

      <div className="reclaim-header">

        <div>

          <h1 className="reclaim-title">
            Reclaim Rent
          </h1>

          <p className="reclaim-subtitle">
            Close empty token accounts and
            reclaim SOL rent
          </p>

        </div>

        <div className="reclaim-total-card">

          <div className="reclaim-total-label">
            Total Reclaimable
          </div>

          <div className="reclaim-total-value">
            {(
              totalReclaimable / 1e9
            ).toFixed(6)}{" "}
            SOL
          </div>

        </div>

      </div>

      {/* STATS */}

      <div className="reclaim-stats">

        <div className="glass-card reclaim-stat-card">

          <div className="reclaim-stat-label">
            Empty Accounts
          </div>

          <div className="reclaim-stat-value">
            {
              accounts.filter(
                (a) => a.reclaimable
              ).length
            }
          </div>

        </div>

        <div className="glass-card reclaim-stat-card">

          <div className="reclaim-stat-label">
            Total Accounts
          </div>

          <div className="reclaim-stat-value">
            {accounts.length}
          </div>

        </div>

      </div>

      {/* LIST */}

      {loading ? (
        <div className="space-y-4">

          {Array.from({
            length: 5,
          }).map((_, i) => (
            <div
              key={i}
              className="glass-card reclaim-account-card animate-pulse"
            >
              Loading...
            </div>
          ))}

        </div>
      ) : accounts.length === 0 ? (
        <div className="glass-card reclaim-empty">

          <CheckCircle2
            size={42}
            className="text-cyan-300"
          />

          <p>
            No reclaimable accounts found
          </p>

        </div>
      ) : (
        <div className="reclaim-list">

          {accounts.map((account) => {

            const isReclaimed =
              reclaimed.has(account.address);

            const isReclaiming =
              reclaiming === account.address;

            return (
              <div
                key={account.address}
                className="glass-card reclaim-account-card"
              >

                <div className="reclaim-account-left">

                  <div
                    className={`reclaim-icon ${
                      isReclaimed
                        ? "reclaim-success"
                        : "reclaim-warning"
                    }`}
                  >

                    {isReclaimed ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <AlertCircle size={20} />
                    )}

                  </div>

                  <div>

                    <div className="reclaim-address">
                      {account.address.slice(
                        0,
                        16
                      )}
                      ...
                      {account.address.slice(-8)}
                    </div>

                    <div className="reclaim-meta">
                      {account.program} •{" "}
                      {(
                        account.lamports / 1e9
                      ).toFixed(6)}{" "}
                      SOL
                    </div>

                  </div>

                </div>

                {!isReclaimed && (
                  <button
                    onClick={() =>
                      handleReclaim(account)
                    }
                    disabled={isReclaiming}
                    className="reclaim-button"
                  >

                    {isReclaiming ? (
                      <>
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                        Reclaiming
                      </>
                    ) : (
                      "Reclaim"
                    )}

                  </button>
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