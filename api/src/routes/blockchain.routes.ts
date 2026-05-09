// =============================================
// Blockchain Routes
// Handles blockchain data API endpoints
// =============================================

import { Router } from "express";
import { blockchainController } from "../controllers/blockchain.controller";

const router = Router();

// =============================================
// GET /api/v1/blockchain/graph/:address
// Get wallet interaction graph data
// =============================================
router.get("/graph/:address", blockchainController.getWalletGraph);

export default router;