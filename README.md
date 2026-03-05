# OPSIGNAL NEXUS ⚔

A gamified Web3 strategy hub where users explore DeFi opportunities, battle market risk, and level up as Signal Knights.

OPSignal Nexus transforms complex DeFi analysis into an interactive RPG-style experience. Instead of traditional dashboards, users interact with a game-like interface to scan vaults, forge yield strategies, and compete with other players.

---

## 🚀 Concept

In OPSIGNAL NEXUS, users become **Signal Knights**.

Your mission is to:

- Predict profitable signals
- Scan DeFi vaults for risk
- Forge yield strategies
- Complete quests
- Compete with other players

Every action rewards **XP**, allowing players to level up and climb the leaderboard.

---

## 🎮 Core Features

### ⚔ Signal Battle

Predict token performance and battle market risk.

Players submit signals with:

- Token
- Target multiplier
- Confidence
- Stake amount
- Duration

The system simulates a battle outcome based on risk score and probability.

Rewards:

- XP
- Multiplier bonuses
- Improved win rate

---

### 📡 Risk Radar

Scan DeFi vaults with a radar-style analyzer.

Generated metrics include:

- APY
- Liquidity
- Whale concentration
- Stability score

The radar computes a **Risk Index** and visualizes the results using a radar chart.

---

### 🔨 Yield Forge

Simulate yield strategies.

Players can stake tokens in a forge system that generates:

- APR
- Auto-compound bonuses
- Time multipliers

Staking actions also reward XP.

---

### 🧭 Quest System

Daily quests encourage exploration and interaction.

Examples:

- Win 1 signal battle
- Scan 2 vaults
- Forge 1 yield strategy

Completing quests grants XP rewards.

---

### 🏆 Guild Leaderboard

Compete with other players and climb the ranking board.

Leaderboard tracks:

- Player level
- XP
- Win rate
- Battle results

Top players receive special ranking badges.

---

### ⚔ Signal Arena (PvP)

Players can challenge signals submitted by other users.

Arena battles simulate prediction competitions between players, rewarding XP to the winner.

---

### 🏰 Vault Dungeon

Vaults are represented as **dungeons**.

Players can enter a dungeon to challenge its risk level. Successfully clearing a dungeon unlocks rewards and artifacts.

---

### 🔮 AI Signal Companion

A built-in assistant analyzes player actions and vault metrics.

It provides insights such as:

- High whale concentration warnings
- Liquidity instability alerts
- APY anomalies

---

## 🧠 Gamification System

Player progression includes:

- XP
- Levels
- Wins / losses
- Win rate
- Multiplier bonuses

Level formula:
level = floor(sqrt(xp / 100))

All player state is stored locally and linked to the connected wallet.

---

## 🔗 Wallet Integration

OPSignal Nexus integrates with **OP_NET wallets**.

Wallet features include:

- Connect wallet
- Player identity
- Action signing
- State association with wallet address

Wallet actions include:

- Entering signal battles
- Staking in yield forge
- Claiming quest rewards

---

## 🧩 Tech Stack

- Next.js 14
- React
- TypeScript
- TailwindCSS
- OP_NET Wallet API

The application runs fully **client-side**, using deterministic simulation logic for gameplay mechanics.

---

## 📂 Project Structure
app/
battle/
radar/
forge/
quests/
guild/
arena/
dungeon/

components/
HUD
XPBar
PortalButton
BattlePanel
RadarScanner
ForgePanel
QuestBoard
ArenaBoard
DungeonPanel
AICompanion
Leaderboard

lib/
gameEngine
riskEngine
stakingEngine
arenaEngine
dungeonEngine
xpSystem
leaderboard


---

## 🧪 Running the Project

Clone the repository:
git clone https://github.com/yourusername/opsignal-nexus.git

Install dependencies:
npm install

Run development server:
npm run dev

Open in browser:
http://localhost:3000


---

## 🌐 Deployment

The project can be easily deployed using:

- Vercel

---

## 🎯 Hackathon Submission

This project was built for the **VibeCode Finance Challenge**.

The goal was to explore how DeFi tools can be reimagined through gamified interfaces.

---

