"""
🚀 Solana Memecoin Signal Bot for Telegram
=============================================
Monitors new Pump.fun token launches on Solana, filters for promising ones,
and sends real-time alerts to your Telegram chat/group.

FREE to run — uses free APIs:
- Birdeye WebSocket (free tier: 30K compute units/month)
- Birdeye REST API (free tier for price data)
- DexScreener API (free, no key needed)
- Telegram Bot API (free)

Revenue model: Charge subscribers 5-10 USDC/month for access to your private group.

Setup:
1. pip install python-telegram-bot aiohttp websockets requests --break-system-packages
2. Get a free Birdeye API key at https://bds.birdeye.so
3. Create a Telegram bot via @BotFather
4. Set your env vars (see .env.example)
5. python bot.py
"""

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Optional

import aiohttp
import websockets
from telegram import Bot, Update
from telegram.ext import Application, CommandHandler, ContextTypes

# ── Config ──────────────────────────────────────────────────────────────────

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "YOUR_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "YOUR_CHAT_ID")  # Your group/channel ID
BIRDEYE_API_KEY = os.getenv("BIRDEYE_API_KEY", "YOUR_BIRDEYE_KEY")

# Filter settings — tune these to find gems vs. rugs
MIN_LIQUIDITY_USD = float(os.getenv("MIN_LIQUIDITY", "5000"))       # Min liquidity to alert
MAX_LIQUIDITY_USD = float(os.getenv("MAX_LIQUIDITY", "100000"))     # Max (skip mega launches)
MIN_VOLUME_5M = float(os.getenv("MIN_VOLUME_5M", "1000"))          # Min 5-min volume
MIN_BUY_COUNT = int(os.getenv("MIN_BUY_COUNT", "10"))              # Min unique buyers
MAX_TOP_HOLDER_PCT = float(os.getenv("MAX_TOP_HOLDER", "30"))       # Max % held by top wallet
ALERT_COOLDOWN_SEC = int(os.getenv("ALERT_COOLDOWN", "30"))         # Seconds between alerts

# DexScreener (free, no API key) and Birdeye endpoints
DEXSCREENER_API = "https://api.dexscreener.com/latest/dex"
BIRDEYE_API = "https://public-api.birdeye.so"
BIRDEYE_WS = f"wss://public-api.birdeye.so/socket/solana?x-api-key={BIRDEYE_API_KEY}"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger("signal-bot")


# ── Data Models ─────────────────────────────────────────────────────────────

@dataclass
class TokenSignal:
    address: str
    name: str
    symbol: str
    liquidity_usd: float
    volume_5m: float
    price_usd: float
    buy_count: int
    sell_count: int
    top_holder_pct: float
    created_at: float
    score: int = 0
    tags: list = field(default_factory=list)

    def compute_score(self):
        """Simple scoring: higher = more promising signal."""
        self.score = 0
        self.tags = []

        # Liquidity sweet spot (5K-50K = early but real)
        if 5000 <= self.liquidity_usd <= 50000:
            self.score += 20
            self.tags.append("💧 Good Liquidity")
        elif self.liquidity_usd > 50000:
            self.score += 10

        # Volume momentum
        if self.volume_5m > 5000:
            self.score += 25
            self.tags.append("📈 High Volume")
        elif self.volume_5m > 2000:
            self.score += 15
            self.tags.append("📊 Decent Volume")

        # Buy pressure (more buys than sells = bullish)
        if self.buy_count > 0 and self.sell_count > 0:
            ratio = self.buy_count / max(self.sell_count, 1)
            if ratio > 3:
                self.score += 25
                self.tags.append("🟢 Strong Buy Pressure")
            elif ratio > 1.5:
                self.score += 15
                self.tags.append("🟡 Positive Buy Flow")

        # Holder distribution (lower top holder = less rug risk)
        if self.top_holder_pct < 10:
            self.score += 20
            self.tags.append("✅ Distributed")
        elif self.top_holder_pct < 20:
            self.score += 10
        else:
            self.score -= 10
            self.tags.append("⚠️ Concentrated Holdings")

        # Freshness bonus (< 10 min old)
        age_min = (time.time() - self.created_at) / 60
        if age_min < 10:
            self.score += 10
            self.tags.append("🆕 Fresh Launch")

        return self.score


