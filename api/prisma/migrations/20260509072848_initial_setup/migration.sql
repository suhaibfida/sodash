-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('DROP_10', 'DROP_15', 'DROP_20', 'DROP_CUSTOM');

-- CreateEnum
CREATE TYPE "SummaryType" AS ENUM ('MORNING', 'NIGHT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_connections" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "telegram_chat_id" TEXT NOT NULL,
    "telegram_username" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_sessions" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "otp_code" TEXT NOT NULL,
    "telegram_chat_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "morning_summary_time" TEXT NOT NULL DEFAULT '08:00',
    "night_summary_time" TEXT NOT NULL DEFAULT '21:00',
    "morning_summary_enabled" BOOLEAN NOT NULL DEFAULT true,
    "night_summary_enabled" BOOLEAN NOT NULL DEFAULT true,
    "alert_threshold" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "last_morning_sent_at" TIMESTAMP(3),
    "last_night_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_snapshots" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "portfolio_value" DOUBLE PRECISION NOT NULL,
    "sol_balance" DOUBLE PRECISION NOT NULL,
    "pnl_percent" DOUBLE PRECISION NOT NULL,
    "pnl_usd" DOUBLE PRECISION NOT NULL,
    "top_tokens_json" TEXT NOT NULL,
    "snapshot_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_history" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "alert_type" "AlertType" NOT NULL,
    "portfolio_value" DOUBLE PRECISION NOT NULL,
    "drop_percent" DOUBLE PRECISION NOT NULL,
    "message_text" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_profiles" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "portfolio_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "concentration_risk" TEXT NOT NULL DEFAULT 'LOW',
    "reclaimable_sol" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wallet_behavior" TEXT,
    "top_holdings" TEXT,
    "interaction_summary" TEXT,
    "last_analyzed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");

-- CreateIndex
CREATE INDEX "users_wallet_address_idx" ON "users"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_connections_wallet_address_key" ON "telegram_connections"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_connections_telegram_chat_id_key" ON "telegram_connections"("telegram_chat_id");

-- CreateIndex
CREATE INDEX "telegram_connections_wallet_address_idx" ON "telegram_connections"("wallet_address");

-- CreateIndex
CREATE INDEX "telegram_connections_telegram_chat_id_idx" ON "telegram_connections"("telegram_chat_id");

-- CreateIndex
CREATE INDEX "verification_sessions_wallet_address_idx" ON "verification_sessions"("wallet_address");

-- CreateIndex
CREATE INDEX "verification_sessions_expires_at_idx" ON "verification_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_wallet_address_key" ON "notification_settings"("wallet_address");

-- CreateIndex
CREATE INDEX "notification_settings_wallet_address_idx" ON "notification_settings"("wallet_address");

-- CreateIndex
CREATE INDEX "wallet_snapshots_wallet_address_idx" ON "wallet_snapshots"("wallet_address");

-- CreateIndex
CREATE INDEX "wallet_snapshots_wallet_address_snapshot_at_idx" ON "wallet_snapshots"("wallet_address", "snapshot_at");

-- CreateIndex
CREATE INDEX "wallet_snapshots_snapshot_at_idx" ON "wallet_snapshots"("snapshot_at");

-- CreateIndex
CREATE INDEX "alert_history_wallet_address_idx" ON "alert_history"("wallet_address");

-- CreateIndex
CREATE INDEX "alert_history_wallet_address_sent_at_idx" ON "alert_history"("wallet_address", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_profiles_wallet_address_key" ON "wallet_profiles"("wallet_address");

-- CreateIndex
CREATE INDEX "wallet_profiles_wallet_address_idx" ON "wallet_profiles"("wallet_address");

-- CreateIndex
CREATE INDEX "chat_sessions_wallet_address_idx" ON "chat_sessions"("wallet_address");

-- CreateIndex
CREATE INDEX "chat_sessions_wallet_address_updated_at_idx" ON "chat_sessions"("wallet_address", "updated_at");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_idx" ON "chat_messages"("session_id");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_created_at_idx" ON "chat_messages"("session_id", "created_at");

-- AddForeignKey
ALTER TABLE "telegram_connections" ADD CONSTRAINT "telegram_connections_wallet_address_fkey" FOREIGN KEY ("wallet_address") REFERENCES "users"("wallet_address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_wallet_address_fkey" FOREIGN KEY ("wallet_address") REFERENCES "users"("wallet_address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_snapshots" ADD CONSTRAINT "wallet_snapshots_wallet_address_fkey" FOREIGN KEY ("wallet_address") REFERENCES "users"("wallet_address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_wallet_address_fkey" FOREIGN KEY ("wallet_address") REFERENCES "users"("wallet_address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
