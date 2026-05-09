// =============================================
// Wallet Routes
// Handles wallet-related API endpoints
// =============================================

import { Router } from "express";
import { walletController } from "../controllers/wallet.controller";

const router = Router();

// =============================================
// GET /api/v1/wallet/:address/summary
// Get complete wallet summary including balance, tokens, and value
// =============================================
router.get("/:address/summary", walletController.getWalletSummary);

// =============================================
// GET /api/v1/wallet/:address/tokens
// Get all token balances for a wallet
// =============================================
router.get("/:address/tokens", walletController.getWalletTokens);

// =============================================
// GET /api/v1/wallet/:address/interactions
// Get wallet interaction data (graph-derived list)
// =============================================
router.get("/:address/interactions", walletController.getWalletInteractions);

// =============================================
// GET /api/v1/wallet/:address/interaction/:target
// Get detailed interaction between wallet and a specific target address
// =============================================
router.get(
  "/:address/interaction/:target",
  walletController.getInteractionDetail,
);

export default router;
