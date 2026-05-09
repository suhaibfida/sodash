// =============================================
// Telegram Auth Service
// Handles OTP generation, verification, and
// Telegram connection lifecycle.
// =============================================

import crypto from "crypto";
import prisma from "../db/client";
import { env } from "../utils/env";
import { checkRateLimit } from "../utils/rate-limiter";

const OTP_EXPIRY_MS = env.OTP_EXPIRY_MINUTES * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = env.OTP_MAX_RETRIES;

// =============================================
// TYPES
// =============================================

export interface CreateSessionResult {
  sessionId: string;
  otpCode: string;
  expiresAt: Date;
  botLink: string;
}

export interface VerifyOtpResult {
  success: boolean;
  error?: string;
}

// =============================================
// HELPERS
// =============================================

function generateOtp(): string {
  // 6-digit numeric OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateSessionId(): string {
  return crypto.randomBytes(16).toString("hex");
}

// =============================================
// SERVICE METHODS
// =============================================

/**
 * Create a new OTP verification session for a wallet.
 * Rate-limited to 3 attempts per 10 minutes per wallet.
 */
export async function createVerificationSession(
  walletAddress: string
): Promise<CreateSessionResult> {
  // Rate limit: 3 OTP requests per wallet per 10 min
  const allowed = checkRateLimit(
    `otp:${walletAddress}`,
    3,
    10 * 60 * 1000
  );

  if (!allowed) {
    throw new Error(
      "Too many verification attempts. Please wait 10 minutes before trying again."
    );
  }

  // Invalidate any existing unused sessions for this wallet
  await prisma.verificationSession.updateMany({
    where: {
      walletAddress,
      used: false,
      verified: false,
    },
    data: { used: true },
  });

  const sessionId = generateSessionId();
  const otpCode = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await prisma.verificationSession.create({
    data: {
      id: sessionId,
      walletAddress,
      otpCode,
      expiresAt,
    },
  });

  const botLink = `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${sessionId}`;

  return { sessionId, otpCode, expiresAt, botLink };
}

/**
 * Verify an OTP entered by the user in Telegram.
 * Called by the Telegram bot handler.
 */
export async function verifyOtp(
  sessionId: string,
  telegramChatId: string,
  telegramUsername: string | undefined,
  otpCode: string
): Promise<VerifyOtpResult> {
  const session = await prisma.verificationSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return { success: false, error: "Session not found. Please restart verification." };
  }

  if (session.used || session.verified) {
    return { success: false, error: "This session has already been used. Please restart." };
  }

  if (new Date() > session.expiresAt) {
    await prisma.verificationSession.update({
      where: { id: sessionId },
      data: { used: true },
    });
    return { success: false, error: "OTP has expired. Please request a new one." };
  }

  // Increment attempt count
  const updatedSession = await prisma.verificationSession.update({
    where: { id: sessionId },
    data: { attemptCount: { increment: 1 } },
  });

  if (updatedSession.attemptCount > MAX_VERIFY_ATTEMPTS) {
    await prisma.verificationSession.update({
      where: { id: sessionId },
      data: { used: true },
    });
    return { success: false, error: "Too many failed attempts. Please start over." };
  }

  if (session.otpCode !== otpCode.trim()) {
    const remaining = MAX_VERIFY_ATTEMPTS - updatedSession.attemptCount;
    return {
      success: false,
      error: `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
    };
  }

  // OTP is valid — check for duplicate linking conflicts
  const existingByChat = await prisma.telegramConnection.findUnique({
    where: { telegramChatId },
  });

  if (existingByChat && existingByChat.walletAddress !== session.walletAddress) {
    return {
      success: false,
      error: "This Telegram account is already linked to a different wallet.",
    };
  }

  const existingByWallet = await prisma.telegramConnection.findUnique({
    where: { walletAddress: session.walletAddress },
  });

  if (existingByWallet && existingByWallet.telegramChatId !== telegramChatId) {
    return {
      success: false,
      error: "This wallet is already linked to a different Telegram account.",
    };
  }

  // Mark session as verified and used
  await prisma.verificationSession.update({
    where: { id: sessionId },
    data: { verified: true, used: true, telegramChatId },
  });

  // Upsert user record
  await prisma.user.upsert({
    where: { walletAddress: session.walletAddress },
    create: { walletAddress: session.walletAddress },
    update: {},
  });

  // Upsert Telegram connection
  await prisma.telegramConnection.upsert({
    where: { walletAddress: session.walletAddress },
    create: {
      walletAddress: session.walletAddress,
      telegramChatId,
      telegramUsername: telegramUsername ?? null,
      verified: true,
      verifiedAt: new Date(),
      notificationsEnabled: true,
    },
    update: {
      telegramChatId,
      telegramUsername: telegramUsername ?? null,
      verified: true,
      verifiedAt: new Date(),
      notificationsEnabled: true,
    },
  });

  // Ensure notification settings exist for this user
  await prisma.notificationSettings.upsert({
    where: { walletAddress: session.walletAddress },
    create: { walletAddress: session.walletAddress },
    update: {},
  });

  return { success: true };
}

/**
 * Get the verification status of a wallet.
 */
export async function getVerificationStatus(walletAddress: string): Promise<{
  verified: boolean;
  telegramUsername?: string;
  telegramChatId?: string;
  notificationsEnabled: boolean;
}> {
  const connection = await prisma.telegramConnection.findUnique({
    where: { walletAddress },
  });

  if (!connection || !connection.verified) {
    return { 
      verified: false, 
      notificationsEnabled: false,
      telegramUsername: undefined,
      telegramChatId: undefined,
    };
  }

  return {
    verified: true,
    telegramUsername: connection.telegramUsername || undefined,
    telegramChatId: connection.telegramChatId,
    notificationsEnabled: connection.notificationsEnabled,
  };
}

/**
 * Revoke a Telegram connection and disable notifications.
 * Called on wallet disconnect or manual revoke.
 */
export async function revokeConnection(walletAddress: string): Promise<void> {
  await prisma.telegramConnection.deleteMany({
    where: { walletAddress },
  });

  // Invalidate all pending sessions
  await prisma.verificationSession.updateMany({
    where: { walletAddress, used: false },
    data: { used: true },
  });
}

/**
 * Delete expired, unused sessions. Called by cleanup worker.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.verificationSession.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      verified: false,
    },
  });
  return result.count;
}
