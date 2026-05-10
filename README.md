# sodash
A premium Solana portfolio dashboard featuring interactive wallet relationship graphs, real-time PnL analytics, and AI-powered Telegram alerts. Built with React, Bun, and Helius.


<img width="14203" height="7147" alt="page" src="https://github.com/user-attachments/assets/34bab93f-6780-4eaf-ae77-1597fa48016d" />
<img width="1335" height="587" alt="image" src="https://github.com/user-attachments/assets/475df9ad-5eaa-4799-8253-e2df9b1088a8" />
<img width="1351" height="612" alt="image" src="https://github.com/user-attachments/assets/b8712a79-7cb1-4624-a579-117b34760aa5" />
<img width="1343" height="604" alt="image" src="https://github.com/user-attachments/assets/aa1fa877-9bb2-4ba8-bb4c-15301d2b0ee6" />
<img width="1346" height="596" alt="image" src="https://github.com/user-attachments/assets/734b12f4-3ce8-43c5-bbb4-9cd9bd77be79" />
<img width="1350" height="609" alt="image" src="https://github.com/user-attachments/assets/33134be2-1f26-4d51-ae7e-94b5372c14e1" />
<img width="1329" height="593" alt="image" src="https://github.com/user-attachments/assets/398fc812-90b6-4681-a7a5-4242ee9a3fa7" />
<img width="437" height="614" alt="image" src="https://github.com/user-attachments/assets/47fa5ab9-3003-4a18-9365-e5a9a2c4cd65" />











#  Installation & Setup

## 1️⃣ Clone the repository

```bash
curl http://localhost:3000/health
```

✅ **Running!** See [QUICKSTART.md](./QUICKSTART.md) for details.

---

## 📚 Documentation

| Guide | Purpose | Time |
|-------|---------|------|
| **[QUICKSTART.md](./QUICKSTART.md)** | Get running in 15 minutes | 15 min |
| **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** | Complete installation & configuration | 1 hour |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | System design, data flows, database schema | 30 min |
| **[FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)** | React components for Telegram/notifications | 30 min |
| **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** | End-to-end testing procedures | 2 hours |

---

## 🔌 Core Features

### 🔐 Telegram OTP Verification
- Secure wallet-to-Telegram linking
- 6-digit OTP with 10-minute expiration
- Rate-limited (3 attempts per wallet per 10 min)
- Prevent duplicate wallet linking

### 📊 Portfolio Snapshots
- Automatic 5-minute wallet monitoring
- Historical data storage (7-day retention)
- SOL + token balance tracking
- Portfolio value in USD

### 🔴 Real-Time Alerts
- Detect portfolio drops >10% (configurable)
- Immediate Telegram notifications
- AI-generated alert explanations
- Cooldown to prevent spam (1 per hour)

