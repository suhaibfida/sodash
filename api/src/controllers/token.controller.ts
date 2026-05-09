// =============================================
// Token Controller
// Handles full token info endpoint
// =============================================

import type { Request, Response } from "express";
import { priceService } from "../services/price/price.service";

export class TokenController {
  async getTokenInfo(req: Request, res: Response) {
    try {
      const mint = String(req.params.mint || "");
      if (!mint) return res.status(400).json({ error: "Mint required" });

      const info = await priceService.getFullTokenInfo(mint);
      if (!info) return res.status(404).json({ error: "Token not found" });

      res.json(info);
    } catch (err) {
      console.error("[TokenController] getTokenInfo error:", err);
      res.status(500).json({ error: "Failed to fetch token info" });
    }
  }
}

export const tokenController = new TokenController();
