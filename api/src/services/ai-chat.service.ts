// =============================================
// AI Chat Service
// Interactive wallet intelligence assistant.
// =============================================

import prisma from "../db/client";
import { getAICompletion } from "../ai/gemini.client";
import { fetchPortfolioSnapshot } from "./portfolio.service";
import { getWalletProfile } from "./wallet-profile.service";
import { env } from "../utils/env";

const SYSTEM_PROMPT = `You are Sodash AI, an intelligent Solana wallet assistant.

Rules:
- Be concise and helpful
- Use data provided in context
- Never give financial advice
- Never hallucinate data
- Use emojis sparingly
- Be professional but friendly
- Maximum 200 words per response

You can answer:
- General crypto questions
- Wallet-specific analytics
- Portfolio analysis
- Risk assessment
- Token performance`;

/**
 * Build AI context from wallet data.
 */
async function buildWalletContext(walletAddress: string): Promise<string> {
  try {
    const [snapshot, profile, recentSnapshots, recentAlerts] = await Promise.all([
      fetchPortfolioSnapshot(walletAddress),
      getWalletProfile(walletAddress),
      prisma.walletSnapshot.findMany({
        where: { walletAddress },
        orderBy: { snapshotAt: "desc" },
        take: 5,
      }),
      prisma.alertHistory.findMany({
        where: { walletAddress },
        orderBy: { sentAt: "desc" },
        take: 5,
      }),
    ]);

    const avgValue = recentSnapshots.length > 0
      ? recentSnapshots.reduce((sum, s) => sum + s.portfolioValue, 0) / recentSnapshots.length
      : snapshot.portfolioValueUsd;

    let context = `
Wallet Context:
- Portfolio Value: $${snapshot.portfolioValueUsd.toFixed(2)}
- SOL Balance: ${snapshot.solBalance.toFixed(4)} SOL
- Risk Score: ${profile?.riskScore ?? 0}/100
- Concentration Risk: ${snapshot.concentrationRisk}
- Reclaimable SOL: ${snapshot.reclaimableSol.toFixed(4)}
- Top Holdings: ${snapshot.topHoldings.slice(0, 3).map(h => `${h.symbol} (${h.percentOfPortfolio.toFixed(1)}%)`).join(", ")}
- Top Gainers: ${snapshot.topGainers.slice(0, 3).map(g => `${g.symbol} (+${g.pnlPercent.toFixed(1)}%)`).join(", ") || "None"}
- Top Losers: ${snapshot.topLosers.slice(0, 3).map(l => `${l.symbol} (${l.pnlPercent.toFixed(1)}%)`).join(", ") || "None"}
- Avg Portfolio (5 snapshots): $${avgValue.toFixed(2)}`;

    // Add recent snapshots history
    if (recentSnapshots.length > 0) {
      context += `\n\nRecent Portfolio History (last ${recentSnapshots.length} snapshots):`;
      recentSnapshots.forEach((snap, idx) => {
        context += `\n  ${idx + 1}. ${snap.snapshotAt.toLocaleString()}: $${snap.portfolioValue.toFixed(2)} (${snap.tokenCount} tokens)`;
      });
    }

    // Add recent alerts/transactions
    if (recentAlerts.length > 0) {
      context += `\n\nRecent Alerts/Activity (last ${recentAlerts.length}):`;
      recentAlerts.forEach((alert, idx) => {
        context += `\n  ${idx + 1}. ${alert.sentAt.toLocaleString()}: ${alert.alertType} - Drop: ${alert.dropPercent.toFixed(1)}%`;
      });
    }

    return context.trim();
  } catch {
    return "Wallet data unavailable.";
  }
}

/**
 * Get or create chat session for wallet.
 */
async function getOrCreateSession(walletAddress: string): Promise<string> {
  const existing = await prisma.chatSession.findFirst({
    where: { walletAddress },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) return existing.id;

  const session = await prisma.chatSession.create({
    data: { walletAddress },
  });

  return session.id;
}

/**
 * Get recent chat history for context.
 */
async function getChatHistory(sessionId: string): Promise<string> {
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: env.AI_MAX_CHAT_HISTORY,
  });

  if (messages.length === 0) return "";

  return messages
    .reverse()
    .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");
}

/**
 * Process chat message and return AI response.
 */
export async function processChatMessage(
  walletAddress: string,
  message: string
): Promise<{ response: string; contextSummary: string }> {
  const sessionId = await getOrCreateSession(walletAddress);

  // Save user message
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: "user",
      content: message,
    },
  });

  // Build context
  const walletContext = await buildWalletContext(walletAddress);
  const chatHistory = await getChatHistory(sessionId);

  const userPrompt = `
${walletContext}

${chatHistory ? `Recent Conversation:\n${chatHistory}\n` : ""}

User Question: ${message}
`.trim();

  // Get AI response
  const response = await getAICompletion({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 400,
    temperature: 0.7,
  });

  // Save assistant response
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: "assistant",
      content: response,
    },
  });

  return {
    response,
    contextSummary: walletContext.split("\n").slice(0, 3).join("\n"),
  };
}

/**
 * Clear chat history for a wallet.
 */
export async function clearChatHistory(walletAddress: string): Promise<void> {
  await prisma.chatSession.deleteMany({
    where: { walletAddress },
  });
}
