// =============================================
// AI Summary Service
// Generates human-friendly portfolio summaries.
// Preprocesses metrics — never sends raw JSON
// or wallet data directly to AI.
// =============================================

import { getAICompletion } from "../ai/gemini.client";

export interface TokenPnL {
  symbol: string;
  pnlPercent: number;
  pnlUsd: number;
}

export interface TokenHolding {
  symbol: string;
  usdValue: number;
  percentOfPortfolio: number;
}

export interface PortfolioSummaryInput {
  portfolioValue: number;
  portfolioChange: number;      // % change vs previous snapshot
  portfolioChangeUsd: number;   // USD change
  topGainers: TokenPnL[];
  topLosers: TokenPnL[];
  topHoldings: TokenHolding[];
  concentrationRisk: string;    // "LOW" | "MEDIUM" | "HIGH"
  reclaimableSol: number;
  summaryType: "MORNING" | "NIGHT";
  timezone?: string;
}

const SYSTEM_PROMPT = `You are a concise, professional crypto portfolio assistant for the Sodash app.

Rules:
- Maximum 150 words
- Professional but friendly tone
- No financial advice
- Never tell users to buy, sell, hold, or invest
- Use emojis sparingly for important metrics only (📈 📉 💰 🔴 🟢)
- Be direct, data-focused, and easy to read
- Never hallucinate or invent missing data
- Focus on portfolio insights, risk awareness, and behavioral guidance
- Help users stay rational during volatility
- If portfolio is heavily concentrated, mention exposure risk calmly
- If portfolio drops sharply, encourage emotional discipline and avoiding panic reactions
- If portfolio performs well, encourage balanced expectations and avoiding overconfidence
- Highlight wallet efficiency opportunities like reclaimable SOL when relevant
- Speak like a calm portfolio analyst, not a hype influencer

Your job is to summarize the portfolio clearly using ONLY the provided metrics.`;
/**
 * Generate a human-friendly portfolio summary from structured metrics.
 * @param data Preprocessed portfolio analytics
 */
export async function generatePortfolioSummary(
  data: PortfolioSummaryInput
): Promise<string> {
  const timeLabel = data.summaryType === "MORNING" ? "Morning" : "Evening";
  const changeSign = data.portfolioChange >= 0 ? "+" : "";
  const changeEmoji = data.portfolioChange >= 0 ? "📈" : "📉";

  // Build compact prompt — no raw JSON blobs
  const gainersText = data.topGainers
    .slice(0, 3)
    .map((t) => `${t.symbol} (${t.pnlPercent >= 0 ? "+" : ""}${t.pnlPercent.toFixed(1)}%)`)
    .join(", ");

  const losersText = data.topLosers
    .slice(0, 3)
    .map((t) => `${t.symbol} (${t.pnlPercent.toFixed(1)}%)`)
    .join(", ");

  const holdingsText = data.topHoldings
    .slice(0, 3)
    .map((t) => `${t.symbol} (${t.percentOfPortfolio.toFixed(1)}%)`)
    .join(", ");

  const userPrompt = `
${timeLabel} Portfolio Summary:
- Total Value: $${data.portfolioValue.toFixed(2)}
- Change: ${changeSign}${data.portfolioChange.toFixed(2)}% (${changeSign}$${data.portfolioChangeUsd.toFixed(2)}) ${changeEmoji}
- Top Gainers: ${gainersText || "None"}
- Top Losers: ${losersText || "None"}
- Top Holdings: ${holdingsText || "None"}
- Concentration Risk: ${data.concentrationRisk}
- Reclaimable SOL: ${data.reclaimableSol.toFixed(4)} SOL

Generate a ${timeLabel.toLowerCase()} summary for this Solana wallet portfolio.
`.trim();

  return getAICompletion({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 250,
    temperature: 0.65,
  });
}

/**
 * Generate a short alert explanation for a portfolio drop.
 */
export async function generateDropAlertExplanation(params: {
  dropPercent: number;
  portfolioValue: number;
  topLosers: TokenPnL[];
}): Promise<string> {
  const losersText = params.topLosers
    .slice(0, 3)
    .map((t) => `${t.symbol} (${t.pnlPercent.toFixed(1)}%)`)
    .join(", ");

  const userPrompt = `
Portfolio Alert:
- Drop: ${params.dropPercent.toFixed(2)}% in the last hour
- Current Value: $${params.portfolioValue.toFixed(2)}
- Biggest Losers: ${losersText || "Unknown"}

Write a 2-sentence alert explanation. Be factual, no advice.
`.trim();

  return getAICompletion({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 100,
    temperature: 0.5,
  });
}
