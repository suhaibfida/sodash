// =============================================
// Price Controller
// Handles price-related API endpoints
// =============================================

import type { Request, Response } from "express";
import { priceService } from "../services/price/price.service";

export class PriceController {
  async getPrices(req: Request, res: Response) {
    try {
      const solPrice = await priceService.getSolPrice();
      res.json({
        sol: solPrice,
        tokens: {},
      });
    } catch (error) {
      console.error("[PriceController] getPrices error:", error);
      res.status(500).json({ error: "Failed to fetch prices" });
    }
  }

  async getTokenPrice(req: Request, res: Response) {
    try {
      const mint = String(req.params.mint || "");

      if (!mint) {
        return res.status(400).json({ error: "Token mint is required" });
      }

      const prices = await priceService.getTokenPrices([mint]);
      const price = prices[mint];

      if (!price) {
        return res.status(404).json({ error: "Token price not found" });
      }

      res.json(price);
    } catch (error) {
      console.error("[PriceController] getTokenPrice error:", error);
      res.status(500).json({ error: "Failed to fetch token price" });
    }
  }

  async getTokenMetadata(req: Request, res: Response) {
    try {
      const mint = String(req.params.mint || "");

      if (!mint) {
        return res.status(400).json({ error: "Token mint is required" });
      }

      const metadata = await priceService.getTokenMetadata(mint);

      if (!metadata) {
        return res.status(404).json({ error: "Token metadata not found" });
      }

      res.json(metadata);
    } catch (error) {
      console.error("[PriceController] getTokenMetadata error:", error);
      res.status(500).json({ error: "Failed to fetch token metadata" });
    }
  }
}

export const priceController = new PriceController();
