// =============================================
// Blockchain Controller
// Handles blockchain data API endpoints
// =============================================

import type { Request, Response } from "express";
import { blockchainService } from "../services/blockchain/blockchain.service";

export class BlockchainController {
  async getWalletGraph(req: Request, res: Response) {
    try {
      const address = String(req.params.address || "");

      if (!address) {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      const graph = await blockchainService.getWalletGraph(address);
      res.json(graph);
    } catch (error) {
      console.error("[BlockchainController] getWalletGraph error:", error);
      res.status(500).json({ error: "Failed to fetch wallet graph" });
    }
  }
}

export const blockchainController = new BlockchainController();
