# HEXQUEST — Master Build Prompt

> This is the spec. `index.html` is the execution of this document.

## One-line pitch

A medieval text-adventure RPG where you tithe your entire estate to a winged
nobleman in smoked spectacles, fight your own paper hands with a d20, and endure
an audience from a man who has not stopped talking since the first block was hewn.

## Rating

**18+ / Mature.** Coarse language, cartoon gore, crude and scatological humour,
sexual innuendo. No explicit sexual content — the register is filth and farce,
not pornography, which is both funnier and shippable on a storefront.

## Tone

Cringe as a *load-bearing mechanic*, not a garnish. The comedy targets
crypto-influencer culture transposed into the fourteenth century: six-hour
audiences, price prophecies, bond ladders, sacrifice phases, merchandise tabards,
marginal-annotation warfare, and men wearing smoked spectacles indoors at night.

Punch at the grift, the vanity, and the sunk cost. Every failure state should be
funnier than every success state.

### The fellowship

The Order of the Gilded Hand is entirely men, and the game plays this as
unashamedly homoerotic devotion — knights oiling one another's armour in ninety
minutes of companionable silence, weeping into each other's pauldrons over a
four-percent dip. It is funny because they are *earnest*, never because intimacy
between men is the punchline. The one option that asks why there are no women
present is the only moment in the game played completely straight.

## Legal posture (non-negotiable for a paid release)

All proper nouns are fictionalised parody, centralised in a single `LORE` object
so a rename is one edit:

| Real-world referent | In-game name |
| --- | --- |
| The founder figure | **Richard Heartburn**, the Gilded Fae-Lord |
| The token | **gilders** |
| The chain | **Throbmarch** |
| The regulator | **The Chancery of Vibes** |
| The luxury house | **DUCCI** |

No real logos, no real likenesses, no assertions of fact about any living person.
A parody notice sits in the masthead and on the title screen.

**The boss is written as genuinely magnificent** — vast, winged, gilded, camp,
and entirely unbothered. The mockery lands on his vanity, his grift, and his
inability to stop talking. Not his body, and not on "fairy" as an insult.

## Core systems (all implemented)

### 1. Dice
d20 + modifier vs DC. Natural 20 = **NUMBER GO UP** (crit, double effect).
Natural 1 = **RUGGED** (fumble, 30% damage). Talents shift the crit range.

### 2. Attributes
Rolled 4d6-drop-lowest: **PUMP** (damage), **COPE** (mana and vigour),
**TIMING** (initiative, dodge), **GALAXY BRAIN** (trivia, utility),
**SHILL** (persuasion, some abilities), **PAPER** (cursed — high PAPER makes you flinch).

### 3. Classes — 4, each with 4 abilities and an ultimate
Sacrifice-Phase Survivor (tank) · Copium Cleric (healer) · Validator Goblin (DPS) ·
Reply-Knight Rogue (debuffer).

### 4. Talents
Twelve-node pool, one pick per level, offered three at a time after each victory.

### 5. Combat
Turn-based with initiative, cooldowns, COPE costs, and status effects:
`Diamond Hands`, `Denial`, `FUD Poison`, `Rekt`, `Dazed`, `Bonded`.
**One action per turn is latched** — the menu clears while the round resolves so
a fast clicker cannot queue two actions and overwrite the victory screen.

### 6. The Cringe Meter
The signature mechanic. Embarrassing dialogue choices, crits, and certain talents
fill it. At 100 you unleash your class **ULTIMATE**. Being insufferable is the build.
It also decides which ending you get.

### 7. Trivia gates
Multiple-choice, asked by NPCs and bosses. Correct answers grant XP and boons;
wrong answers cost vigour and fill the cringe meter. All four options must be
funny — the wrong ones especially.

### 8. Quests, economy, persistence
Journal with active and completed entries · gilders, a merchant, consumables and
permanent upgrades, one hostile wager · save/load to localStorage · achievements.

## Act structure

1. **Copeton — The Sacrifice Phase.** Tutorial town, guildhall, audience.
   Boss: **The Paper-Handed Hydra** — three heads, three exit strategies, no agreement.
2. **The Fifteen-Year Oubliette.** A ladder where each rung is a year.
   Boss: **The Tollkeeper of the Old Road**.
3. **The March Bridge.** Boss: **Sir Chadwick Gasslighter, the Mirror Knight**.
4. **The Chancery of Vibes.** Boss: **Chancellor Karen Formfiller, Keeper of the Rolls**.
5. **The Sun Throne.** Boss: **Richard Heartburn**, then his true second form,
   **THE ORIGIN VAULT**.

## Endings

- **DIAMOND HANDS ETERNAL** — finish under 70% cringe.
- **THOU ART BECOME THE HEARTBURN** — finish at 70%+ cringe. You take the throne.
- **REKT** — die. Narrated with enormous dignity.
- **TOUCHED GRASS** *(secret)* — at the final throne, walk away.

## Visual direction

Illuminated manuscript by torchlight — **not** a green terminal, and not the
neon-synthwave default. Charred oak ground, gold leaf, vermilion ink, verdigris.
Palatino display caps over a Georgia body, monospace reserved for numbers.
Canvas-drawn cathedral: masonry, gothic arch, flickering rose window, guttering
sconces, receding flagstones. 16×16 pixel sprites with hit-flash and screen shake.
Every location shows its resident NPC on the stage.

## Delivery

Single self-contained HTML file. No external requests, no CDN, no fonts to fetch —
so the identical build runs from a browser, from Vercel, and inside an Electron
shell for Steam.