# ── API Helpers ─────────────────────────────────────────────────────────────

async def fetch_dexscreener_token(session: aiohttp.ClientSession, address: str) -> Optional[dict]:
    """Fetch token data from DexScreener (free, no key needed)."""
    try:
        url = f"{DEXSCREENER_API}/tokens/{address}"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status == 200:
                data = await resp.json()
                pairs = data.get("pairs", [])
                if pairs:
                    return pairs[0]  # Return the most liquid pair
    except Exception as e:
        log.warning(f"DexScreener error for {address}: {e}")
    return None


async def fetch_birdeye_token_overview(session: aiohttp.ClientSession, address: str) -> Optional[dict]:
    """Fetch token overview from Birdeye (free tier)."""
    try:
        url = f"{BIRDEYE_API}/defi/token_overview?address={address}"
        headers = {"X-API-KEY": BIRDEYE_API_KEY, "x-chain": "solana"}
        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get("data")
    except Exception as e:
        log.warning(f"Birdeye overview error for {address}: {e}")
    return None


async def fetch_birdeye_security(session: aiohttp.ClientSession, address: str) -> Optional[dict]:
    """Fetch token security info from Birdeye."""
    try:
        url = f"{BIRDEYE_API}/defi/token_security?address={address}"
        headers = {"X-API-KEY": BIRDEYE_API_KEY, "x-chain": "solana"}
        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get("data")
    except Exception as e:
        log.warning(f"Birdeye security error for {address}: {e}")
    return None


# ── Signal Analysis ─────────────────────────────────────────────────────────

async def analyze_token(session: aiohttp.ClientSession, address: str) -> Optional[TokenSignal]:
    """Pull data from multiple sources and create a scored signal."""

    # Fetch from DexScreener (free) and Birdeye in parallel
    dex_data, be_overview, be_security = await asyncio.gather(
        fetch_dexscreener_token(session, address),
        fetch_birdeye_token_overview(session, address),
        fetch_birdeye_security(session, address),
        return_exceptions=True
    )

    # Handle exceptions from gather
    if isinstance(dex_data, Exception): dex_data = None
    if isinstance(be_overview, Exception): be_overview = None
    if isinstance(be_security, Exception): be_security = None

    if not dex_data and not be_overview:
        return None

    # Build signal from best available data
    name = "Unknown"
    symbol = "???"
    liquidity = 0.0
    volume_5m = 0.0
    price = 0.0
    buys = 0
    sells = 0
    top_holder = 100.0
    created = time.time()

    if dex_data:
        name = dex_data.get("baseToken", {}).get("name", name)
        symbol = dex_data.get("baseToken", {}).get("symbol", symbol)
        liquidity = float(dex_data.get("liquidity", {}).get("usd", 0) or 0)
        volume_5m = float(dex_data.get("volume", {}).get("m5", 0) or 0)
        price = float(dex_data.get("priceUsd", 0) or 0)
        txns = dex_data.get("txns", {}).get("m5", {})
        buys = int(txns.get("buys", 0))
        sells = int(txns.get("sells", 0))
        created_ts = dex_data.get("pairCreatedAt")
        if created_ts:
            created = created_ts / 1000  # ms to sec

    if be_overview:
        if not dex_data:
            name = be_overview.get("name", name)
            symbol = be_overview.get("symbol", symbol)
            price = float(be_overview.get("price", 0) or 0)
            liquidity = float(be_overview.get("liquidity", 0) or 0)
        # Birdeye may have better volume data
        be_vol = float(be_overview.get("v5m", 0) or 0)
        if be_vol > volume_5m:
            volume_5m = be_vol

    if be_security:
        top10 = be_security.get("top10HolderPercent")
        if top10 is not None:
            top_holder = float(top10)
        owner_pct = be_security.get("ownerPercentage")
        if owner_pct and float(owner_pct) > top_holder:
            top_holder = float(owner_pct)

    signal = TokenSignal(
        address=address,
        name=name,
        symbol=symbol,
        liquidity_usd=liquidity,
        volume_5m=volume_5m,
        price_usd=price,
        buy_count=buys,
        sell_count=sells,
        top_holder_pct=top_holder,
        created_at=created
    )
    signal.compute_score()
    return signal


# ── Telegram Formatting ────────────────────────────────────────────────────

