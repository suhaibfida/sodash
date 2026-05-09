// =============================================
// Notifications Routes
// Manage user notification preferences:
// timezone, summary times, alert thresholds,
// and toggle notifications on/off.
// =============================================

import { Router, type Request, type Response } from "express";
import prisma from "../db/client";

const router = Router();

// =============================================
// GET /api/v1/notifications/settings/:wallet
// Get notification settings for a wallet.
// =============================================
router.get("/settings/:wallet", async (req: Request, res: Response) => {
  const { wallet } = req.params;

  try {
    // Upsert defaults so the response always has data
    const settings = await prisma.notificationSettings.upsert({
      where: { walletAddress: wallet },
      create: { walletAddress: wallet },
      update: {},
    });

    const connection = await prisma.telegramConnection.findUnique({
      where: { walletAddress: wallet },
    });

    res.json({
      success: true,
      settings: {
        timezone: settings.timezone,
        morningSummaryTime: settings.morningSummaryTime,
        nightSummaryTime: settings.nightSummaryTime,
        morningSummaryEnabled: settings.morningSummaryEnabled,
        nightSummaryEnabled: settings.nightSummaryEnabled,
        alertThreshold: settings.alertThreshold,
        notificationsEnabled: connection?.notificationsEnabled ?? false,
      },
    });
  } catch (err) {
    console.error("[notifications/settings GET]", err);
    res.status(500).json({ error: "Failed to fetch settings." });
  }
});

// =============================================
// PUT /api/v1/notifications/settings
// Save notification settings.
// Body: {
//   walletAddress, timezone, morningSummaryTime,
//   nightSummaryTime, morningSummaryEnabled,
//   nightSummaryEnabled, alertThreshold
// }
// =============================================
router.put("/settings", async (req: Request, res: Response) => {
  const {
    walletAddress,
    timezone,
    morningSummaryTime,
    nightSummaryTime,
    morningSummaryEnabled,
    nightSummaryEnabled,
    alertThreshold,
  } = req.body as {
    walletAddress?: string;
    timezone?: string;
    morningSummaryTime?: string;
    nightSummaryTime?: string;
    morningSummaryEnabled?: boolean;
    nightSummaryEnabled?: boolean;
    alertThreshold?: number;
  };

  if (!walletAddress) {
    res.status(400).json({ error: "walletAddress is required." });
    return;
  }

  // Validate time format HH:MM
  const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;
  if (morningSummaryTime && !timeRegex.test(morningSummaryTime)) {
    res.status(400).json({ error: "Invalid morningSummaryTime format. Use HH:MM." });
    return;
  }
  if (nightSummaryTime && !timeRegex.test(nightSummaryTime)) {
    res.status(400).json({ error: "Invalid nightSummaryTime format. Use HH:MM." });
    return;
  }

  // Validate threshold range
  if (
    alertThreshold !== undefined &&
    (alertThreshold < 1 || alertThreshold > 50)
  ) {
    res.status(400).json({ error: "alertThreshold must be between 1 and 50." });
    return;
  }

  try {
    // Ensure user record exists
    await prisma.user.upsert({
      where: { walletAddress },
      create: { walletAddress },
      update: {},
    });

    const updated = await prisma.notificationSettings.upsert({
      where: { walletAddress },
      create: {
        walletAddress,
        timezone: timezone ?? "UTC",
        morningSummaryTime: morningSummaryTime ?? "08:00",
        nightSummaryTime: nightSummaryTime ?? "21:00",
        morningSummaryEnabled: morningSummaryEnabled ?? true,
        nightSummaryEnabled: nightSummaryEnabled ?? true,
        alertThreshold: alertThreshold ?? 10,
      },
      update: {
        ...(timezone !== undefined && { timezone }),
        ...(morningSummaryTime !== undefined && { morningSummaryTime }),
        ...(nightSummaryTime !== undefined && { nightSummaryTime }),
        ...(morningSummaryEnabled !== undefined && { morningSummaryEnabled }),
        ...(nightSummaryEnabled !== undefined && { nightSummaryEnabled }),
        ...(alertThreshold !== undefined && { alertThreshold }),
      },
    });

    res.json({ success: true, settings: updated });
  } catch (err) {
    console.error("[notifications/settings PUT]", err);
    res.status(500).json({ error: "Failed to save settings." });
  }
});

// =============================================
// POST /api/v1/notifications/toggle
// Enable or disable notifications for a wallet.
// Body: { walletAddress: string, enabled: boolean }
// =============================================
router.post("/toggle", async (req: Request, res: Response) => {
  const { walletAddress, enabled } = req.body as {
    walletAddress?: string;
    enabled?: boolean;
  };

  if (!walletAddress || enabled === undefined) {
    res.status(400).json({ error: "walletAddress and enabled are required." });
    return;
  }

  try {
    const connection = await prisma.telegramConnection.findUnique({
      where: { walletAddress },
    });

    if (!connection) {
      res.status(404).json({ error: "No Telegram connection found for this wallet." });
      return;
    }

    await prisma.telegramConnection.update({
      where: { walletAddress },
      data: { notificationsEnabled: enabled },
    });

    res.json({
      success: true,
      notificationsEnabled: enabled,
    });
  } catch (err) {
    console.error("[notifications/toggle]", err);
    res.status(500).json({ error: "Failed to toggle notifications." });
  }
});

export default router;
