// =============================================
// Notifications Page
// Telegram OTP verification + notification
// settings (timezone, summary times, alerts).
// =============================================

import { useEffect, useState, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Bell,
  BellOff,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Globe,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  Unlink,
} from "lucide-react";

// =============================================
// CONSTANTS
// =============================================

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Common IANA timezones for the selector
const TIMEZONES = [
  { label: "UTC", value: "UTC" },
  { label: "Asia/Kolkata (IST +5:30)", value: "Asia/Kolkata" },
  { label: "Asia/Dubai (GST +4:00)", value: "Asia/Dubai" },
  { label: "Asia/Singapore (SGT +8:00)", value: "Asia/Singapore" },
  { label: "Asia/Tokyo (JST +9:00)", value: "Asia/Tokyo" },
  { label: "Asia/Shanghai (CST +8:00)", value: "Asia/Shanghai" },
  { label: "Europe/London (GMT/BST)", value: "Europe/London" },
  { label: "Europe/Paris (CET +1:00)", value: "Europe/Paris" },
  { label: "Europe/Berlin (CET +1:00)", value: "Europe/Berlin" },
  { label: "America/New_York (EST -5:00)", value: "America/New_York" },
  { label: "America/Chicago (CST -6:00)", value: "America/Chicago" },
  { label: "America/Denver (MST -7:00)", value: "America/Denver" },
  { label: "America/Los_Angeles (PST -8:00)", value: "America/Los_Angeles" },
  { label: "America/Sao_Paulo (BRT -3:00)", value: "America/Sao_Paulo" },
  { label: "Australia/Sydney (AEDT +11:00)", value: "Australia/Sydney" },
  { label: "Pacific/Auckland (NZDT +13:00)", value: "Pacific/Auckland" },
];

// =============================================
// TYPES
// =============================================

interface TelegramStatus {
  verified: boolean;
  telegramUsername?: string;
  notificationsEnabled: boolean;
}

interface NotificationSettings {
  timezone: string;
  morningSummaryTime: string;
  nightSummaryTime: string;
  morningSummaryEnabled: boolean;
  nightSummaryEnabled: boolean;
  alertThreshold: number;
  notificationsEnabled: boolean;
}

// =============================================
// COMPONENT
// =============================================

