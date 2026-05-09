// =============================================
// Token Routes
// GET /api/v1/token/:mint — full token metadata
// =============================================

import { Router } from "express";
import { tokenController } from "../controllers/token.controller";

const router = Router();

// =============================================
// GET /api/v1/token/:mint
// Returns full token info: logo, description,
// price, decimals, market data.
// =============================================
router.get("/:mint", tokenController.getTokenInfo);

export default router;
