// =============================================
// Environment Variable Validation
// Validates all required env vars at startup.
// Throws descriptive error if any are missing.
// =============================================

const required = [
  "DATABASE_URL",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_BOT_USERNAME",
  "GEMINI_API_KEY",
] as const;

type RequiredEnvKey = typeof required[number];

function getEnv(key: RequiredEnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[env] Missing required environment variable: ${key}\n` +
      `  → Copy api/.env.example to api/.env and fill in all values.`
    );
  }
  return value;
}

function getEnvOptional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function getEnvOptionalInt(key: string, fallback: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : fallback;
}

function getEnvOptionalFloat(key: string, fallback: number): number {
  const value = process.env[key];
  return value ? parseFloat(value) : fallback;
}

function getEnvOptionalBool(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (!value) return fallback;
  return value.toLowerCase() === "true";
}

// Validate all required vars eagerly on import
for (const key of required) {
  getEnv(key);
}

export const env = {
  // Database
  DATABASE_URL: getEnv("DATABASE_URL"),
  DIRECT_URL: getEnvOptional("DIRECT_URL", ""),

  // Telegram
  TELEGRAM_BOT_TOKEN: getEnv("TELEGRAM_BOT_TOKEN"),
  TELEGRAM_BOT_USERNAME: getEnv("TELEGRAM_BOT_USERNAME"),

  // Gemini AI
  GEMINI_API_KEY: getEnv("GEMINI_API_KEY"),
  GEMINI_MODEL: getEnvOptional("GEMINI_MODEL", "gemini-2.5-flash"),

  // Helius (Solana)
  HELIUS_API_KEY: getEnvOptional("HELIUS_API_KEY", ""),
  HELIUS_RPC_URL: getEnvOptional(
    "HELIUS_RPC_URL",
    "https://api.mainnet-beta.solana.com"
  ),

  // DexScreener
  DEXSCREENER_BASE_URL: getEnvOptional(
    "DEXSCREENER_BASE_URL",
    "https://api.dexscreener.com/latest"
  ),

  // Auth / Security
  JWT_SECRET: getEnvOptional("JWT_SECRET", ""),
  ENCRYPTION_SECRET: getEnvOptional("ENCRYPTION_SECRET", ""),

  // OTP Verification
  OTP_EXPIRY_MINUTES: getEnvOptionalInt("OTP_EXPIRY_MINUTES", 5),
  OTP_MAX_RETRIES: getEnvOptionalInt("OTP_MAX_RETRIES", 5),

  // Portfolio Alerts
  DEFAULT_ALERT_THRESHOLD: getEnvOptionalFloat("DEFAULT_ALERT_THRESHOLD", 15),
  ALERT_COOLDOWN_MINUTES: getEnvOptionalInt("ALERT_COOLDOWN_MINUTES", 60),

  // Workers / Cron
  SNAPSHOT_INTERVAL_MINUTES: getEnvOptionalInt("SNAPSHOT_INTERVAL_MINUTES", 5),
  SUMMARY_WORKER_INTERVAL: getEnvOptionalInt("SUMMARY_WORKER_INTERVAL", 1),
  CLEANUP_WORKER_INTERVAL: getEnvOptionalInt("CLEANUP_WORKER_INTERVAL", 10),

  // AI Chat
  AI_MAX_CHAT_HISTORY: getEnvOptionalInt("AI_MAX_CHAT_HISTORY", 15),
  AI_STREAMING_ENABLED: getEnvOptionalBool("AI_STREAMING_ENABLED", false),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: getEnvOptionalInt("RATE_LIMIT_WINDOW_MS", 60000),
  RATE_LIMIT_MAX_REQUESTS: getEnvOptionalInt("RATE_LIMIT_MAX_REQUESTS", 100),

  // App Config
  PORT: getEnvOptionalInt("PORT", 3000),
} as const;
