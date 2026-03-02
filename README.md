# 🚀 Solana Memecoin Signal Bot

Telegram bot that monitors new Pump.fun token launches on Solana, scores them, and sends alerts to your group.

## How it makes money
1. Create a **private Telegram group**
2. Add the bot to the group
3. Charge subscribers **5-10 USDC/month** for access
4. 4 subscribers = breakeven on $20 starting capital

## Quick Setup (5 minutes)

### 1. Get API Keys (free)

**Telegram Bot:**
- Message [@BotFather](https://t.me/BotFather) → `/newbot` → save the token
- Create a private group/channel → add the bot → get the chat ID
  - Easiest way: add [@RawDataBot](https://t.me/RawDataBot) to group, it shows the chat ID

**Birdeye API (free tier):**
- Go to [bds.birdeye.so](https://bds.birdeye.so)
- Sign up → Dashboard → API Keys → Create
- Free tier: 30K compute units/month (plenty for this bot)

### 2. Deploy

**Option A: CheapClaws / Any VPS**
```bash
git clone <your-repo> && cd solana-signal-bot
cp .env.example .env
nano .env  # fill in your keys
pip install -r requirements.txt
python bot.py
```

**Option B: Run with screen (stays alive after SSH disconnect)**
```bash
screen -S signalbot
python bot.py
# Ctrl+A then D to detach
# screen -r signalbot to reattach
```

**Option C: Systemd service (auto-restart on crash)**
```bash
sudo nano /etc/systemd/system/signalbot.service
```
```ini
[Unit]
Description=Solana Signal Bot
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/solana-signal-bot
EnvironmentFile=/path/to/solana-signal-bot/.env
ExecStart=/usr/bin/python3 bot.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable signalbot
sudo systemctl start signalbot
```

### 3. Manage from Telegram

Once running, control everything from your phone:

| Command | What it does |
|---------|-------------|
| `/start` | Show help |
| `/status` | Bot stats |
| `/check <address>` | Manually check any token |
| `/filters` | Show current filters |
| `/setliq 3000 80000` | Change liquidity range |
| `/setminvol 2000` | Change min volume |
| `/setminbuys 5` | Change min buyer count |
| `/settophold 25` | Change max top holder % |

## How the scoring works

Each new token gets a score 0-100:

| Factor | Points | Logic |
|--------|--------|-------|
| Liquidity 5K-50K | +20 | Sweet spot: real but early |
| Volume (5m) > $5K | +25 | High trading activity |
| Buy/sell ratio > 3x | +25 | Strong buy pressure |
| Top holder < 10% | +20 | Distributed = less rug risk |
| Age < 10 min | +10 | Fresh launch bonus |

Signals are graded: 🔥🔥🔥 HOT (60+) | 🔥🔥 WARM (40+) | 🔥 MILD (20+)

## Data Sources (all free)

- **Birdeye WebSocket** — Real-time new token listings
- **Birdeye REST API** — Token overview, security data
- **DexScreener API** — Liquidity, volume, buy/sell counts (no key needed)

## Scaling to paid subscribers

1. Start with a free preview group (public alerts, delayed by 2-5 min)
2. Create a premium group (instant alerts, lower thresholds)
3. Use [@InviteMemberBot](https://t.me/InviteMemberBot) or similar to manage paid access
4. Accept USDC/SOL payments or use Stripe via a simple landing page

## Cost

- **Hosting**: ~$3-5/month on any VPS (or free on your existing CheapClaws)
- **APIs**: $0 (free tiers)
- **Total**: $0-5/month
