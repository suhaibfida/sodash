// =============================================
// AI Chat Routes
// Interactive wallet assistant endpoints.
// =============================================

import { Router, type Request, type Response } from "express";
import { processChatMessage, clearChatHistory } from "../services/ai-chat.service";

const router = Router();

// =============================================
// POST /api/v1/ai/chat
// Send a message to the AI assistant.
// Body: { walletAddress: string, message: string }
// =============================================
router.post("/chat", async (req: Request, res: Response) => {
  const { walletAddress, message } = req.body as {
    walletAddress?: string;
    message?: string;
  };

  if (!walletAddress || !message) {
    res.status(400).json({ error: "walletAddress and message are required." });
    return;
  }

  if (message.length > 500) {
    res.status(400).json({ error: "Message too long. Max 500 characters." });
    return;
  }

  try {
    const result = await processChatMessage(walletAddress, message);
    res.json({
      success: true,
      response: result.response,
      contextSummary: result.contextSummary,
    });
  } catch (err) {
    console.error("[ai/chat]", err);
    res.status(500).json({ error: "Failed to process message." });
  }
});

// =============================================
// DELETE /api/v1/ai/chat/:wallet
// Clear chat history for a wallet.
// =============================================
router.delete("/chat/:wallet", async (req: Request, res: Response) => {
  const { wallet } = req.params;

  if (!wallet) {
    res.status(400).json({ error: "Wallet address required." });
    return;
  }

  try {
    await clearChatHistory(wallet);
    res.json({ success: true, message: "Chat history cleared." });
  } catch (err) {
    console.error("[ai/chat/clear]", err);
    res.status(500).json({ error: "Failed to clear history." });
  }
});

export default router;