const Notifications = () => {
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? "";

  // ---- Telegram state ----
  const [tgStatus, setTgStatus] = useState<TelegramStatus>({
    verified: false,
    notificationsEnabled: false,
  });

  const [tgLoading, setTgLoading] = useState(false);

  /* RESTORE SAVED OTP FLOW */
  const [otp, setOtp] = useState<string | null>(() => {
    return localStorage.getItem("telegram-otp");
  });

  const [otpExpiry, setOtpExpiry] = useState<Date | null>(() => {
    const saved = localStorage.getItem("telegram-expiry");

    return saved ? new Date(saved) : null;
  });

  const [botLink, setBotLink] = useState<string | null>(() => {
    return localStorage.getItem("telegram-bot-link");
  });

  const [otpCopied, setOtpCopied] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [revoking, setRevoking] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);

  // ---- Settings state ----
  const [settings, setSettings] = useState<NotificationSettings>({
    timezone: "UTC",
    morningSummaryTime: "08:00",
    nightSummaryTime: "21:00",
    morningSummaryEnabled: true,
    nightSummaryEnabled: true,
    alertThreshold: 10,
    notificationsEnabled: false,
  });

  const [settingsLoading, setSettingsLoading] = useState(false);

  const [settingsSaved, setSettingsSaved] = useState(false);

  const [tzSearch, setTzSearch] = useState("");

  const [tzOpen, setTzOpen] = useState(false);

  const tzRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tzOpen &&
        tzRef.current &&
        !tzRef.current.contains(event.target as Node)
      ) {
        setTzOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [tzOpen]);

  // =============================================
  // FETCH INITIAL STATUS + SETTINGS
  // =============================================

  const fetchStatus = useCallback(async () => {
    if (!walletAddress) return;

    setInitialLoading(true);

    try {
      const [statusRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/telegram/status/${walletAddress}`),
        fetch(`${API_BASE}/api/v1/notifications/settings/${walletAddress}`),
      ]);

      const statusData = await statusRes.json();

      const settingsData = await settingsRes.json();

      setTgStatus({
        verified: statusData.verified ?? false,
        telegramUsername: statusData.telegramUsername,
        notificationsEnabled: statusData.notificationsEnabled ?? false,
      });

      if (settingsData.settings) {
        setSettings(settingsData.settings);
      }
    } catch (err) {
      console.error("[notifications] fetchStatus error:", err);
    } finally {
      setInitialLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (connected && walletAddress) {
      fetchStatus();
    }
  }, [connected, walletAddress, fetchStatus]);

  // =============================================
  // POLLING — check verification every 3s
  // =============================================

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    pollingRef.current = setInterval(async () => {
      if (!walletAddress) return;

      try {
        const res = await fetch(
          `${API_BASE}/api/v1/telegram/status/${walletAddress}`
        );

        const data = await res.json();

        if (data.verified) {
          setTgStatus({
            verified: true,
            telegramUsername: data.telegramUsername,
            notificationsEnabled: data.notificationsEnabled,
          });

          setOtp(null);

          setBotLink(null);

          setOtpExpiry(null);

          localStorage.removeItem("telegram-flow");

          localStorage.removeItem("telegram-otp");

          localStorage.removeItem("telegram-bot-link");

          localStorage.removeItem("telegram-expiry");

          stopPolling();
        }
      } catch {}
    }, 3000);
  }, [walletAddress]);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  // =============================================
  // INITIATE TELEGRAM VERIFICATION
  // =============================================

  const handleConnectTelegram = async () => {
    if (!walletAddress) return;

    setTgLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/telegram/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to initiate verification.");
      }

      setOtp(data.otpCode);

      setOtpExpiry(new Date(data.expiresAt));

      setBotLink(data.botLink);

      /* SAVE FLOW FOR MOBILE */
      localStorage.setItem("telegram-flow", "otp");

      localStorage.setItem("telegram-otp", data.otpCode);

      localStorage.setItem("telegram-bot-link", data.botLink);

      localStorage.setItem("telegram-expiry", data.expiresAt);

      // Open bot
      window.open(data.botLink, "_blank", "noopener,noreferrer");

      // Start polling
      startPolling();
    } catch (err) {
      console.error("[notifications] connect telegram error:", err);

      alert(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setTgLoading(false);
    }
  };

  // =============================================
  // REVOKE
  // =============================================

  const handleRevoke = async () => {
    if (
      !walletAddress ||
      !confirm("Disconnect Telegram? Notifications will be disabled.")
    )
      return;

    setRevoking(true);

    try {
      await fetch(`${API_BASE}/api/v1/telegram/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      setTgStatus({
        verified: false,
        notificationsEnabled: false,
      });

      setOtp(null);

      setBotLink(null);

      setOtpExpiry(null);

      localStorage.removeItem("telegram-flow");

      localStorage.removeItem("telegram-otp");

      localStorage.removeItem("telegram-bot-link");

      localStorage.removeItem("telegram-expiry");

      stopPolling();
    } catch (err) {
      console.error("[notifications] revoke error:", err);
    } finally {
      setRevoking(false);
    }
  };

  // =============================================
  // SAVE SETTINGS
  // =============================================

  const handleSaveSettings = async () => {
    if (!walletAddress) return;

    setSettingsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/notifications/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, ...settings }),
      });

      if (!res.ok) throw new Error("Failed to save settings.");

      setSettingsSaved(true);

      setTimeout(() => setSettingsSaved(false), 2500);
    } catch (err) {
      console.error("[notifications] save settings error:", err);
    } finally {
      setSettingsLoading(false);
    }
  };

  // =============================================
  // TOGGLE NOTIFICATIONS
  // =============================================

  const handleToggle = async (enabled: boolean) => {
    if (!walletAddress) return;

    try {
      await fetch(`${API_BASE}/api/v1/notifications/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, enabled }),
      });

      setTgStatus((prev) => ({
        ...prev,
        notificationsEnabled: enabled,
      }));

      setSettings((prev) => ({
        ...prev,
        notificationsEnabled: enabled,
      }));
    } catch (err) {
      console.error("[notifications] toggle error:", err);
    }
  };

  // =============================================
  // OTP COPY
  // =============================================

  const copyOtp = () => {
    if (otp) {
      navigator.clipboard.writeText(otp);

      setOtpCopied(true);

      setTimeout(() => setOtpCopied(false), 2000);
    }
  };

  const filteredTimezones = TIMEZONES.filter(
    (tz) =>
      tz.label.toLowerCase().includes(tzSearch.toLowerCase()) ||
      tz.value.toLowerCase().includes(tzSearch.toLowerCase())
  );

  // =============================================
  // NOT CONNECTED
  // =============================================

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-xl shadow-violet-500/20">
          <Bell size={28} className="text-white" />
        </div>

        <p className="text-gray-400 text-sm">
          Connect your wallet to manage notifications
        </p>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 size={32} className="text-violet-400 animate-spin" />

        <p className="text-gray-400 text-sm">
          Loading notification settings...
        </p>
      </div>
    );
  }

  return (
    <div className="notifications-shell w-full max-w-2xl mx-auto px-1 space-y-1 min-h-screen">

      {/* =========================================
          SECTION 1 — TELEGRAM CONNECT
      ========================================= */}
      <div className="glass-panel mt-1 p-4 rounded-xl border border-gray-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#229ED9]/10 flex items-center justify-center">
              <Send size={20} className="text-[#229ED9]" />
            </div>
            <div>
              <h2 className="text-md font-bold text-white">Telegram</h2>
              <p className="text-[9px] text-gray-500">Receive alerts and summaries</p>
            </div>
          </div>

          {/* Status badge */}
          {tgStatus.verified ? (
            <span className="flex items-center gap-1 text-[13px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
              <CheckCircle2 size={15} />
              Connected
              {tgStatus.telegramUsername && <span className="text-green-300/70">@{tgStatus.telegramUsername}</span>}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
              <XCircle size={10} />
              Not connected
            </span>
          )}
        </div>

        {/* Connected state */}
        {tgStatus.verified ? (
          <div className="space-y-2">
            {/* Notifications toggle */}
            <div className="flex items-center justify-between bg-gray-800/60 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5">
                {settings.notificationsEnabled ? (
                  <Bell size={18} className="text-violet-400" />
                ) : (
                  <BellOff size={18} className="text-gray-500" />
                )}
                <span className="text-sm pt-1 text-white">Notifications</span>
              </div>
              <button
                id="notifications-toggle"
                onClick={() => handleToggle(!settings.notificationsEnabled)}
                className={`relative w-9 h-5 rounded-full transition-all duration-300 ${settings.notificationsEnabled
                  ? "bg-violet-600"
                  : "bg-gray-700"
                  }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${settings.notificationsEnabled ? "left-[18px]" : "left-0.5"
                    }`}
                />
              </button>
            </div>

            <button
              id="revoke-telegram-btn"
              onClick={handleRevoke}
              disabled={revoking}
              className="flex items-center ml-auto px-2 border rounded-full text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >

              {revoking ? <Loader2 size={10} className="animate-spin" /> : <Unlink size={10} />}

              Disconnect
            </button>
          </div>
        ) : (
          /* Not connected — OTP flow */
          <div className="space-y-1">
            {!otp ? (
              <button
                id="connect-telegram-btn"
                onClick={handleConnectTelegram}
                disabled={tgLoading}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#229ED9] hover:bg-[#1a8fc7] text-white text-xs font-semibold transition-all disabled:opacity-60"
              >
                {tgLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
                {tgLoading ? "Generating OTP…" : "Connect Telegram"}
              </button>
            ) : (
              /* OTP display */
              <div className="space-y-2">
                <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 text-[12px]">
                    <AlertTriangle size={12} />
                    <span>Enter this OTP in the Telegram bot</span>
                  </div>

                  <button
                    id="otp-copy-btn"
                    onClick={copyOtp}
                    className="w-full font-mono text-2xl font-bold text-white tracking-widest text-center py-1.5 hover:text-violet-300 transition-colors cursor-pointer"
                  >
                    {otp}
                  </button>
                  <p className="text-center text-[12px] text-gray-300">
                    {otpCopied ? "✓ Copied!" : "Click to copy"}{" "}
                    {otpExpiry && `· Expires at ${otpExpiry.toLocaleTimeString()}`}
                  </p>
                </div>

                <div className="flex gap-2">
                  <a
                    href={botLink ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#229ED9]/10 border border-[#229ED9]/30 text-[#229ED9] text-[13px] font-medium hover:bg-[#229ED9]/20 transition-all"
                  >
                    <Send size={13} />
                    Open Bot
                  </a>
                  <button
                    onClick={() => {
  setOtp(null);

  setBotLink(null);

  setOtpExpiry(null);

  localStorage.removeItem("telegram-flow");

  localStorage.removeItem("telegram-otp");

  localStorage.removeItem("telegram-bot-link");

  localStorage.removeItem("telegram-expiry");

  stopPolling();
}}
                    className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-gray-800 text-gray-400 text-[10px] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 text-center">
  If Telegram opens without the Sodash bot the first time,
  press <span className="text-[#229ED9] font-medium">Open Bot</span> again.
</p>


                

                <div className="flex items-center gap-2 text-[12px] text-gray-500">
                  <Loader2 size={12} className="animate-spin text-violet-400" />
                  Waiting for verification…
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================
          SECTION 2 — SCHEDULE SETTINGS
          (only show when Telegram is connected)
      ========================================= */}
      {tgStatus.verified && (
        <div className="glass-panel p-2 rounded-xl border border-gray-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-600/10 flex items-center justify-center">
                <Clock size={15} className="text-violet-400" />
              </div>
              <div>
                <h2 className="text-md font-bold text-white">Summary Schedule</h2>
                <p className="text-[11px] text-gray-500">Morning and evening AI reports</p>
              </div>
            </div>

            {/* Save button - top right */}
            <button
              id="save-settings-btn-top"
              onClick={handleSaveSettings}
              disabled={settingsLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${settingsSaved
                ? "bg-green-600/20 text-green-400 border border-green-600/30"
                : "bg-violet-600 hover:bg-violet-700 text-white"
                } disabled:opacity-60`}
            >
              {settingsLoading ? (
                <Loader2 size={10} className="animate-spin" />
              ) : settingsSaved ? (
                <>
                  <CheckCircle2 size={10} />
                  <span className="hidden sm:inline">Saved</span>
                </>
              ) : (
                <>
                  <RefreshCw size={10} />
                  <span className="hidden sm:inline">Save</span>
                </>
              )}
            </button>
          </div>

          {/* Timezone selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-gray-400 flex items-center gap-1">
              <Globe size={10} /> Timezone
            </label>
            <div className="relative" ref={tzRef}>
              <button
                id="timezone-selector"
                onClick={() => setTzOpen(!tzOpen)}
                className="w-full flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white hover:border-gray-600 transition-colors"
              >
                <span>{TIMEZONES.find((t) => t.value === settings.timezone)?.label ?? settings.timezone}</span>
                <ChevronDown size={12} className={`text-gray-400 transition-transform ${tzOpen ? "rotate-180" : ""}`} />
              </button>

              {tzOpen && (
                <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-gray-800">
                    <input
                      autoFocus
                      placeholder="Search timezone…"
                      value={tzSearch}
                      onChange={(e) => setTzSearch(e.target.value)}
                      className="w-full bg-gray-800 text-white text-[10px] px-2.5 py-1 rounded-lg outline-none placeholder-gray-600"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredTimezones.map((tz) => (
                      <button
                        key={tz.value}
                        onClick={() => {
                          setSettings((s) => ({ ...s, timezone: tz.value }));
                          setTzOpen(false);
                          setTzSearch("");
                        }}
                        className={`w-full text-left px-2.5 py-1 text-[10px] hover:bg-gray-800 transition-colors ${settings.timezone === tz.value ? "text-violet-400" : "text-gray-300"
                          }`}
                      >
                        {tz.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Morning summary */}
          <div className="flex items-center justify-between bg-gray-800/40 rounded-lg p-2.5">
            <div className="flex items-center gap-2">
              <span className="text-base">🌅</span>
              <div>
                <p className="text-[12px] font-medium text-white">Morning Summary</p>
                <p className="text-[10px] text-gray-500">Daily portfolio overview</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                id="morning-time-input"
                value={settings.morningSummaryTime}
                onChange={(e) => setSettings((s) => ({ ...s, morningSummaryTime: e.target.value }))}
                disabled={!settings.morningSummaryEnabled}
                className="bg-gray-900 border border-gray-700 text-white text-[10px] rounded-lg px-1.5 py-1 disabled:opacity-40"
              />
              <button
                onClick={() => setSettings((s) => ({ ...s, morningSummaryEnabled: !s.morningSummaryEnabled }))}
                className={`relative w-9 h-5 rounded-full transition-all duration-300 ${settings.morningSummaryEnabled ? "bg-violet-600" : "bg-gray-700"
                  }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${settings.morningSummaryEnabled ? "left-[18px]" : "left-0.5"
                    }`}
                />
              </button>
            </div>
          </div>

          {/* Night summary */}
          <div className="flex items-center justify-between bg-gray-800/40 rounded-lg p-2.5">
            <div className="flex items-center gap-2">
              <span className="text-base">🌙</span>
              <div>
                <p className="text-[12px] font-medium text-white">Evening Recap</p>
                <p className="text-[10px] text-gray-500">End-of-day performance</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                id="night-time-input"
                value={settings.nightSummaryTime}
                onChange={(e) => setSettings((s) => ({ ...s, nightSummaryTime: e.target.value }))}
                disabled={!settings.nightSummaryEnabled}
                className="bg-gray-900 border border-gray-700 text-white text-[10px] rounded-lg px-1.5 py-1 disabled:opacity-40"
              />
              <button
                onClick={() => setSettings((s) => ({ ...s, nightSummaryEnabled: !s.nightSummaryEnabled }))}
                className={`relative w-9 h-5 rounded-full transition-all duration-300 ${settings.nightSummaryEnabled ? "bg-violet-600" : "bg-gray-700"
                  }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${settings.nightSummaryEnabled ? "left-[18px]" : "left-0.5"
                    }`}
                />
              </button>
            </div>
          </div>

          {/* =========================================
              SECTION 3 — ALERT THRESHOLD
          ========================================= */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={12} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-[12px] font-bold text-white">Drop Alert Threshold</h3>
                <p className="text-[11px] text-gray-400">Alert when portfolio drops by this %</p>
              </div>
              <span className="ml-auto text-xs font-bold text-red-400">
                {settings.alertThreshold}%
              </span>
            </div>

            <input
              id="alert-threshold-slider"
              type="range"
              min={5}
              max={30}
              step={5}
              value={settings.alertThreshold}
              onChange={(e) => setSettings((s) => ({ ...s, alertThreshold: Number(e.target.value) }))}
              className="w-full h-1 bg-gray-500 rounded-full appearance-none cursor-pointer accent-red-500"
            />
            <div className="flex justify-between text-[9px] text-gray-300">
              <span>5%</span>
              <span>10%</span>
              <span>15%</span>
              <span>20%</span>
              <span>25%</span>
              <span>30%</span>
            </div>
          </div>

          {/* Remove bottom save button */}
        </div>
      )}
    </div>
  );
};

export default Notifications;
