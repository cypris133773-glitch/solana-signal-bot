# SURVIVOR.io — HEX EDITION · Richard Heart vs The Bear Market

A **Survivor.io / Vampire-Survivors** style auto-shooter, themed around
**Richard Heart, HEX, PulseChain and PulseX**. You play as the heart-sunglasses
crypto founder wielding a glowing HEX staff inside a hexagonal shield, auto-attacking
endless waves of FUD-zombies while you stake, fork and swap your way to survival.
Level up, pick your skills, and outlast the crypto winter.

Pure vanilla **HTML5 Canvas + JavaScript** — every character (Richard Heart, the
FUD-zombies, the purple PulseChain boss, the HEX PUP pet) is drawn on canvas at
runtime, so there are **no image assets, no build step and no dependencies**. The
full mobile-portrait UI (STATS · ACTIVE SKILL · POWER-UPS · EQUIPMENT · PET, HEX &
PulseChain logos, crypto-style damage numbers) is styled to match the mockup and
works on desktop and mobile.

## ▶ Play

**Online (GitHub Pages):** https://cypris133773-glitch.github.io/solana-signal-bot/

Or just open `index.html` in any modern browser:

```bash
# from the repo root
open game/index.html          # macOS
xdg-open game/index.html      # Linux
# ...or serve it
python3 -m http.server -d game 8000   # then visit http://localhost:8000
```

## 🎮 Controls

| Action | Desktop | Mobile |
| ------ | ------- | ------ |
| Move   | `WASD` / Arrow keys | Drag anywhere (floating joystick) |
| Attack | Automatic | Automatic |
| Pause  | `Esc` or the `II` button | `II` button |

You **auto-attack** the nearest enemies. Your only job is to move, dodge, and
collect the pink **◈ HEX gems** enemies drop to gain XP.

## 📈 Progression — Levels & Skills

Collect HEX gems → fill the XP bar → **LEVEL UP** → choose **1 of 3** upgrades.
Weapons and passives both scale up, so every run builds a different loadout.

### Weapons

| Weapon | Style | Flavor |
| ------ | ----- | ------ |
| ◈ **HEX Stake Orbit** | Orbiting shields | Staked HEX spins around you, shredding contact |
| 🍴 **PulseChain Fork** | Homing bolts | Fork the chain — auto-fires at the nearest enemy |
| 🔄 **PulseX Spread** | Shotgun spread | Swap-fee pellets blast outward |
| ⚡ **T-Share Beam** | Sweeping laser | Big-payday beam damages over time |
| 💥 **Sacrifice Nova** | Shockwave | Periodic pulse that knocks back and burns |

### Passives

💎 Diamond Hands (Max HP) · 🏎️ Lambo Speed · 🧲 HEX Magnet (pickup range) ·
📈 Bull Market (damage) · ⛽ Gas Optimizer (attack speed) ·
🌱 Staking Rewards (HP regen) · 🤑 Number Go Up (XP gain)

## 👾 Enemies

😠 FUDster · 🧻 Paper Hands · 📉 Shorter · 🐻 Bear · 👮 SEC Agent —
and at the end, the final boss: **🐻 The Bear Market**.

## 🏆 Goal

Survive **5 minutes** and defeat **The Bear Market** to win. Your best survival
time is saved locally in the browser. Difficulty ramps continuously — enemies
get tankier and spawn faster the longer you last.

## 🗂 Structure

```
game/
├── index.html      # markup + screens (start / level-up / game-over / win)
├── css/style.css   # neon HEX/Pulse styling, HUD, overlays
└── js/game.js      # engine: loop, spawning, weapons, XP, skills, boss
```

The engine is a single self-contained IIFE — no framework. A dormant debug hook
(`?debug` in the URL) exposes helpers used only by automated smoke tests.

---

*Parody / fan game for entertainment. Not affiliated with Richard Heart, HEX,
PulseChain, or PulseX. Not financial advice — it's a game about not selling.*