### 🤖 Daily AI Summaries
- Morning summaries at 8:00 AM (user's timezone)
- Evening recaps at 9:00 PM (user's timezone)
- Top gainers, losers, holdings
- AI-powered insights via OpenAI
- Support for all IANA timezones

### ⚙️ Background Workers
- **Snapshot Worker** — Fetches portfolio data every 5 min
- **Alerts Worker** — Detects drops every 5 min
- **Scheduler** — Sends summaries at user's local time
- **Cleanup Worker** — Maintains database hourly

---

## 📦 What's Included

### Backend (100% Complete)
- ✅ Express API with all endpoints
- ✅ Prisma ORM + PostgreSQL schema
- ✅ Telegraf bot with OTP flow
- ✅ 4 background workers
- ✅ OpenAI integration
- ✅ Solana RPC integration
- ✅ Rate limiting & security
- ✅ Environment validation

### Frontend Components (100% Complete)
- ✅ `TelegramOTPModal` — OTP verification UI
- ✅ `TelegramConnectionStatus` — Connection management
- ✅ `NotificationSettingsPanel` — Preferences UI
- ✅ Dark mode support
- ✅ TailwindCSS styling

### Documentation (100% Complete)
- ✅ Installation guide
- ✅ Architecture documentation
- ✅ API reference
- ✅ Frontend integration guide
- ✅ Testing procedures

---

## 🏗️ Architecture

```
React Frontend
    ↓ HTTPS
Express API (Bun)
    ├─→ Telegram Bot
    ├─→ PostgreSQL
    ├─→ Solana RPC
    └─→ OpenAI API

Background Workers:
    • Snapshot: Every 5 min
    • Alerts: Every 5 min
    • Scheduler: Every 1 min
    • Cleanup: Every 1 hour
```

---

## 🔗 API Endpoints

### Telegram Routes
```
POST   /api/v1/telegram/initiate      Generate OTP
GET    /api/v1/telegram/status/:addr  Check status
POST   /api/v1/telegram/revoke        Unlink account
```

### Notification Routes
```
GET    /api/v1/notifications/settings/:addr     Get preferences
PUT    /api/v1/notifications/settings            Update preferences
POST   /api/v1/notifications/toggle              Enable/disable
```

---

## 🗄️ Database Models

```
User
├── TelegramConnection (verified Telegram account)
├── NotificationSettings (timezone + preferences)
├── WalletSnapshot (5-min portfolio data, 7-day retention)
├── VerificationSession (OTP state, auto-cleanup)
└── AlertHistory (sent alerts, 30-day retention)
```

---

## 🔒 Security

✅ **OTP Verification** — 6-digit codes, 10-min expiration, max 5 attempts
✅ **Duplicate Prevention** — 1 Telegram per wallet, 1 wallet per Telegram
✅ **Rate Limiting** — Sliding window, per-wallet tracking
✅ **Alert Cooldown** — 1 alert per wallet per hour
✅ **Data Privacy** — No raw JSON to AI, preprocessed metrics only
✅ **SQL Injection Protection** — Prisma parameterized queries
✅ **CORS** — Frontend domain restricted

---

## 📈 Performance

- **OTP Generation:** <100ms
- **Settings Update:** <50ms
- **Portfolio Fetch:** 2-5s (RPC dependent)
- **Alert Detection:** <500ms
- **Summary Generation:** 2-5s (AI API dependent)
- **Throughput:** 1000+ requests/sec at scale

---

## 🧪 Testing

### 10-Phase Testing Plan
1. Backend startup verification
2. OTP flow end-to-end
3. Notification settings
4. Snapshot worker
5. Alert system
6. Summary scheduler
7. Rate limiting
8. Timezone handling
9. Frontend integration
10. Error scenarios

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for detailed procedures.

---

## 🚢 Deployment

### Quick Deploy
```bash
# Production database
export DATABASE_URL="postgresql://..."

# Run with PM2
pm2 start "bun run api/index.ts" --name sodash
pm2 save
```

### Production Checklist
- [ ] PostgreSQL production instance
- [ ] Environment variables configured
- [ ] SSL/HTTPS enabled
- [ ] Backups configured (daily)
- [ ] Monitoring setup
- [ ] Rate limits tuned
- [ ] Documentation for ops team

---

## 🔧 Technology Stack

**Backend:**
- Bun (runtime)
- Express (framework)
- PostgreSQL (database)
- Prisma (ORM)
- Telegraf (Telegram)
- OpenAI (AI)
- Solana Web3.js (blockchain)

**Frontend:**
- React 18+
- TailwindCSS
- Solana Wallet Adapter
- lucide-react (icons)

**DevOps:**
- TypeScript (all code)
- Bun (package manager)
- Prisma migrations
- PM2 (process manager)

---

## 📋 Installation & Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/sodash.git
cd sodash
```

### 2️⃣ Install Dependencies

```bash
bun install
```

### 3️⃣ Setup Environment

```bash
# API
cd api
cp .env.example .env
# Edit .env with your keys
```

**Required:**
- `DATABASE_URL` — PostgreSQL connection
- `TELEGRAM_BOT_TOKEN` — From @BotFather
- `TELEGRAM_BOT_USERNAME` — Bot username
- `OPENAI_API_KEY` — From platform.openai.com
- `HELIUS_RPC_URL` — From dev.helius.xyz

### 4️⃣ Create Database

```bash
createdb sodash
bun prisma migrate deploy
```

### 5️⃣ Run

```bash
bun run dev
```

**Expected:**
```
🚀 Sodash API running on port 3000
[bot] Telegram bot @your_bot is running
[snapshot] Worker started
[alerts] Worker started
[cleanup] Worker started
[scheduler] Started
```

---

## 🧠 How It Works

### OTP Flow (2 min)
1. User clicks "Connect Telegram"
2. Frontend generates OTP → sends via API
3. User opens Telegram bot link
4. Enters OTP in bot
5. Bot verifies → Notifications enabled

### Monitoring (Every 5 min)
1. **Snapshot Worker:** Fetches wallet balance
2. **Alerts Worker:** Compares to 1 hour ago
3. **If drop > threshold:** Sends Telegram alert
4. **Scheduler (every min):** Checks summary times
5. **At user's local time:** Sends daily summary

---

## 🚀 Quick Start (60 seconds)

1. **Open [DOCUMENTATION.md](./DOCUMENTATION.md#quick-start-15-min)**
2. **Follow Quick Start section**
3. **Get running in 15 minutes**

---

## ⚠️ Important

- Never commit `.env` files
- Requires PostgreSQL v14+
- Requires Bun v1.0+
- See [DOCUMENTATION.md](./DOCUMENTATION.md) for all details

---

## 🎯 What's Included

- ✅ Express API backend
- ✅ React frontend components
- ✅ PostgreSQL database schema
- ✅ Telegram bot integration
- ✅ 4 background workers
- ✅ OpenAI/Gemini AI integration
- ✅ Complete documentation
- ✅ Testing procedures

---

**👉 [Start with DOCUMENTATION.md →](./DOCUMENTATION.md)**