def format_signal_message(signal: TokenSignal) -> str:
    """Format a nice Telegram alert message."""

    # Score emoji
    if signal.score >= 60:
        score_emoji = "🔥🔥🔥"
        grade = "HOT"
    elif signal.score >= 40:
        score_emoji = "🔥🔥"
        grade = "WARM"
    elif signal.score >= 20:
        score_emoji = "🔥"
        grade = "MILD"
    else:
        score_emoji = "❄️"
        grade = "COLD"

    age_min = (time.time() - signal.created_at) / 60
    age_str = f"{age_min:.0f}min" if age_min < 60 else f"{age_min/60:.1f}h"

    buy_sell_ratio = signal.buy_count / max(signal.sell_count, 1)

    tags_str = " | ".join(signal.tags) if signal.tags else "No notable signals"

    msg = (
        f"{score_emoji} <b>NEW SIGNAL: ${signal.symbol}</b> [{grade}]\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"📛 <b>{signal.name}</b>\n"
        f"💰 Price: ${signal.price_usd:.10f}\n"
        f"💧 Liquidity: ${signal.liquidity_usd:,.0f}\n"
        f"📊 Vol (5m): ${signal.volume_5m:,.0f}\n"
        f"🔄 Buys/Sells (5m): {signal.buy_count}/{signal.sell_count} "
        f"(ratio: {buy_sell_ratio:.1f}x)\n"
        f"👥 Top Holder: {signal.top_holder_pct:.1f}%\n"
        f"⏱ Age: {age_str}\n"
        f"📊 Score: {signal.score}/100\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"🏷 {tags_str}\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"🔗 <a href='https://dexscreener.com/solana/{signal.address}'>DexScreener</a> | "
        f"<a href='https://birdeye.so/token/{signal.address}?chain=solana'>Birdeye</a> | "
        f"<a href='https://pump.fun/{signal.address}'>Pump.fun</a>\n"
        f"📋 <code>{signal.address}</code>"
    )
    return msg


# ── WebSocket Monitor (Birdeye New Listings) ───────────────────────────────

