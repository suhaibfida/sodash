// =============================================
// Notification Settings Panel
// Configure timezone, summary times, and alerts.
// =============================================

import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";

interface NotificationSettingsPanelProps {
  walletAddress: string | null;
}

interface Settings {
  timezone: string;
  morningSummaryTime: string;
  nightSummaryTime: string;
  morningSummaryEnabled: boolean;
  nightSummaryEnabled: boolean;
  alertThreshold: number;
  notificationsEnabled: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

export function NotificationSettingsPanel({
  walletAddress,
}: NotificationSettingsPanelProps) {
  const [settings, setSettings] = useState<Settings>({
    timezone: "UTC",
    morningSummaryTime: "08:00",
    nightSummaryTime: "21:00",
    morningSummaryEnabled: true,
    nightSummaryEnabled: true,
    alertThreshold: 10,
    notificationsEnabled: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const loadSettings = async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/notifications/settings/${walletAddress}`
      );
      const data = await res.json();

      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [walletAddress]);

  const saveSettings = async () => {
    if (!walletAddress) return;

    setIsSaving(true);
    setSaveMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/v1/notifications/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          ...settings,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSaveMessage("Settings saved successfully!");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage("Failed to save settings");
      }
    } catch (err) {
      setSaveMessage("Network error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!walletAddress) return null;

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 space-y-6">
      <h3 className="text-lg font-bold text-white">Notification Settings</h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) =>
                setSettings({ ...settings, timezone: e.target.value })
              }
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {/* Morning Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Morning Summary
              </label>
              <input
                type="checkbox"
                checked={settings.morningSummaryEnabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    morningSummaryEnabled: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded"
              />
            </div>
            <input
              type="time"
              value={settings.morningSummaryTime}
              onChange={(e) =>
                setSettings({ ...settings, morningSummaryTime: e.target.value })
              }
              disabled={!settings.morningSummaryEnabled}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
          </div>

          {/* Night Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Evening Summary
              </label>
              <input
                type="checkbox"
                checked={settings.nightSummaryEnabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    nightSummaryEnabled: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded"
              />
            </div>
            <input
              type="time"
              value={settings.nightSummaryTime}
              onChange={(e) =>
                setSettings({ ...settings, nightSummaryTime: e.target.value })
              }
              disabled={!settings.nightSummaryEnabled}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
          </div>

          {/* Alert Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Drop Alert Threshold: {settings.alertThreshold}%
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={settings.alertThreshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  alertThreshold: Number(e.target.value),
                })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5%</span>
              <span>30%</span>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg py-3 font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Settings
              </>
            )}
          </button>

          {saveMessage && (
            <p
              className={`text-sm text-center ${
                saveMessage.includes("success")
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {saveMessage}
            </p>
          )}
        </>
      )}
    </div>
  );
}
