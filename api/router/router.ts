// =============================================
// Main API Router
// Routes all API endpoints
// =============================================

import { Router } from "express";
import walletRoutes from "../src/routes/wallet.routes";
import priceRoutes from "../src/routes/price.routes";
import blockchainRoutes from "../src/routes/blockchain.routes";
import tokenRoutes from "../src/routes/token.routes";

const router = Router();

// Debug middleware
router.use((req, res, next) => {
  console.log(`[Router] ${req.method} ${req.path}`);
  next();
});

// Mount route groups
router.use("/wallet", walletRoutes);
router.use("/prices", priceRoutes);
router.use("/blockchain", blockchainRoutes);
router.use("/token", tokenRoutes);

export default router;
