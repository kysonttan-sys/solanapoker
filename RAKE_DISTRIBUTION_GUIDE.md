# 🎰 Complete Rake Distribution System

## Overview
Your Solana Poker platform has a comprehensive 6-way rake distribution system with automatic distributions for Global Partner Pool and Monthly Jackpot.

---

## 💰 Rake Calculation

### VIP Levels & Rake Rates
| VIP Level | Rake % | Cap per Hand |
|-----------|--------|--------------|
| **Fish** (Level 0) | 5.0% | $5 |
| **Grinder** (Level 1) | 4.5% | $4.50 |
| **Shark** (Level 2) | 4.0% | $4 |
| **High Roller** (Level 3) | 3.5% | $3.50 |
| **Legend** (Level 4) | 3.0% | $3 |

**Example:** $100 pot at Legend level = $3 rake (capped at 3%)

---

## 📊 6-Way Distribution Breakdown

### 1. **Host Revenue** (30-40%)
- **Who**: Table host who created the game
- **Amount**: Based on host tier
  - Tier 0 (Dealer): 30%
  - Tier 1 (Pit Boss): 32.5%
  - Tier 2 (Floor Manager): 35%
  - Tier 3 (Casino Director): 37.5%
  - Tier 4 (Casino Mogul): 40%
- **Payment**: Instant - Added to host's balance after each hand

### 2. **Referrer Commission** (5-20%)
- **Who**: User who referred the players
- **Amount**: Based on referrer rank
  - Rank 0 (Scout): 5%
  - Rank 1 (Recruiter): 10%
  - Rank 2 (Agent): 15%
  - Rank 3 (Partner): 20%
- **Payment**: Instant - Added to referrer's balance after each hand

### 3. **Monthly Jackpot** (5%) 🎁
- **Accumulation**: Added automatically from every rake collection
- **Distribution**: **1st day of every month at 00:00 UTC**
- **Split**:
  - **30%** → Top 3 Players by hands played
    - 1st Place: 50% of this pool
    - 2nd Place: 30% of this pool
    - 3rd Place: 20% of this pool
  - **30%** → Top 3 Earners by total winnings
    - 1st Place: 50% of this pool
    - 2nd Place: 30% of this pool
    - 3rd Place: 20% of this pool
  - **40%** → 10 Lucky Random Winners (must have played ≥10 hands)
    - Equal split among winners

### 4. **Global Partner Pool** (5%) 🌍
- **Accumulation**: Added automatically from every rake collection
- **Distribution**: **Automatically when pool reaches $100**
- **Recipients**: **All Rank 3 Partners ONLY**
- **Split Method**: Proportional to team activity (based on `hostRevenue`)
  - If no activity tracked: Equal distribution

### 5. **Developer** (Remainder)
- **Amount**: Remaining after all allocations (typically 30-50%)
- **Purpose**: Platform maintenance, development, operations
- **Payment**: Instant - Added to developer wallet

### 6. **Community Pool** (Variable)
- **Purpose**: Special events, tournaments, promotions
- **Distribution**: Manual by platform administrators

---

## 🔄 Automatic Distribution Systems

### Global Partner Pool Auto-Share
```typescript
// Triggers automatically when pool reaches $100
- Finds all Rank 3 Partners
- Calculates proportional share based on team activity
- Distributes instantly to partner wallets
- Records as GLOBAL_POOL_SHARE transaction
- Resets pool to $0
```

**Example Distribution:**
- Pool Balance: $100
- Partner A has 40% team activity → Gets $40
- Partner B has 35% team activity → Gets $35
- Partner C has 25% team activity → Gets $25

### Monthly Jackpot Distribution
```typescript
// Runs on 1st day of every month at 00:00 UTC
- Distributes accumulated jackpot (5% of all rake)
- 30% to Top 3 Players (by hands played) - Tiered
- 30% to Top 3 Earners (by total winnings) - Tiered
- 40% to 10 Lucky Winners (random draw) - Equal split
```

**Example Distribution ($1000 Jackpot):**
- **Top Players** ($300):
  - 1st Place: $150 (50%)
  - 2nd Place: $90 (30%)
  - 3rd Place: $60 (20%)
