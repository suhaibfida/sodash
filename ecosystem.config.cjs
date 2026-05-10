module.exports = {
  apps: [
    {
      name: "api",
      script: "./api/index.ts",
      interpreter: "bun",
      instances: 1,
      exec_mode: "cluster",
      env: {
        // ===== SERVER =====
        PORT: process.env.PORT || 3000,
        NODE_ENV: "production",
        FRONTEND_URL: process.env.FRONTEND_URL || "https://sodash.suhaibfida.dev",

        // ===== DATABASE (NEON POSTGRES) =====
        DATABASE_URL: process.env.DATABASE_URL,
        DIRECT_URL: process.env.DIRECT_URL,

        // ===== TELEGRAM BOT =====
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,

        // ===== GEMINI AI =====
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",

        // ===== HELIUS (SOLANA) =====
        HELIUS_API_KEY: process.env.HELIUS_API_KEY,
        HELIUS_RPC_URL: process.env.HELIUS_RPC_URL,

        // ===== DEXSCREENER =====
        DEXSCREENER_BASE_URL: process.env.DEXSCREENER_BASE_URL || "https://api.dexscreener.com/latest",

        // ===== AUTH / SECURITY =====
        JWT_SECRET: process.env.JWT_SECRET,
        ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET,

        // ===== OTP VERIFICATION =====
        OTP_EXPIRY_MINUTES: process.env.OTP_EXPIRY_MINUTES || 5,
        OTP_MAX_RETRIES: process.env.OTP_MAX_RETRIES || 5,

        // ===== PORTFOLIO ALERTS =====
        DEFAULT_ALERT_THRESHOLD: process.env.DEFAULT_ALERT_THRESHOLD || 15,
        ALERT_COOLDOWN_MINUTES: process.env.ALERT_COOLDOWN_MINUTES || 60,

        // ===== WORKERS / CRON =====
        SNAPSHOT_INTERVAL_MINUTES: process.env.SNAPSHOT_INTERVAL_MINUTES || 5,
        SUMMARY_WORKER_INTERVAL: process.env.SUMMARY_WORKER_INTERVAL || 1,
        CLEANUP_WORKER_INTERVAL: process.env.CLEANUP_WORKER_INTERVAL || 10,

        // ===== AI CHAT =====
        AI_MAX_CHAT_HISTORY: process.env.AI_MAX_CHAT_HISTORY || 15,
        AI_STREAMING_ENABLED: process.env.AI_STREAMING_ENABLED || "false",

        // ===== RATE LIMITING =====
        RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || 60000,
        RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
      },
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