class TokenMonitor:
    """Monitors new token launches via Birdeye WebSocket + DexScreener polling."""

    def __init__(self, bot: Bot, chat_id: str):
        self.bot = bot
        self.chat_id = chat_id
        self.seen_tokens: dict[str, float] = {}  # address -> timestamp
        self.alert_count = 0
        self.running = False

    async def send_alert(self, signal: TokenSignal):
        """Send a signal alert to Telegram."""
        try:
            msg = format_signal_message(signal)
            await self.bot.send_message(
                chat_id=self.chat_id,
                text=msg,
                parse_mode="HTML",
                disable_web_page_preview=True
            )
            self.alert_count += 1
            log.info(f"📤 Alert #{self.alert_count}: ${signal.symbol} (score: {signal.score})")
        except Exception as e:
            log.error(f"Telegram send error: {e}")

    async def process_new_token(self, session: aiohttp.ClientSession, address: str):
        """Analyze and potentially alert on a new token."""
        if address in self.seen_tokens:
            return

        self.seen_tokens[address] = time.time()

        # Clean old entries (keep last 1000)
        if len(self.seen_tokens) > 1000:
            sorted_tokens = sorted(self.seen_tokens.items(), key=lambda x: x[1])
            self.seen_tokens = dict(sorted_tokens[-500:])

        # Wait a bit for data to populate on aggregators
        await asyncio.sleep(15)

        signal = await analyze_token(session, address)
        if not signal:
            return

        # Apply filters
        if signal.liquidity_usd < MIN_LIQUIDITY_USD:
            log.debug(f"Skip {signal.symbol}: low liquidity (${signal.liquidity_usd:.0f})")
            return
        if signal.liquidity_usd > MAX_LIQUIDITY_USD:
            log.debug(f"Skip {signal.symbol}: too high liquidity")
            return
        if signal.volume_5m < MIN_VOLUME_5M:
            log.debug(f"Skip {signal.symbol}: low volume")
            return
        if signal.buy_count < MIN_BUY_COUNT:
            log.debug(f"Skip {signal.symbol}: too few buyers ({signal.buy_count})")
            return
        if signal.top_holder_pct > MAX_TOP_HOLDER_PCT:
            log.debug(f"Skip {signal.symbol}: concentrated ({signal.top_holder_pct:.0f}%)")
            return

        # Only alert on decent+ scores
        if signal.score >= 20:
            await self.send_alert(signal)

    async def run_birdeye_websocket(self, session: aiohttp.ClientSession):
        """Connect to Birdeye WebSocket for new token listings."""
        while self.running:
            try:
                log.info("🔌 Connecting to Birdeye WebSocket...")
                async with websockets.connect(BIRDEYE_WS) as ws:
                    # Subscribe to new token listings from pump.fun
                    subscribe_msg = json.dumps({
                        "type": "SUBSCRIBE_TOKEN_NEW_LISTING",
                        "meme_platform_enabled": True,
                        "min_liquidity": MIN_LIQUIDITY_USD,
                    })
                    await ws.send(subscribe_msg)
                    log.info("✅ Subscribed to new token listings")

                    async for message in ws:
                        try:
                            data = json.loads(message)
                            address = data.get("address") or data.get("mint") or data.get("token")
                            if address:
                                asyncio.create_task(
                                    self.process_new_token(session, address)
                                )
                        except json.JSONDecodeError:
                            continue

            except websockets.exceptions.ConnectionClosed:
                log.warning("⚠️ WebSocket disconnected, reconnecting in 5s...")
                await asyncio.sleep(5)
            except Exception as e:
                log.error(f"WebSocket error: {e}, retrying in 10s...")
                await asyncio.sleep(10)

    async def run_dexscreener_polling(self, session: aiohttp.ClientSession):
        """Fallback: Poll DexScreener for new Solana pairs (free, no key)."""
        while self.running:
            try:
                url = f"{DEXSCREENER_API}/search?q=pump.fun"
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        pairs = data.get("pairs", [])
                        for pair in pairs:
                            if pair.get("chainId") != "solana":
                                continue
                            address = pair.get("baseToken", {}).get("address")
                            if address:
                                created = pair.get("pairCreatedAt", 0) / 1000
                                # Only process tokens < 30 min old
                                if time.time() - created < 1800:
                                    asyncio.create_task(
                                        self.process_new_token(session, address)
                                    )
            except Exception as e:
                log.warning(f"DexScreener poll error: {e}")

            await asyncio.sleep(30)  # Poll every 30 seconds

    async def start(self):
        """Start all monitoring tasks."""
        self.running = True
        async with aiohttp.ClientSession() as session:
            await self.bot.send_message(
                chat_id=self.chat_id,
                text=(
                    "🤖 <b>Solana Signal Bot Online</b>\n\n"
                    f"📡 Monitoring Pump.fun launches\n"
                    f"💧 Liquidity filter: ${MIN_LIQUIDITY_USD:,.0f} - ${MAX_LIQUIDITY_USD:,.0f}\n"
                    f"📊 Min volume (5m): ${MIN_VOLUME_5M:,.0f}\n"
                    f"👥 Min buyers: {MIN_BUY_COUNT}\n"
                    f"⚠️ Max top holder: {MAX_TOP_HOLDER_PCT}%\n\n"
                    f"Signals will be posted here automatically."
                ),
                parse_mode="HTML"
            )

            tasks = [
                asyncio.create_task(self.run_birdeye_websocket(session)),
                asyncio.create_task(self.run_dexscreener_polling(session)),
            ]

            try:
                await asyncio.gather(*tasks)
            except asyncio.CancelledError:
                self.running = False
                log.info("Monitor stopped")

    def stop(self):
        self.running = False


# ── Telegram Bot Commands ──────────────────────────────────────────────────

monitor: Optional[TokenMonitor] = None


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🚀 <b>Solana Signal Bot</b>\n\n"
        "Commands:\n"
        "/start - This message\n"
        "/status - Bot status & stats\n"
        "/check <address> - Manually check a token\n"
        "/filters - Show current filter settings\n"
        "/setliq <min> <max> - Set liquidity range\n"
        "/setminvol <amount> - Set min 5m volume\n"
        "/setminbuys <count> - Set min buyer count\n"
        "/settophold <pct> - Set max top holder %\n",
        parse_mode="HTML"
    )


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global monitor
    if monitor:
        await update.message.reply_text(
            f"🟢 <b>Bot Active</b>\n"
            f"📊 Alerts sent: {monitor.alert_count}\n"
            f"👀 Tokens tracked: {len(monitor.seen_tokens)}\n"
            f"⏰ Uptime: Running",
            parse_mode="HTML"
        )
    else:
        await update.message.reply_text("🔴 Monitor not active")


