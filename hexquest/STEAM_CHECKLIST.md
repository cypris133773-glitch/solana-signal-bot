# Shipping HEXQUEST on Steam

Everything needed to take this from a working build to a store page, plus the
things that will actually get you rejected.

> Steam's requirements and fees change. Verify each item against current
> Steamworks documentation before you rely on it — this is a working checklist,
> not a legal or contractual source.

---

## 1. Account and fees

- [ ] Steamworks partner account (company or sole trader details, bank account, tax forms — W-9 or W-8BEN).
- [ ] **Steam Direct fee: $100 USD per app**, recoupable once the app earns $1,000.
- [ ] Tax interview completed. Steam will not pay out until it is.
- [ ] App ID issued.

## 2. Build

The game is a single self-contained HTML file, wrapped in Electron.

```bash
cd desktop
npm install
npm start          # run the desktop build locally
npm run dist:win   # unpacked Windows build -> desktop/build/
```

- [ ] Build and test on every platform you intend to list. Do not list macOS unless you have tested on macOS.
- [ ] Upload with SteamPipe (`steamcmd` + an app/depot VDF). Targets are set to `dir` because SteamPipe uploads unpacked folders.
- [ ] Set the launch executable per platform in Steamworks → Installation → General.
- [ ] macOS builds must be signed and notarised or Gatekeeper will block them.
- [ ] Windows builds are commonly flagged by SmartScreen unsigned — a code-signing certificate is strongly recommended.

**Save data** lives in `localStorage` inside the Electron user-data directory.
If you want Steam Cloud, map that directory in Steamworks → Cloud, or migrate
saves to a JSON file first. Not required to ship.

## 3. Store page assets

All are required before review. Sizes are the current standard set:

| Asset | Size |
| --- | --- |
| Header capsule | 460 × 215 |
| Small capsule | 231 × 87 |
| Main capsule | 1232 × 706 |
| Vertical capsule | 748 × 896 |
| Library capsule | 600 × 900 |
| Library header | 460 × 215 |
| Library hero | 3840 × 1240 |
| Library logo | transparent PNG |
| Screenshots | at least 5, 1920 × 1080 |
| Trailer | at least one, 1080p |

- [ ] Small capsule must have **legible text at actual size** — this is one of the most common rejection reasons.
- [ ] Screenshots must show actual gameplay. No marketing collage, no text overlays on the first few.
- [ ] Capsule art must not imply content the game does not contain.

## 4. Content rating and the 18+ question

This game is **Mature**, not Adult Only. Fill in the Steamworks content survey honestly:

- [ ] **Frequent violence or gore** — yes (cartoon, comedic, non-realistic).
- [ ] **Adult content / strong language** — yes (frequent profanity, crude and scatological humour, sexual innuendo).
- [ ] **General mature content** — describe it: satire of financial-influencer culture, comedic gore, crude humour.
- [ ] **Adult Only Sexual Content** — **no.** There is none, and answering yes puts you in a far more restricted category.

Underclaiming here gets the page pulled after launch. Overclaiming buries it.
The description field is public; write it plainly.

- [ ] Enable the mature-content age gate on the store page.
- [ ] No rating board certification (ESRB/PEGI) is required for Steam self-publishing.

## 5. Legal — read this one properly

The game is **already fictionalised** for exactly this reason: `Richard Heartburn`,
`gilders`, `Throbmarch`, `DUCCI`. Keep it that way for a paid release.

- [ ] **Do not restore real names.** Selling a product that uses a living person's name or likeness as a villain invites right-of-publicity and defamation claims, and the fact that it is a joke is a defence you have to pay a lawyer to make. Parody protection is real but it is a *defence*, not a shield against being sued.
- [ ] **Do not use real trademarks.** `DUCCI` is a parody label. A real luxury house's name or logo on a paid product is a trademark problem independent of the parody question.
- [ ] Keep the parody notice in the masthead, on the title screen, and in the store description.
- [ ] Make no statement of fact about any real person or project — the game asserts nothing about anyone real, and should stay that way.
- [ ] Add a EULA if you want one. Steam supplies a default if you do not.
- [ ] No privacy policy needed — the game collects nothing and makes no network requests.
- [ ] **Get an actual lawyer to look at it before release.** This checklist is not that.

## 6. Store listing copy

- [ ] Short description (max ~300 characters).
- [ ] Full description — features, systems, what the player actually does.
- [ ] Genre and tags: RPG, Adventure, Indie, Comedy, Text-Based, Choose Your Own Adventure, Turn-Based Combat, Satire.
- [ ] System requirements. Electron: 64-bit OS, ~4 GB RAM, ~250 MB disk, any GPU.
- [ ] Pricing per region. Steam takes 30% below $10M lifetime revenue.

## 7. Review and release timing

- [ ] Build review: typically a few business days.
- [ ] Store page review: separate from build review.
- [ ] **The store page must be public for at least 30 days before you can release.** Plan for this — it is the single most common cause of a slipped launch date.
- [ ] Set a release date only once both reviews have passed.

## 8. Before you press the button

- [ ] Full playthrough on the packaged build, not the dev build.
- [ ] All five acts reachable, all four endings reachable.
- [ ] Save and reload works from the packaged build.
- [ ] Alt-tab, fullscreen, window resize, and 1280×720 all behave.
- [ ] The parody notice is visible in the shipped build.
