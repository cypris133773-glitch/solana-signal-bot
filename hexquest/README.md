# HEXQUEST: The Sacrifice Phase

A medieval text-adventure RPG about tithing your entire estate to a winged
nobleman in smoked spectacles who will not stop talking.

**18+ / Mature.** Coarse language, cartoon gore, crude humour, sexual innuendo.
**Parody.** Every person, coin, realm and luxury house in it is fictional.

---

## Play it

Open `index.html`. That is the whole game — one self-contained file, no build
step, no dependencies, no network requests.

```bash
python3 -m http.server -d . 8000   # then open http://localhost:8000
```

## What's in it

| | |
| --- | --- |
| **Dice** | d20 + modifier vs DC. Nat 20 = NUMBER GO UP. Nat 1 = RUGGED. |
| **Attributes** | PUMP, COPE, TIMING, GALAXY BRAIN, SHILL, and PAPER (cursed). |
| **Classes** | Sacrifice-Phase Survivor, Copium Cleric, Validator Goblin, Reply-Knight Rogue — 4 abilities and an ultimate each. |
| **Talents** | 12-node pool, one pick per level, three offered per victory. |
| **Combat** | Turn-based, initiative, cooldowns, cope costs, six status effects. |
| **Cringe Meter** | Fills on embarrassing choices and crits. At 100 it unlocks your ultimate — and it decides your ending. |
| **Trivia** | Multiple-choice gates from NPCs and bosses. Wrong answers hurt. |
| **Acts** | Five, each with a boss. The last one has two forms. |
| **Endings** | Four, including one secret. |
| **Saves** | localStorage, automatic. |

## Layout

```
index.html              the entire game
GAME_DESIGN_PROMPT.md   the spec this was built from
STEAM_CHECKLIST.md      everything needed to ship it commercially
vercel.json             static hosting config + CSP headers
desktop/                Electron shell for the Steam build
```

## Deploy to Vercel

```bash
npm i -g vercel
cd hexquest
vercel --prod
```

Static deploy, no framework preset needed. `vercel.json` sets a strict CSP —
the game makes no external requests, so nothing needs relaxing.

## Desktop build (Steam)

```bash
cd desktop
npm install
npm start          # run it
npm run dist:win   # unpacked build -> desktop/build/
```

Targets are `dir` because SteamPipe uploads unpacked folders.
See `STEAM_CHECKLIST.md` before doing anything commercial with this —
particularly the legal section.

## Renaming the world

Every proper noun is in the `LORE` object at the top of the script. Change it
there and the whole game follows. **Read the legal section of the Steam
checklist before pointing it at anything real.**