async def cmd_check(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("Usage: /check <token_address>")
        return

    address = context.args[0]
    await update.message.reply_text(f"🔍 Analyzing {address[:8]}...")

    async with aiohttp.ClientSession() as session:
        signal = await analyze_token(session, address)
        if signal:
            msg = format_signal_message(signal)
            await update.message.reply_text(msg, parse_mode="HTML", disable_web_page_preview=True)
        else:
            await update.message.reply_text("❌ Could not fetch data for this token.")


async def cmd_filters(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        f"⚙️ <b>Current Filters</b>\n\n"
        f"💧 Liquidity: ${MIN_LIQUIDITY_USD:,.0f} - ${MAX_LIQUIDITY_USD:,.0f}\n"
        f"📊 Min Vol (5m): ${MIN_VOLUME_5M:,.0f}\n"
        f"👥 Min Buyers: {MIN_BUY_COUNT}\n"
        f"⚠️ Max Top Holder: {MAX_TOP_HOLDER_PCT}%\n"
        f"⏱ Alert Cooldown: {ALERT_COOLDOWN_SEC}s",
        parse_mode="HTML"
    )


async def cmd_setliq(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global MIN_LIQUIDITY_USD, MAX_LIQUIDITY_USD
    if len(context.args) < 2:
        await update.message.reply_text("Usage: /setliq <min> <max>\nExample: /setliq 3000 80000")
        return
    try:
        MIN_LIQUIDITY_USD = float(context.args[0])
        MAX_LIQUIDITY_USD = float(context.args[1])
        await update.message.reply_text(
            f"✅ Liquidity range set: ${MIN_LIQUIDITY_USD:,.0f} - ${MAX_LIQUIDITY_USD:,.0f}"
        )
    except ValueError:
        await update.message.reply_text("❌ Invalid numbers")


async def cmd_setminvol(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global MIN_VOLUME_5M
    if not context.args:
        await update.message.reply_text("Usage: /setminvol <amount>")
        return
    try:
        MIN_VOLUME_5M = float(context.args[0])
        await update.message.reply_text(f"✅ Min volume set: ${MIN_VOLUME_5M:,.0f}")
    except ValueError:
        await update.message.reply_text("❌ Invalid number")


async def cmd_setminbuys(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global MIN_BUY_COUNT
    if not context.args:
        await update.message.reply_text("Usage: /setminbuys <count>")
        return
    try:
        MIN_BUY_COUNT = int(context.args[0])
        await update.message.reply_text(f"✅ Min buyers set: {MIN_BUY_COUNT}")
    except ValueError:
        await update.message.reply_text("❌ Invalid number")


async def cmd_settophold(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global MAX_TOP_HOLDER_PCT
    if not context.args:
        await update.message.reply_text("Usage: /settophold <percent>")
        return
    try:
        MAX_TOP_HOLDER_PCT = float(context.args[0])
        await update.message.reply_text(f"✅ Max top holder set: {MAX_TOP_HOLDER_PCT}%")
    except ValueError:
        await update.message.reply_text("❌ Invalid number")


# ── Main ────────────────────────────────────────────────────────────────────

async def post_init(application: Application):
    """Start the token monitor after the bot initializes."""
    global monitor
    monitor = TokenMonitor(application.bot, TELEGRAM_CHAT_ID)
    asyncio.create_task(monitor.start())


def main():
    log.info("🚀 Starting Solana Signal Bot...")

    app = Application.builder().token(TELEGRAM_BOT_TOKEN).post_init(post_init).build()

    # Register commands
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("check", cmd_check))
    app.add_handler(CommandHandler("filters", cmd_filters))
    app.add_handler(CommandHandler("setliq", cmd_setliq))
    app.add_handler(CommandHandler("setminvol", cmd_setminvol))
    app.add_handler(CommandHandler("setminbuys", cmd_setminbuys))
    app.add_handler(CommandHandler("settophold", cmd_settophold))

    # Run the bot
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
