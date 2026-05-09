# Sodash — AI-Powered Wallet Monitoring System
## Complete Documentation & Setup Guide

Sodash is a **production-ready** AI-powered Solana wallet monitoring system that delivers real-time portfolio alerts and AI-generated daily summaries via Telegram.

---

## 📋 Table of Contents

1. [Quick Start (15 min)](#quick-start-15-min)
2. [Prerequisites](#prerequisites)
3. [Database Setup](#database-setup)
4. [Telegram Bot Configuration](#telegram-bot-configuration)
5. [Environment Variables](#environment-variables)
6. [Installation & Running](#installation--running)
7. [System Architecture](#system-architecture)
8. [Testing & Verification](#testing--verification)
9. [Troubleshooting](#troubleshooting)
10. [API Endpoints](#api-endpoints)

---

## 🚀 Quick Start (15 min)

### TL;DR
```bash
# 1. Setup database
createdb sodash

# 2. Setup environment
cd api
cp .env.example .env
# Edit .env with your API keys

# 3. Install & run
bun install
bun run dev

# 4. Test
curl http://localhost:3000/health
```

### Option 1: Use Startup Scripts (Recommended - Windows)
```bash
# Terminal 1 - Backend
start-backend-fixed.bat

# Terminal 2 - Frontend
start-frontend.bat
```

### Option 2: Manual Start
```bash
# Terminal 1 - Backend
cd api
bun prisma generate
bun run dev

# Terminal 2 - Frontend
cd client
bun run dev
```

---

## ✅ Prerequisites

Ensure you have installed:

| Tool | Version | Install Link |
|------|---------|--------------|
| **Bun** | v1.0+ | https://bun.sh |
| **PostgreSQL** | v14+ | https://postgresql.org |
| **Node.js** | v18+ | https://nodejs.org |
| **Git** | Latest | https://git-scm.com |

**Verify Installation:**
```bash
bun --version      # ✓ Shows version
psql --version     # ✓ Shows version
node --version     # ✓ Shows version
git --version      # ✓ Shows version
```

---

## 🗄️ Database Setup

### Step 1: Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE sodash;

# Create a dedicated user (recommended)
CREATE USER sodash_user WITH PASSWORD 'your_secure_password';
ALTER ROLE sodash_user SET client_encoding TO 'utf8';
ALTER ROLE sodash_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE sodash_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE sodash TO sodash_user;

# Exit psql
\q
```

### Step 2: Run Prisma Migrations

```bash
cd api

# Install dependencies
bun install

# Generate Prisma client
bun prisma generate

# Apply migrations (creates all tables)
bun prisma migrate deploy
```

### Database Schema

The following tables are created automatically:

| Table | Purpose |
|-------|---------|
| `users` | Solana wallet records |
| `telegram_connections` | Verified Telegram accounts per wallet |
| `verification_sessions` | OTP verification state |
| `notification_settings` | User timezone and summary preferences |
| `wallet_snapshots` | 5-minute portfolio snapshots (7-day retention) |
| `alert_history` | Alert delivery tracking (30-day retention) |

---

## 🤖 Telegram Bot Configuration

### Step 1: Create Bot with @BotFather

1. Open Telegram, search for **@BotFather**
2. Send `/newbot`
3. Follow prompts:
   - **Bot name:** e.g., "Sodash Wallet Monitor"
   - **Bot username:** e.g., `sodash_bot` (must be unique)
4. **Copy the API token** — looks like: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
5. **Save the bot username** — needed for deep links

### Step 2: Enable Privacy and Command Handling

In @BotFather:

```
/setprivacy
> Select your bot
> Choose "Disable"  (to read all messages)

/setcommands
> Select your bot
> Paste:
start - Link wallet to Telegram
```

### Step 3: Save Your Bot Credentials

You'll need these in your `.env` file:
- `TELEGRAM_BOT_TOKEN` — the API token
- `TELEGRAM_BOT_USERNAME` — the bot username (without @)

---

## 🔐 Environment Variables

### Create `.env` File

```bash
cd api
cp .env.example .env
# Edit with your values
```

### Required Variables

```env
# Database
DATABASE_URL="postgresql://sodash_user:your_password@localhost:5432/sodash"

# Telegram
TELEGRAM_BOT_TOKEN="1234567890:ABC-DEF..."
TELEGRAM_BOT_USERNAME="sodash_ai_bot"

# AI (Choose one)
GEMINI_API_KEY="AIzaSyAbc123..."
# OR
OPENAI_API_KEY="sk-..."

# Solana RPC
HELIUS_RPC_URL="https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
```

### Where to Get These Values

| Variable | Where to Get |
|----------|--------------|
| `DATABASE_URL` | Create PostgreSQL DB (see above) |
| `TELEGRAM_BOT_TOKEN` | @BotFather on Telegram |
| `TELEGRAM_BOT_USERNAME` | @BotFather on Telegram |
| `GEMINI_API_KEY` | https://makersuite.google.com/app/apikey |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `HELIUS_RPC_URL` | https://dev.helius.xyz |

### Optional Variables

```env
# Gemini Configuration
GEMINI_MODEL=gemini-2.5-flash    # or gemini-pro

# API
JWT_SECRET="your-secret-key"
ENCRYPTION_SECRET="your-secret-key"

# DexScreener (public API, no key needed)
DEXSCREENER_BASE_URL=https://api.dexscreener.com/latest

# Server
PORT=3000
NODE_ENV=development
```

---

## 📦 Installation & Running

### Backend Setup

```bash
cd api

# Install dependencies
bun install

# Generate Prisma client
bun prisma generate

# Run migrations
bun prisma migrate deploy

# Start development server
bun run dev
```

### Frontend Setup

```bash
cd client

# Install dependencies
bun install

# Start development server
bun run dev
```

### Expected Output

**Backend:**
```
🚀 Sodash API running on port 3000
   Health: http://localhost:3000/health

[bot] Telegram bot @sodash_ai_bot is running
[snapshot] Worker started (interval: 5 min)
[alerts] Worker started (interval: 5 min)
[scheduler] Started (tick: 1 min)
[cleanup] Worker started (interval: 10 min)
```

**Frontend:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  ┌────────────────┬──────────────────┬──────────────────────┐   │
│  │  Dashboard     │  Notifications   │  Settings Panel      │   │
│  │  Components    │  Management      │  Telegram Config     │   │
│  └────────────────┴──────────────────┴──────────────────────┘   │
└───────────────────────┬───────────────────────────────────────┘
                        │ HTTPS / JSON
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API (Bun/Express)                    │
│                                                                 │
│  Routes:                          Services:                     │
│  • /telegram/initiate ────────→  telegram-auth.service          │
│  • /telegram/status             telegram.service                │
│  • /telegram/revoke             ai-summary.service              │
│  • /notifications/settings  ──→ portfolio.service               │
│  • /notifications/toggle        alert.service                   │
│                                                                 │
│  Background Workers:                                            │
│  • Snapshot Worker (every 5 min)  ───────→ Portfolio tracking  │
│  • Alerts Worker (every 5 min)    ───────→ Drop detection      │
│  • Cleanup Worker (every hour)    ───────→ Data pruning        │
│  • Scheduler (every minute)       ───────→ Summary delivery    │
│                                                                 │
└──────────┬────────────────────────────┬──────────────────────┬──┘
           │                            │                      │
           │ PostgreSQL                 │ Telegram API         │ Solana RPC
           │ queries                    │ messages             │ wallet data
           ▼                            ▼                      ▼
        ┌──────────────┐        ┌──────────────┐    ┌──────────────┐
        │ PostgreSQL   │        │ Telegram     │    │ Solana       │
        │ Database     │        │ Bot          │    │ Blockchain   │
        └──────────────┘        └──────────────┘    └──────────────┘
```

### Core Features

#### 🔐 Telegram OTP Verification
- Secure wallet-to-Telegram linking
- 6-digit OTP with 10-minute expiration
- Rate-limited (3 attempts per wallet per 10 min)
- Prevent duplicate wallet linking

#### 📊 Portfolio Snapshots
- Automatic 5-minute wallet monitoring
- Historical data storage (7-day retention)
- SOL + token balance tracking
- Portfolio value in USD

#### 🔴 Real-Time Alerts
- Detect portfolio drops >10% (configurable)
- Immediate Telegram notifications
- AI-generated alert explanations
- Cooldown to prevent spam (1 per hour)

#### 🤖 Daily AI Summaries
- Morning & evening recaps
- Portfolio performance analysis
- Top gainers/losers
- Risk assessment
- Timezone-aware delivery

---

## 🧪 Testing & Verification

### Pre-Flight Checklist

```bash
# 1. PostgreSQL is running
psql -U postgres -d sodash -c "SELECT 1"

# 2. Prisma migrations applied
bun prisma migrate status

# 3. Environment variables set
cat api/.env | grep -E "DATABASE_URL|TELEGRAM"

# 4. Bun works
bun --version

# 5. Dependencies installed
bun install --cwd api
```

### Phase 1: Backend Startup Test

```bash
cd api
bun run dev
```

**Expected Output:** (see above)

### Phase 2: Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-05-09T10:00:00.000Z"
}
```

### Phase 3: OTP Verification Flow

```bash
curl -X POST http://localhost:3000/api/v1/telegram/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "9B5X5v4UNYpELesaB4q6E7SHw8888888888888888"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "otpCode": "123456",
  "expiresAt": "2024-05-09T10:15:00.000Z",
  "botLink": "https://t.me/sodash_bot?start=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

### Phase 4: Frontend & Integration Test

1. **Open Browser:** `http://localhost:5173`
2. **Connect Wallet:** Click "Connect Wallet"
3. **Navigate to Notifications:** Click "AI Alerts"
4. **Connect Telegram:** Click "Connect Telegram"
   - Should see 6-digit OTP code
   - Click "Open Bot" button
   - Enter OTP in Telegram @bot
   - Should see success message

---

## 🔧 Troubleshooting

### Error: "Cannot find module .prisma/client"

**Cause:** Prisma client not generated

**Solution:**
```bash
cd api
bun prisma generate
bun run dev
```

### Error: "Failed to fetch" in Browser

**Step 1:** Check backend is running
```bash
curl http://localhost:3000/health
```

**Step 2:** Verify API URL is correct
```javascript
// Open browser console (F12)
console.log(import.meta.env.VITE_API_URL)
```

**Expected:** `http://localhost:3000`

**Fix:** Ensure `client/.env` has:
```env
VITE_API_URL=http://localhost:3000
```

Then restart frontend:
```bash
cd client
bun run dev
```

### Error: "Database connection failed"

**Check 1:** PostgreSQL is running
```bash
psql -U postgres -d sodash -c "SELECT 1"
```

**Check 2:** DATABASE_URL is correct
```bash
cat api/.env | grep DATABASE_URL
```

**Check 3:** Run migrations
```bash
cd api
bun prisma migrate deploy
```

### Error: "Telegram bot not running"

**Check 1:** TELEGRAM_BOT_TOKEN is set
```bash
cat api/.env | grep TELEGRAM_BOT_TOKEN
```

**Check 2:** Token format is valid (should be numbers:letters)

**Check 3:** Restart backend
```bash
cd api
bun run dev
```

### Error: "CORS issue" or "Headers" errors

**Solution:** Ensure VITE_API_URL matches backend URL:

`client/.env`:
```env
VITE_API_URL=http://localhost:3000
```

Then restart both frontend and backend.

---

## 📡 API Endpoints

### Health Check
```
GET /health
Response: { status: "ok", timestamp: "..." }
```

### Telegram Integration

#### Initiate OTP
```
POST /api/v1/telegram/initiate
Body: { walletAddress: string }
Response: { sessionId, otpCode, expiresAt, botLink }
```

#### Check Status
```
GET /api/v1/telegram/status/:walletAddress
Response: { connected: boolean, telegramUsername: string }
```

#### Revoke Connection
```
POST /api/v1/telegram/revoke
Body: { walletAddress: string }
Response: { success: boolean }
```

### Notifications

#### Get Settings
```
GET /api/v1/notifications/settings/:walletAddress
Response: { timezone, morningSummaryTime, nightSummaryTime, ... }
```

#### Update Settings
```
POST /api/v1/notifications/settings
Body: { walletAddress, timezone, morningSummaryTime, ... }
Response: { success: boolean }
```

#### Toggle Notifications
```
POST /api/v1/notifications/toggle
Body: { walletAddress, enabled: boolean }
Response: { success: boolean }
```

---

## 🎯 Features

### ✨ Current Implementation

✅ Wallet connect with Solana Adapter  
✅ Portfolio dashboard with analytics  
✅ Token balance tracking & PnL metrics  
✅ Token detail pages  
✅ Wallet interaction graph  
✅ Rent reclaim system  
✅ **Secure Telegram Verification** — OTP-based wallet linking  
✅ **Real-Time Portfolio Alerts** — Immediate Telegram notifications  
✅ **AI-Powered Summaries** — Morning & evening recaps  
✅ **Timezone Support** — Summaries in your local time  
✅ **Background Workers** — Automatic monitoring  
✅ **Production Ready** — Complete backend implementation  

---

## 📞 Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review logs: `cd api && bun run dev`
3. Verify environment variables: `cat api/.env`
4. Check database: `psql -d sodash -c "SELECT * FROM users;"`
