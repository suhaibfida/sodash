// =============================================
// Price Routes
// Handles price-related API endpoints
// =============================================

import { Router } from "express";
import { priceController } from "../controllers/price.controller";

const router = Router();

// =============================================
// GET /api/v1/prices
// Get current prices for SOL and popular tokens
// =============================================
router.get("/", priceController.getPrices);

// =============================================
// GET /api/v1/prices/token/:mint
// Get price for a specific token
// =============================================
router.get("/token/:mint", priceController.getTokenPrice);

// =============================================
// GET /api/v1/prices/metadata/:mint
// Get metadata for a specific token
// =============================================
router.get("/metadata/:mint", priceController.getTokenMetadata);

export default router;