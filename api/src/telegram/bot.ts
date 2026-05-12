// =============================================
// Telegraf Bot Setup
// Handles /start command and OTP input flow.
// =============================================

import { Telegraf, session } from "telegraf";
import { env } from "../utils/env";
import { verifyOtp } from "../services/telegram-auth.service";
import {
  registerBotInstance,
  sendVerificationSuccess,
  sendMessage,
} from "../services/telegram.service";

// =============================================
// SESSION STATE
// Tracks which session a user is verifying.
// =============================================

interface BotSessionData {
  pendingSessionId?: string;
}

// Extend Telegraf context with session
type BotContext = {
  session: BotSessionData;
} & Parameters<Parameters<Telegraf["use"]>[0]>[0];

// =============================================
// BOT INIT
// =============================================

export function createBot(): Telegraf {
  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

  // In-memory session (sufficient for single-process OTP flow)
  bot.use(session({ defaultSession: () => ({}) }));

  // =============================================
  // /start <sessionId>
  // Triggered when user clicks the bot deep link
  // =============================================
  bot.start(async (ctx) => {
    const payload = ctx.startPayload; // the ?start= value

    if (!payload) {
      await ctx.reply(
        "👋 Welcome to Sodash!\n\nTo link your wallet, open the Sodash dashboard and click \"Connect Telegram\"."
      );
      return;
    }

    // Store session ID for this Telegram user
  // Store session ID for this Telegram user
(ctx as BotContext).session.pendingSessionId = payload;

await ctx.sendChatAction("typing");

await ctx.reply(
  "🔐 Wallet Verification\n\n" +
  "Please enter the 6-digit OTP shown in the Sodash dashboard to link your wallet."
);
  });

  // =============================================
  // OTP Input Handler
  // =============================================
  bot.on("text", async (ctx) => {
    const text = ctx.message.text.trim();
    const chatId = ctx.chat.id.toString();
    const username = ctx.from?.username || null;
    const firstName = ctx.from?.first_name || "User";
    const sessionId = (ctx as BotContext).session?.pendingSessionId;

    // Ignore commands
    if (text.startsWith("/")) return;

    if (!sessionId) {
      await ctx.reply(
        "⚠️ No active verification session found.\n\n" +
        "Please click the link from the Sodash dashboard to start verification."
      );
      return;
    }

    // Validate looks like a 6-digit OTP
    if (!/^\d{6}$/.test(text)) {
      await ctx.reply("❌ Please enter a valid 6-digit OTP code.");
      return;
    }

    try {
      const result = await verifyOtp(sessionId, chatId, username, text);

      if (result.success) {
        // Clear pending session
        (ctx as BotContext).session.pendingSessionId = undefined;

        // Get wallet address from session to display it
        const { default: prisma } = await import("../db/client");
        const session = await prisma.verificationSession.findUnique({
          where: { id: sessionId },
        });

        await sendVerificationSuccess(chatId, session?.walletAddress ?? "unknown");
        console.log(
          `[bot] OTP verified for chat ${chatId} (username: ${username || "none"}) - wallet: ${session?.walletAddress}`
        );
      } else {
        await ctx.reply(`❌ ${result.error}`);
      }
    } catch (err) {
      console.error("[bot] OTP verification error:", err);
      await ctx.reply("⚠️ Something went wrong. Please try again.");
    }
  });

  // =============================================
  // /status command
  // =============================================
  bot.command("status", async (ctx) => {
    const chatId = ctx.chat.id.toString();

    const { default: prisma } = await import("../db/client");
    const connection = await prisma.telegramConnection.findUnique({
      where: { telegramChatId: chatId },
    });

    if (!connection) {
      await ctx.reply("❌ No wallet linked to this Telegram account.");
      return;
    }

    const shortWallet = `${connection.walletAddress.slice(0, 6)}...${connection.walletAddress.slice(-6)}`;
    await ctx.reply(
      `✅ <b>Linked Wallet</b>\n<code>${shortWallet}</code>\n` +
      `📢 Notifications: ${connection.notificationsEnabled ? "Enabled" : "Disabled"}`,
      { parse_mode: "HTML" }
    );
  });

  // =============================================
  // /stop command — unlink wallet
  // =============================================
  bot.command("stop", async (ctx) => {
    const chatId = ctx.chat.id.toString();

    const { default: prisma } = await import("../db/client");
    await prisma.telegramConnection.deleteMany({
      where: { telegramChatId: chatId },
    });

    await ctx.reply(
      "✅ Your wallet has been unlinked. Notifications are disabled.\n\n" +
      "You can reconnect anytime from the Sodash dashboard."
    );
  });

  // Error handler
  bot.catch((err, ctx) => {
    console.error(`[bot] Error for ${ctx.updateType}:`, err);
  });

  return bot;
}

/**
 * Launch the bot and register it with the telegram service.
 * Returns stop function for graceful shutdown.
 */
export async function launchBot(): Promise<() => void> {
  const bot = createBot();
  registerBotInstance(bot);

  // Launch in long-polling mode (no webhook needed for self-hosted)
  bot.launch().catch((err) => {
    console.error("[bot] Launch error:", err);
  });

  console.log(`[bot] Telegram bot @${env.TELEGRAM_BOT_USERNAME} is running`);

  // Return stop function
  return () => bot.stop("SIGTERM");
}
