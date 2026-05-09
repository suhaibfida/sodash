// =============================================
// Telegram Auth Routes
// Handles OTP session creation, status checks,
// and connection revocation.
// =============================================

import { Router, type Request, type Response } from "express";
import {
  createVerificationSession,
  getVerificationStatus,
  revokeConnection,
} from "../services/telegram-auth.service";

const router = Router();

// =============================================
// POST /api/v1/telegram/initiate
// Create a new OTP verification session.
// Body: { walletAddress: string }
// =============================================
router.post("/initiate", async (req: Request, res: Response) => {
  const { walletAddress } = req.body as { walletAddress?: string };

  if (!walletAddress || typeof walletAddress !== "string") {
    res.status(400).json({ error: "walletAddress is required." });
    return;
  }

  // Basic Solana address format check (32–44 base58 chars)
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
    res.status(400).json({ error: "Invalid Solana wallet address." });
    return;
  }

  try {
    const session = await createVerificationSession(walletAddress);
    res.json({
      success: true,
      sessionId: session.sessionId,
      otpCode: session.otpCode,
      expiresAt: session.expiresAt,
      botLink: session.botLink,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create session.";
    // Rate limit errors get 429
    if (message.includes("Too many")) {
      res.status(429).json({ error: message });
      return;
    }
    console.error("[telegram/initiate]", err);
    res.status(500).json({ error: message });
  }
});

// =============================================
// GET /api/v1/telegram/status/:wallet
// Check if a wallet has a verified Telegram.
// =============================================
router.get("/status/:wallet", async (req: Request, res: Response) => {
  const { wallet } = req.params;

  if (!wallet) {
    res.status(400).json({ error: "Wallet address required." });
    return;
  }

  try {
    const status = await getVerificationStatus(wallet);
    res.json({ success: true, ...status });
  } catch (err) {
    console.error("[telegram/status]", err);
    res.status(500).json({ error: "Failed to get status." });
  }
});

// =============================================
// POST /api/v1/telegram/revoke
// Revoke Telegram connection for a wallet.
// Body: { walletAddress: string }
// =============================================
router.post("/revoke", async (req: Request, res: Response) => {
  const { walletAddress } = req.body as { walletAddress?: string };

  if (!walletAddress) {
    res.status(400).json({ error: "walletAddress is required." });
    return;
  }

  try {
    await revokeConnection(walletAddress);
    res.json({ success: true, message: "Telegram connection revoked." });
  } catch (err) {
    console.error("[telegram/revoke]", err);
    res.status(500).json({ error: "Failed to revoke connection." });
  }
});

export default router;
