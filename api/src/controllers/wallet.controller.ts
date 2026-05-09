// =============================================
// Wallet Controller
// Handles wallet-related API endpoints
// =============================================

import type { Request, Response } from "express";
import { blockchainService } from "../services/blockchain/blockchain.service";
import { priceService } from "../services/price/price.service";

// Express 5 types req.params values as string | string[] | undefined; coerce to string
function param(val: string | string[] | undefined): string {
  if (val === undefined) return "";
  return Array.isArray(val) ? (val[0] ?? "") : val;
}

export class WalletController {
  async getWalletSummary(req: Request, res: Response) {
    try {
      const address = param(req.params.address);

      if (!address) {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      const summary = await blockchainService.getWalletSummary(address);
      res.json(summary);
    } catch (error) {
      console.error("[WalletController] getWalletSummary error:", error);
      res.status(500).json({ error: "Failed to fetch wallet summary" });
    }
  }

  async getWalletTokens(req: Request, res: Response) {
    try {
      const address = param(req.params.address);

      if (!address) {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      const summary = await blockchainService.getWalletSummary(address);
      res.json(summary.tokens);
    } catch (error) {
      console.error("[WalletController] getWalletTokens error:", error);
      res.status(500).json({ error: "Failed to fetch wallet tokens" });
    }
  }

  async getWalletInteractions(req: Request, res: Response) {
    try {
      const address = param(req.params.address);

      if (!address) {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      const interactions =
        await blockchainService.getWalletInteractions(address);
      res.json(interactions);
    } catch (error) {
      console.error("[WalletController] getWalletInteractions error:", error);
      res.status(500).json({ error: "Failed to fetch wallet interactions" });
    }
  }

  // =============================================
  // GET /api/v1/wallet/:address/interaction/:target
  // Returns detailed interaction info between a wallet and a target address
  // =============================================
  async getInteractionDetail(req: Request, res: Response) {
    try {
      const address = param(req.params.address);
      const target = param(req.params.target);

      if (!address) {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      if (!target) {
        return res.status(400).json({ error: "Target address is required" });
      }

      const detail = await blockchainService.getInteractionDetail(
        target,
        address,
      );
      res.json(detail);
    } catch (error) {
      console.error("[WalletController] getInteractionDetail error:", error);
      res.status(500).json({ error: "Failed to fetch interaction detail" });
    }
  }
}

export const walletController = new WalletController();
