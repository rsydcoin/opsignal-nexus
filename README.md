# ⚔ OPSIGNAL NEXUS

> Forge signals. Scan risk. Conquer yield.

A fully client-side Web3 gamified DeFi application built as a fantasy RPG strategy game for signal hunters.

---

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🏗 Tech Stack

- **Next.js 14** (App Router)
- **React 18** + **TypeScript**
- **TailwindCSS** — custom arcane/fantasy theme
- **Recharts** — radar and data visualization
- **OP_NET Wallet API** — with MetaMask fallback

---

## 🗺 Routes

| Route | Feature |
|-------|---------|
| `/` | Main Hub — Portal navigation |
| `/battle` | Signal Battle — Submit predictions, win XP |
| `/radar` | Risk Radar — Vault scanning with radar chart |
| `/forge` | Yield Forge — Staking simulator |
| `/quests` | Quest Log — Daily missions |
| `/guild` | Guild Hall — Leaderboards |
| `/arena` | Signal Arena — PvP challenges |
| `/dungeon` | Vault Dungeon — Boss raid raids |

---

## ⚙ Architecture

### Client-Side Only
All gameplay runs deterministically in the browser. No backend required.

### Wallet Integration
Uses **OP_NET wallet API** (`window.opnet`) with automatic fallback to MetaMask (`window.ethereum`).
Demo mode auto-generates a mock wallet address if no wallet is installed.

### State Management
Player state persisted in `localStorage` keyed by wallet address:

```typescript
playerState = {
  walletAddress, xp, level, wins, losses,
  winrate, multiplier, questProgress, artifacts
}
```

### Level Formula
```
level = floor(sqrt(xp / 100))
```

---

## 🎮 Game Systems

### Signal Battle
- Submit token signal with confidence, duration, multiplier, stake
- Deterministic win probability: `confidence * (1 - riskScore)`
- Rewards XP and multiplier bonuses

### Risk Radar
- Simulates vault scanning with animated radar sweep
- Generates APY, liquidity, whale %, stability metrics
- Displays radar chart + AI Oracle insights

### Yield Forge
- Staking simulator with APR, time multiplier, auto-compound
- XP rewards based on stake amount and duration

### Quest System
- Daily quests reset at midnight UTC
- Win battles, scan vaults, forge yields

### Guild Leaderboard
- Shows mock + real player rankings
- Gold/Silver/Bronze badges for top 3

### Signal Arena (PvP)
- Live signal board with challengeable signals
- Deterministic battle resolution

### Vault Dungeon
- 8 dungeons with varying difficulty
- Chance to unlock artifacts
- Success rate based on player level

---

## 🎨 Design System

**Colors:** Deep navy `#020818`, dark purple `#1a0a2e`, gold `#f59e0b`, arcane purple `#7b2ec8`

**Fonts:**
- Display: Cinzel (headers, titles)
- Body: Crimson Pro (lore, descriptions)
- UI: Rajdhani (labels, stats)
- Mono: JetBrains Mono (addresses, values)

**Animations:** Portal pulse, radar sweep, particle background, XP fill, battle shake

---

## 📁 Project Structure

```
app/
  page.tsx              # Main Hub
  battle/page.tsx       # Signal Battle
  radar/page.tsx        # Risk Radar
  forge/page.tsx        # Yield Forge
  quests/page.tsx       # Quest Log
  guild/page.tsx        # Guild Hall
  arena/page.tsx        # Signal Arena
  dungeon/page.tsx      # Vault Dungeon
  globals.css           # Global styles + fonts

components/
  HUD.tsx               # Top navigation bar
  PortalButton.tsx      # Animated portal navigation buttons
  XPBar.tsx             # XP progress display
  AICompanion.tsx       # Oracle AI insights panel
  BattleResultModal.tsx # Animated battle outcome modal
  Leaderboard.tsx       # Guild rankings table
  ParticleBackground.tsx # Canvas particle system

lib/
  walletContext.tsx     # OP_NET wallet + global state
  xpSystem.ts           # XP, leveling, player state
  gameEngine.ts         # Battle logic
  riskEngine.ts         # Vault scanning
  stakingEngine.ts      # Yield forge calculations
  arenaEngine.ts        # PvP arena logic
  dungeonEngine.ts      # Dungeon raids
  leaderboard.ts        # Rankings data
```
