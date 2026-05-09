// =============================================
// Wallet & Portfolio Data Routes
// Fetch wallet data through backend (Helius RPC)
// =============================================

import { Router, type Request, type Response } from "express";
import { portfolio } from "../services/portfolio.service";
import { PublicKey } from "@solana/web3.js";

const router = Router();

// =============================================
// GET /api/v1/wallet/balance/:address
// Get current SOL balance for a wallet
// =============================================
router.get("/balance/:address", async (req: Request, res: Response) => {
  const { address } = req.params;

  if (!address) {
    res.status(400).json({ error: "Wallet address required" });
    return;
  }

  try {
    const publicKey = new PublicKey(address);
    const balance = await portfolio.getWalletBalance(publicKey);
    res.json({ success: true, balance });
  } catch (error) {
    console.error("[wallet/balance]", error);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// =============================================
// GET /api/v1/wallet/tokens/:address
// Get all token balances for a wallet
// =============================================
router.get("/tokens/:address", async (req: Request, res: Response) => {
  const { address } = req.params;

  if (!address) {
    res.status(400).json({ error: "Wallet address required" });
    return;
  }

  try {
    const publicKey = new PublicKey(address);
    const tokens = await portfolio.getTokenBalances(publicKey);
    res.json({ success: true, tokens });
  } catch (error) {
    console.error("[wallet/tokens]", error);
    res.status(500).json({ error: "Failed to fetch tokens" });
  }
});

// =============================================
// GET /api/v1/wallet/history/:address
// Get 30-day balance history
// =============================================
router.get("/history/:address", async (req: Request, res: Response) => {
  const { address } = req.params;

  if (!address) {
    res.status(400).json({ error: "Wallet address required" });
    return;
  }

  try {
    const publicKey = new PublicKey(address);
    const history = await portfolio.getBalanceHistory(publicKey);
    res.json({ success: true, history });
  } catch (error) {
    console.error("[wallet/history]", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// =============================================
// GET /api/v1/wallet/rent/:address
// Get rent-claimable token accounts
// =============================================
router.get("/rent/:address", async (req: Request, res: Response) => {
  const { address } = req.params;

  if (!address) {
    res.status(400).json({ error: "Wallet address required" });
    return;
  }

  try {
    const publicKey = new PublicKey(address);
    const rentAccounts = await portfolio.getRentAccounts(publicKey);
    res.json({ success: true, rentAccounts });
  } catch (error) {
    console.error("[wallet/rent]", error);
    res.status(500).json({ error: "Failed to fetch rent accounts" });
  }
});

// =============================================
// GET /api/v1/wallet/token/:mint/:address
// Get details for a specific token
// =============================================
router.get("/token/:mint/:address", async (req: Request, res: Response) => {
  const { mint, address } = req.params;

  if (!mint || !address) {
    res.status(400).json({ error: "Mint and wallet address required" });
    return;
  }

  try {
    const publicKey = new PublicKey(address);
    const detail = await portfolio.getTokenDetail(mint, publicKey);
    res.json({ success: true, detail });
  } catch (error) {
    console.error("[wallet/token]", error);
    res.status(500).json({ error: "Failed to fetch token details" });
  }
});

// =============================================
// GET /api/v1/wallet/interactions/:address
// Get wallet interaction graph/mesh
// =============================================
router.get("/interactions/:address", async (req: Request, res: Response) => {
  const { address } = req.params;

  if (!address) {
    res.status(400).json({ error: "Wallet address required" });
    return;
  }

  try {
    const publicKey = new PublicKey(address);
    const graphData = await portfolio.getAddressInteractions(publicKey);
    res.json({ success: true, graphData });
  } catch (error) {
    console.error("[wallet/interactions]", error);
    res.status(500).json({ error: "Failed to fetch interactions" });
  }
});

// =============================================
// GET /api/v1/wallet/interaction/:address/:target
// Get detailed interaction with specific address
// =============================================
router.get("/interaction/:address/:target", async (req: Request, res: Response) => {
  const { address, target } = req.params;

  if (!address || !target) {
    res.status(400).json({ error: "Wallet and target address required" });
    return;
  }

  try {
    const publicKey = new PublicKey(address);
    const detail = await portfolio.getInteractionDetail(target, publicKey);
    res.json({ success: true, detail });
  } catch (error) {
    console.error("[wallet/interaction]", error);
    res.status(500).json({ error: "Failed to fetch interaction details" });
  }
});

export default router;
