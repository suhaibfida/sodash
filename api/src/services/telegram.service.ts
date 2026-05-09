// =============================================
// Telegram Service
// Sends messages, alerts, and summaries
// through the Telegraf bot instance.
// =============================================

import type { Telegraf } from "telegraf";
import type { TokenPnL, TokenHolding } from "./ai-summary.service";

// Bot instance — injected after bot.ts initializes
let botInstance: Telegraf | null = null;

export function registerBotInstance(bot: Telegraf): void {
  botInstance = bot;
}

function getBot(): Telegraf {
  if (!botInstance) {
    throw new Error("[telegram] Bot not initialized. Call registerBotInstance() first.");
  }
  return botInstance;
}

// =============================================
// CORE SEND
// =============================================

/**
 * Send a plain text message to a Telegram chat.
 * Uses HTML parse mode for formatting.
 */
export async function sendMessage(
  chatId: string,
  text: string
): Promise<void> {
  try {
    await getBot().telegram.sendMessage(chatId, text, {
      parse_mode: "HTML",
    });
  } catch (err) {
    console.error(`[telegram] Failed to send message to chat ${chatId}:`, err);
    throw err;
  }
}

// =============================================
// ALERT MESSAGE
// =============================================

export interface AlertPayload {
  portfolioValue: number;
  dropPercent: number;
  portfolioChangeUsd: number;
  topLosers: TokenPnL[];
  aiExplanation: string;
  timestamp: Date;
}

/**
 * Send a formatted portfolio drop alert to a user.
 */
export async function sendDropAlert(
  chatId: string,
  payload: AlertPayload
): Promise<void> {
  const { portfolioValue, dropPercent, portfolioChangeUsd, topLosers, aiExplanation, timestamp } = payload;

  const losersLines = topLosers
    .slice(0, 3)
    .map((t) => `  • ${t.symbol}: ${t.pnlPercent.toFixed(2)}% ($${t.pnlUsd.toFixed(2)})`)
    .join("\n");

  const timeStr = timestamp.toUTCString();

  const message =
    `🔴 <b>Portfolio Drop Alert</b>\n\n` +
    `📉 Drop: <b>${dropPercent.toFixed(2)}%</b> (-$${Math.abs(portfolioChangeUsd).toFixed(2)})\n` +
    `💼 Current Value: <b>$${portfolioValue.toFixed(2)}</b>\n\n` +
    (losersLines ? `<b>Top Losers:</b>\n${losersLines}\n\n` : "") +
    `<i>${aiExplanation}</i>\n\n` +
    `🕐 ${timeStr}`;

  await sendMessage(chatId, message);
}

// =============================================
// SUMMARY MESSAGE
// =============================================

export interface SummaryPayload {
  summaryType: "MORNING" | "NIGHT";
  portfolioValue: number;
  portfolioChange: number;
  portfolioChangeUsd: number;
  topGainers: TokenPnL[];
  topLosers: TokenPnL[];
  topHoldings: TokenHolding[];
  reclaimableSol: number;
  aiSummary: string;
}

/**
 * Send a formatted daily summary to a user.
 */
export async function sendPortfolioSummary(
  chatId: string,
  payload: SummaryPayload
): Promise<void> {
  const {
    summaryType,
    portfolioValue,
    portfolioChange,
    portfolioChangeUsd,
    topGainers,
    topLosers,
    topHoldings,
    reclaimableSol,
    aiSummary,
  } = payload;

  const emoji = summaryType === "MORNING" ? "🌅" : "🌙";
  const label = summaryType === "MORNING" ? "Morning Summary" : "Evening Recap";
  const changeEmoji = portfolioChange >= 0 ? "📈" : "📉";
  const changeSign = portfolioChange >= 0 ? "+" : "";

  const gainersLines = topGainers
    .slice(0, 3)
    .map((t) => `  🟢 ${t.symbol}: +${t.pnlPercent.toFixed(1)}%`)
    .join("\n");

  const losersLines = topLosers
    .slice(0, 3)
    .map((t) => `  🔴 ${t.symbol}: ${t.pnlPercent.toFixed(1)}%`)
    .join("\n");

  const holdingsLines = topHoldings
    .slice(0, 3)
    .map((t) => `  • ${t.symbol}: $${t.usdValue.toFixed(2)} (${t.percentOfPortfolio.toFixed(1)}%)`)
    .join("\n");

  const message =
    `${emoji} <b>${label}</b>\n\n` +
    `💼 Portfolio: <b>$${portfolioValue.toFixed(2)}</b>\n` +
    `${changeEmoji} Change: <b>${changeSign}${portfolioChange.toFixed(2)}%</b> (${changeSign}$${portfolioChangeUsd.toFixed(2)})\n\n` +
    (gainersLines ? `<b>Top Gainers:</b>\n${gainersLines}\n\n` : "") +
    (losersLines ? `<b>Top Losers:</b>\n${losersLines}\n\n` : "") +
    (holdingsLines ? `<b>Top Holdings:</b>\n${holdingsLines}\n\n` : "") +
    (reclaimableSol > 0 ? `♻️ Reclaimable SOL: ${reclaimableSol.toFixed(4)} SOL\n\n` : "") +
    `<i>${aiSummary}</i>`;

  await sendMessage(chatId, message);
}

/**
 * Send verification success message.
 */
export async function sendVerificationSuccess(
  chatId: string,
  walletAddress: string
): Promise<void> {
  const shortWallet = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`;
  const message =
    `✅ <b>Telegram Verified!</b>\n\n` +
    `Your Telegram account is now linked to wallet:\n` +
    `<code>${shortWallet}</code>\n\n` +
    `You'll receive:\n` +
    `• 🌅 Morning portfolio summaries\n` +
    `• 🌙 Evening recaps\n` +
    `• 🔴 Drop alerts\n\n` +
    `Configure your schedule in the Sodash dashboard.`;

  await sendMessage(chatId, message);
}