- **Top Earners** ($300):
  - 1st Place: $150 (50%)
  - 2nd Place: $90 (30%)
  - 3rd Place: $60 (20%)
- **Lucky Draw** ($400): $40 each to 10 random winners

---

## 💡 Real Example

### Hand Details
- **Pot**: $100
- **Winner VIP Level**: Legend (3%)
- **Host Tier**: Floor Manager (35%)
- **Referrer Rank**: Agent (15%)

### Rake Calculation
```
Total Rake: $100 × 3% = $3.00
```

### Distribution
```
1. Host (35%):           $1.05 ✅ Paid instantly
2. Referrer (15%):       $0.45 ✅ Paid instantly
3. Jackpot (5%):         $0.15 🎰 Distributes 1st of month
4. Global Pool (5%):     $0.15 🌍 Auto-shares to Rank 3 Partners at $100
5. Developer (40%):      $1.20 ✅ Paid instantly
─────────────────────────────
Total Distributed:       $3.00 ✓
```

---

## 📈 Database Tracking

Every rake distribution is logged in the database with full audit trail:

```typescript
RakeDistribution {
  handId: "unique_hand_id",
  totalRake: 3.00,
  hostShare: 1.05,
  hostUserId: "host_wallet_address",
  hostTier: 2,
  referrerShare: 0.45,
  referrerUserId: "referrer_wallet_address",
  referrerRank: 2,
  jackpotShare: 0.15,
  globalPoolShare: 0.15,
  developerShare: 1.20,
  createdAt: "2025-12-09T..."
}
```

---

## 🎯 Transaction Types

The system tracks these transaction types:
- `RAKE_HOST` - Host revenue payment
- `RAKE_REFERRER` - Referrer commission payment
- `GLOBAL_POOL_SHARE` - Partner pool distribution
- `JACKPOT_TOP_PLAYER` - Top player jackpot win
- `JACKPOT_TOP_EARNER` - Top earner jackpot win
- `JACKPOT_LUCKY_DRAW` - Lucky winner jackpot win

---

## 🚀 How It Works in Practice

### Every Hand:
1. Game ends, winners determined
2. Rake calculated based on VIP level
3. **Instant Distributions:**
   - Host gets their %
   - Referrer gets their %
   - Developer gets their %
4. **Accumulation:**
   - 5% added to Jackpot
   - 5% added to Global Partner Pool
5. All recorded in database

### When Global Pool Reaches $100:
- Automatically triggers distribution
- All Rank 3 Partners get their proportional share
- Pool resets to $0
- Partners receive instant notification

### On 1st Day of Every Month:
- Cron job triggers at 00:00 UTC
- Jackpot distributed to:
  - Top 3 players by hands
  - Top 3 earners by winnings
  - 10 random lucky winners
- Jackpot resets to $0
- All winners receive instant payment

---

## 🔧 Manual Testing

For development/testing, you can manually trigger distributions:

```typescript
import { distributionManager } from './distributionManager';

// Manually distribute Global Partner Pool
await distributionManager.manualDistributeGlobalPool();

// Manually distribute Monthly Jackpot
await distributionManager.manualDistributeJackpot();

// Check current balances
const balances = distributionManager.getBalances();
console.log(balances); // { globalPool: 150.50, jackpot: 250.75 }
```

---

## 📅 Distribution Schedule

| Event | Frequency | Trigger |
|-------|-----------|---------|
| Host Revenue | Instant | Every hand |
| Referrer Commission | Instant | Every hand |
| Developer Share | Instant | Every hand |
| **Global Partner Pool** | **Auto at $100** | **Automatic** |
| **Monthly Jackpot** | **Monthly** | **1st day 00:00 UTC** |

---

## ✅ System Status

- ✅ Rake calculation with VIP levels
- ✅ 6-way distribution working
- ✅ Database tracking complete
- ✅ Global Partner Pool auto-distribution
- ✅ Monthly Jackpot scheduled distribution
- ✅ Cron jobs active
- ✅ Full audit trail

**The system is production-ready!** 🎉
