# 🎰 Rake Distribution Guide — Hybrid Override Model

**Last Updated:** December 12, 2025
**Status:** FINAL APPROVED SPECIFICATION

This document is the authoritative specification for rake calculation and distribution using a **Hybrid Override Referral System**. All implementations must follow this guide exactly.

---

## 📋 Table of Contents

1. [System Overview](#1--system-overview)
2. [Rake Collection (Base Rate)](#2--rake-collection-base-rate)
3. [Rake Distribution Split](#3--rake-distribution-split)
4. [Referral Rank System](#4--referral-rank-system)
5. [Override Calculation Logic](#5--override-calculation-logic)
6. [Global Pool Distribution](#6--global-pool-distribution)
7. [Complete Examples](#7--complete-examples)
8. [Data Model & Audit Requirements](#8--data-model--audit-requirements)
9. [Implementation Pointers](#9--implementation-pointers)
10. [Edge Cases & Safety Rules](#10--edge-cases--safety-rules)
11. [Admin Controls](#11--admin-controls)

---

## 1 — System Overview

**Philosophy:** 100% referral-based earnings. No separate host fees. Anyone can host a table, but you only earn commission by inviting players to the platform. This creates natural growth incentives and simplifies the commission structure.

**Key Features:**
- Insurance-style override commissions (earn difference between your rank % and downline's rank %)
- 5-tier rank system with auto-promotion based on team performance
- Weekly Global Pool distribution for Masters (top rank)
- VIP rake discounts for active players
- Full audit trail for every commission payment

---

## 2 — Rake Collection (Base Rate)

Rake is collected from each pot based on the player's VIP level, determined by total hands played.

### VIP Levels & Rake Rates

| VIP Level | Total Hands | Rake % | Per-Hand Cap |
|-----------|-------------|--------|--------------|
| Fish | 0 | 5.0% | $5.00 |
| Grinder | 1,000 | 4.5% | $4.50 |
| Shark | 5,000 | 4.0% | $4.00 |
| High Roller | 20,000 | 3.5% | $3.50 |
| Legend | 100,000 | 3.0% | $3.00 |

**Calculation:**
```
rake = min(pot * vipRakePercent, perHandCap)
```

**Side Pots:** Calculate rake per side pot separately.

---

## 3 — Rake Distribution Split

Every hand's rake is split according to this exact formula:

| Category | Percentage | Description |
|----------|-----------|-------------|
| **Referral Override** | 0-60% | Based on highest rank in referral chain (see Override Logic) |
| **Global Pool** | 5% | Accumulated weekly, distributed to all Masters |
| **Jackpot** | 5% | Accumulated monthly, distributed to winners |
| **Developer** | 30-90% | Remainder after all distributions |

**Formula:**
```
developerShare = rake - (referralOverrides + globalPool + jackpot)
```

**Important:**
- Referral overrides cap at 60% (only when Master rank exists in chain)
- If no referrers in chain, developer gets 90% (rake - jackpot - globalPool)
- All calculations use `safeMoney()` with 4 decimal precision

---

## 4 — Referral Rank System

### Rank Tiers & Override Percentages

| Rank | Override % | Auto-Promotion Requirements |
|------|-----------|---------------------------|
| **Free User** | 0% | Default (can play, cannot earn) |
| **Agent** | 20% | 3 direct referrals with 1,000+ hands EACH |
| **Broker** | 35% | 3 direct referrals are Agents |
| **Partner** | 50% | 3 direct referrals are Brokers |
| **Master** | 60% | 3 direct referrals are Partners |

### Auto-Promotion Rules

**Enabled:** System automatically promotes users when requirements are met.

**Requirements Logic:**
- **Agent:** User must have 3+ direct referrals, and each must have played 1,000+ hands individually
- **Broker:** User must have 3+ direct referrals who have achieved Agent rank
- **Partner:** User must have 3+ direct referrals who have achieved Broker rank
- **Master:** User must have 3+ direct referrals who have achieved Partner rank

**Check Frequency:**
- On every hand completion (for players involved)
- On referral milestones (when downline reaches hand/rank thresholds)
- Manual trigger via admin dashboard

**Example:** Alice refers Bob, Charlie, and Dave.
- When Bob, Charlie, Dave each reach 1,000 hands → Alice auto-promoted to Agent
- When Bob, Charlie, Dave each become Agents → Alice auto-promoted to Broker
- And so on...

---

## 5 — Override Calculation Logic

### The Hybrid Override Method

This model combines direct upline rewards with insurance-style overrides for the chain above:

1. **Players cannot earn from their own play** (always $0)
2. **Direct upline (Level 1) gets their FULL rank %** (not override difference)
3. **Indirect uplines (Level 2+) use override model** (difference between ranks)

This ensures the total payout never exceeds the highest rank % in the chain while rewarding direct sponsors generously.

### Algorithm (Per Hand)

```
1. Calculate total rake for the hand
2. Identify the player(s) involved (winner/contributors)
3. For each player, walk UP their referral chain:
   a. Player earns $0 from own play
   b. Level 1 (direct referrer):
      - Get FULL rank % (not override)
      - Calculate: payAmount = (referrerPercent / 100) * rake
      - Credit payAmount to referrer's balance
      - Log transaction with level, rank, amount
      - Set highestPaid = referrerPercent
      - Increment referrer's teamRakeWindow by rake amount
   c. Level 2+ (indirect referrers):
      - Get referrer's rank %
      - Calculate: payPercent = max(0, referrerPercent - highestPaid)
      - Calculate: payAmount = (payPercent / 100) * rake
      - Credit payAmount to referrer's balance
      - Log transaction with level, rank, amount
      - Update: highestPaid = max(highestPaid, referrerPercent)
      - Increment referrer's teamRakeWindow by rake amount
      - If payPercent = 0, continue (no payment but still increment teamRakeWindow)
   d. Stop when chain ends or maxDepth (100) reached
4. Sum all referral payments
5. Calculate developer share = rake - (referrals + globalPool + jackpot)
```

### Key Points

- **No self-earning:** You cannot earn commissions from your own poker play
- **Direct upline bonus:** Your direct sponsor gets their full rank % (e.g., Master gets full 60%)
- **Override for the rest:** Indirect uplines only get the difference (e.g., 60% - 50% = 10%)
- **Unlimited depth:** Walk entire chain (safety limit: 100 levels)
- **Team attribution:** Every ancestor gets `teamRakeWindow` incremented (for Global Pool weighting)
- **Zero-rank handling:** Free users (0%) don't block the chain; uplines still earn their full %

---

## 6 — Global Pool Distribution

### Purpose
Reward top performers (Masters) with a share of platform-wide rake, distributed weekly.

### Accumulation (Per Hand)
- 5% of every hand's rake goes into Global Pool balance
- No immediate distribution

### Distribution (Weekly)

**Frequency:** Every Monday 00:00 UTC (configurable)

**Eligibility:** Only users with **Master rank** at distribution time

**Distribution Formula:**
```
Each Master receives: (their teamRakeWindow / total teamRakeWindow of all Masters) * globalPoolBalance
```

**After Distribution:**
- Transfer calculated amounts to each Master's balance
- Reset all Masters' `teamRakeWindow` to 0
- Reset `globalPoolBalance` to 0
- Log distribution transaction with breakdown

### Display (Home Page)

Show publicly visible stats:
```
🌍 Global Pool Stats
├─ Current Pool Balance: $X,XXX
├─ Total Distributed (All-Time): $XX,XXX
├─ Last Distribution: Monday, Dec 9, 2025
├─ Next Distribution: Monday, Dec 16, 2025
└─ Active Masters: X
```

**Note:** Individual Master earnings are private (only shown in their dashboard).

---

## 7 — Complete Examples

### Example 1: Simple 3-Level Chain

**Chain:** Alice (Master 60%) → Bob (Broker 35%) → Charlie (Agent 20%) → Dave (Free 0%)

**Scenario:** Dave plays poker, pot = $60, rake = $3.00 (5%, Fish tier)

**Distribution:**

1. **Referral Overrides (60% max):**
   - Dave (player): **$0.00** (cannot earn from own play)
   - Charlie (Dave's direct upline, Level 1): Gets FULL 20% → **$0.60**
   - Bob (Charlie's upline, Level 2): 35% - 20% = 15% override → **$0.45**
   - Alice (Bob's upline, Level 3): 60% - 35% = 25% override → **$0.75**
   - **Total Referral: $1.80 (60%)**

2. **Global Pool:** 5% → $0.15 (accumulated for weekly distribution)

3. **Jackpot:** 5% → $0.15 (accumulated for monthly draw)

4. **Developer:** Remainder → $3.00 - $1.80 - $0.15 - $0.15 = **$0.90 (30%)**

**Team Attribution (teamRakeWindow incremented):**
- Charlie: +$3.00
- Bob: +$3.00
- Alice: +$3.00

---

### Example 2: Same Rank in Chain (Both Masters)

**Chain:** Alice (Master 60%) → Bob (Master 60%)

**Scenario:** Bob plays poker, pot = $100, rake = $3.00 (3%, Legend tier)

**Distribution:**

1. **Referral Overrides:**
   - Bob (player): **$0.00** (cannot earn from own play)
   - Alice (Bob's direct upline, Level 1): Gets FULL 60% → **$1.80**
   - **Total Referral: $1.80 (60%)**

2. **Global Pool:** $0.15
3. **Jackpot:** $0.15
4. **Developer:** $3.00 - $1.80 - $0.15 - $0.15 = **$0.90 (30%)**

**Team Attribution:**
- Alice: +$3.00 (counted for Global Pool distribution)

---

### Example 3: Same Rank at Level 2+

**Chain:** Alice (Agent 20%) → Bob (Agent 20%) → Charlie (Free 0%)

**Scenario:** Charlie plays poker, pot = $60, rake = $3.00 (5%, Fish tier)

**Distribution:**

1. **Referral Overrides:**
   - Charlie (player): **$0.00** (cannot earn from own play)
   - Bob (Charlie's direct upline, Level 1): Gets FULL 20% → **$0.60**
   - Alice (Bob's upline, Level 2): 20% - 20% = 0% override → **$0.00** (same rank)
   - **Total Referral: $0.60 (20%)**

2. **Global Pool:** $0.15
3. **Jackpot:** $0.15
4. **Developer:** $3.00 - $0.60 - $0.15 - $0.15 = **$2.10 (70%)**

**Team Attribution:**
- Bob: +$3.00
- Alice: +$3.00 (still counted for Global Pool, even though $0 override)

---

### Example 4: No Referrer Chain

**Chain:** None (player signed up directly)

**Scenario:** Player plays poker, pot = $60, rake = $3.00 (5%, Fish tier)

**Distribution:**

1. **Referral Overrides:** $0.00 (no referrer)
2. **Global Pool:** $0.15
3. **Jackpot:** $0.15
4. **Developer:** $3.00 - $0 - $0.15 - $0.15 = **$2.70 (90%)**

---

### Example 5: Deeper Chain with Mixed Ranks

**Chain:** Alice (Master 60%) → Bob (Partner 50%) → Charlie (Broker 35%) → Dave (Agent 20%) → Eve (Free 0%)

**Scenario:** Eve plays poker, pot = $60, rake = $3.00 (5%, Fish tier)

**Distribution:**

1. **Referral Overrides (60% max):**
   - Eve (player): **$0.00** (cannot earn from own play)
   - Dave (Eve's direct upline, Level 1): Gets FULL 20% → **$0.60**
   - Charlie (Dave's upline, Level 2): 35% - 20% = 15% override → **$0.45**
   - Bob (Charlie's upline, Level 3): 50% - 35% = 15% override → **$0.45**
   - Alice (Bob's upline, Level 4): 60% - 50% = 10% override → **$0.30**
   - **Total Referral: $1.80 (60%)**

2. **Global Pool:** $0.15
3. **Jackpot:** $0.15
4. **Developer:** $3.00 - $1.80 - $0.15 - $0.15 = **$0.90 (30%)**

**Team Attribution:**
- Dave: +$3.00
- Charlie: +$3.00
- Bob: +$3.00
- Alice: +$3.00

**Key Takeaway:** Direct upline (Dave) gets full 20%. Everyone above uses override model and only gets the difference between their rank and the rank below them.

---

### Example 6: Weekly Global Pool Distribution

**Setup:**
- 3 Masters exist: Alice, Eve, Frank
- Global Pool balance: $1,000
- Team rake windows:
  - Alice: $15,000 (60%)
  - Eve: $7,500 (30%)
  - Frank: $2,500 (10%)
  - **Total: $25,000**

**Distribution (Monday 00:00 UTC):**
- Alice receives: ($15,000 / $25,000) * $1,000 = **$600**
- Eve receives: ($7,500 / $25,000) * $1,000 = **$300**
- Frank receives: ($2,500 / $25,000) * $1,000 = **$100**

**After Distribution:**
- All Masters' `teamRakeWindow` reset to $0
- Global Pool balance reset to $0
- Start accumulating for next week

---

## 8 — Data Model & Audit Requirements

### Database Schema Changes

#### User Model (Prisma)
```prisma
model User {
  // ... existing fields

  // Referral rank system
  referralRank       String   @default("FREE")  // FREE, AGENT, BROKER, PARTNER, MASTER
  referralRankPercent Float   @default(0)       // 0, 20, 35, 50, 60

  // Team performance tracking
  teamRakeWindow     Float    @default(0)       // Windowed counter for Global Pool (reset weekly)
  teamRakeAllTime    Float    @default(0)       // Lifetime team rake (never reset)

  // Auto-promotion tracking
  directReferralsCount Int    @default(0)       // Cache for quick lookup
  lastRankCheck      DateTime?                  // Last time rank requirements were evaluated
}
```

#### Transaction Model (Existing, expand types)
```prisma
model Transaction {
  // ... existing fields

  type              String   // Add new types:
                             // - RAKE_REFERRER_OVERRIDE (commission from override)
                             // - RAKE_GLOBAL_POOL (weekly Master distribution)

  metadata          Json?    // Store additional context:
                             // {
                             //   level: 1-100 (referral depth)
                             //   recipientRank: "AGENT" | "BROKER" | "PARTNER" | "MASTER"
                             //   sourceHandId: "hand_123"
                             //   overridePercent: 15.5
                             //   teamRakeContribution: 10.00
                             // }
}
```

#### RakeDistribution Model (Existing, update fields)
```prisma
model RakeDistribution {
  // ... existing fields

  // REMOVE (no longer used):
  // - hostShare
  // - hostTier

  // UPDATE:
  referrerShare     Float    // Total override payments (sum of all levels)

  // ADD:
  referralBreakdown Json?    // Detailed per-level breakdown:
                             // [
                             //   { level: 1, userId: "...", rank: "AGENT", percent: 20, amount: 2.00 },
                             //   { level: 2, userId: "...", rank: "BROKER", percent: 15, amount: 1.50 },
                             //   ...
                             // ]
}
```

#### GlobalPoolDistribution (New Model)
```prisma
model GlobalPoolDistribution {
  id                String   @id @default(cuid())
  distributionDate  DateTime @default(now())
  totalAmount       Float    // Total pool distributed
  masterCount       Int      // Number of Masters at distribution time

  // Individual payouts (could be separate relation)
  breakdown         Json     // [{ userId: "...", teamRake: 15000, share: 600 }, ...]

  createdAt         DateTime @default(now())
}
```

### Audit Trail Requirements

Every referral override payment must create a `Transaction` record with:
- `type`: `RAKE_REFERRER_OVERRIDE`
- `amount`: Override payment amount
- `metadata.level`: Referral depth (1 = direct, 2 = level-2, etc.)
- `metadata.recipientRank`: Rank at time of payment
- `metadata.sourceHandId`: Hand identifier
- `metadata.overridePercent`: Calculated override %
- `metadata.teamRakeContribution`: Rake amount added to teamRakeWindow

Every Global Pool distribution must create:
- `GlobalPoolDistribution` record with full breakdown
- Individual `Transaction` records for each Master with type `RAKE_GLOBAL_POOL`

---

## 9 — Implementation Pointers

### File Locations

#### Core Logic
- **`server/src/utils/pokerGameLogic.ts`**
  - `calculateRake()`: VIP-based rake calculation
  - Keep existing VIP logic, no changes needed

#### Referral Override System
- **`server/src/gameManager.ts`** (or new `server/src/referralManager.ts`)
  - `calculateReferralOverrides(rake, playerId)`: Walk referral chain, calculate overrides
  - `processReferralPayments()`: Credit balances, create transactions, increment teamRakeWindow
  - Hook into `handleWinners()` flow after pot distribution

#### Rank System
- **`server/src/rankManager.ts`** (NEW)
  - `checkRankPromotion(userId)`: Evaluate promotion requirements
  - `autoPromoteUser(userId, newRank)`: Update rank, log event
  - `getRankRequirements(currentRank)`: Return next rank criteria
  - Trigger on: hand completion, referral signup, admin action

#### Global Pool
- **`server/src/distributionManager.ts`**
  - `distributeGlobalPool()`: Weekly cron job (Monday 00:00 UTC)
  - Query all Masters, calculate shares by teamRakeWindow
  - Create transactions, reset windows, log distribution
  - `getGlobalPoolStats()`: For home page display

#### Admin Controls
- **`server/src/api/admin/referrals.ts`** (NEW)
  - `POST /admin/rank/set`: Manually set user rank
  - `POST /admin/rank/check`: Force rank evaluation for user
  - `GET /admin/referral/tree/:userId`: View referral chain
  - `GET /admin/referral/stats`: Platform-wide referral metrics

#### Frontend Display
- **`client/src/components/GlobalPoolStats.tsx`** (NEW)
  - Home page widget showing current pool, total distributed, countdown to next distribution

### Constants File
**`server/src/constants.ts`** (or `shared/constants.ts`)

```typescript
export const REFERRAL_RANKS = {
  FREE: { percent: 0, label: 'Free User' },
  AGENT: { percent: 20, label: 'Agent' },
  BROKER: { percent: 35, label: 'Broker' },
  PARTNER: { percent: 50, label: 'Partner' },
  MASTER: { percent: 60, label: 'Master' },
} as const;

export const RANK_REQUIREMENTS = {
  AGENT: {
    directReferrals: 3,
    minHandsEach: 1000,
    minRank: 'FREE',
  },
  BROKER: {
    directReferrals: 3,
    minHandsEach: 0,
    minRank: 'AGENT',
  },
  PARTNER: {
    directReferrals: 3,
    minHandsEach: 0,
    minRank: 'BROKER',
  },
  MASTER: {
    directReferrals: 3,
    minHandsEach: 0,
    minRank: 'PARTNER',
  },
} as const;

export const RAKE_DISTRIBUTION = {
  GLOBAL_POOL_PERCENT: 5,
  JACKPOT_PERCENT: 5,
  MAX_REFERRAL_PERCENT: 60, // When Master in chain
  DEVELOPER_BASE_PERCENT: 30, // Minimum when Master exists
} as const;

export const GLOBAL_POOL_SCHEDULE = {
  frequency: 'weekly',
  dayOfWeek: 1, // Monday
  hour: 0, // 00:00 UTC
} as const;
```

---

## 10 — Edge Cases & Safety Rules

### Referral Chain Safety
- **Max Depth:** 100 levels (defensive guard against infinite loops)
- **Cycle Detection:** If userId appears twice in chain, stop traversal
- **Orphaned Users:** If referrer deleted/suspended, skip and continue up chain

### Rank Demotion
- **Policy:** NO automatic demotion (once achieved, rank is permanent)
- **Rationale:** Avoids user frustration, encourages growth
- **Manual Override:** Admin can manually demote if fraud detected

### Side Pots
- Calculate rake per side pot individually
- Run override logic per pot
- Aggregate all referral payments for the hand

### Rounding & Precision
- Use `safeMoney()` for all calculations (4 decimal places, rounds to cents)
- Apply rounding AFTER each calculation step (not at end)
- Ensure `sum(distributions) <= rake` (never overpay)

### Zero-Balance Protection
- Never allow user balance to go negative from rake distribution
- If calculations result in negative developer share, cap at 0 and log error

### Global Pool Edge Cases
- **No Masters:** If no Masters exist at distribution time, carry pool forward to next week
- **Single Master:** One Master gets 100% of pool
- **Zero TeamRake:** If Master has 0 teamRakeWindow, they get $0 (should not happen if active)

### Fraud Prevention
- **Collusion Detection:** Monitor for suspicious patterns (users only playing with referrals)
- **Minimum Activity:** Consider requiring X hands played before earning commissions
- **Withdrawal Limits:** Standard platform withdrawal rules apply to all earnings

---

## 11 — Admin Controls

### Manual Rank Override

**Use Cases:**
- Early partnerships (before organic promotion possible)
- Strategic affiliate deals
- Promotional campaigns
- Fraud mitigation (demotions)

**API Endpoint:**
```typescript
POST /admin/rank/set
{
  userId: "user_123",
  newRank: "MASTER",
  reason: "Strategic partnership - approved by CEO",
  bypassRequirements: true
}
```

**Logging:**
- Every manual rank change creates audit log entry
- Includes: admin user, timestamp, old rank, new rank, reason

**Restrictions:**
- Only accessible by admin role
- Requires reason field (mandatory)
- Logs are immutable (cannot be deleted)

### Rank Check Tools

**Force Re-Evaluation:**
```typescript
POST /admin/rank/check/:userId
// Returns: current rank, eligible for promotion, requirements status
```

**Bulk Check:**
```typescript
POST /admin/rank/check-all
// Runs promotion check for all users (use sparingly, expensive operation)
```

### Referral Tree Viewer

```typescript
GET /admin/referral/tree/:userId?depth=5
// Returns hierarchical JSON of referral tree with stats
```

**Response Example:**
```json
{
  "user": {
    "id": "user_123",
    "username": "Alice",
    "rank": "MASTER",
    "directReferrals": 15,
    "teamRakeWindow": 15000,
    "teamRakeAllTime": 500000
  },
  "children": [
    {
      "user": { ... },
      "children": [ ... ]
    }
  ]
}
```

### Global Pool Manual Trigger

**Emergency Distribution:**
```typescript
POST /admin/global-pool/distribute
{
  reason: "Manual distribution requested - week ending early"
}
```

**Dry Run:**
```typescript
GET /admin/global-pool/preview
// Shows what would be distributed without actually executing
```

---

## 12 — Testing & Validation

### Unit Tests (Required)

**Test Cases:**
1. ✅ Calculate rake for each VIP level (Fish to Legend)
2. ✅ Override calculation with 3-level chain (Master → Broker → Agent)
3. ✅ Same rank in chain (Agent → Agent → Free) - verify 0% override
4. ✅ No referrer (direct signup) - verify 90% developer share
5. ✅ Side pot rake distribution
6. ✅ teamRakeWindow increment for all ancestors
7. ✅ Global Pool distribution with 3 Masters (different team rake)
8. ✅ Rank promotion: Agent requirements (3 directs, 1000 hands each)
9. ✅ Rank promotion: Broker requirements (3 Agent directs)
10. ✅ Rounding precision (safeMoney) - ensure no overpayment
11. ✅ Max depth safety (100 levels)
12. ✅ Cycle detection (user appears twice in chain)

### Integration Tests

**Scenarios:**
1. **Full Hand Flow:**
   - Create 4 users (Master → Broker → Agent → Free)
   - Play hand with Free user
   - Verify all overrides paid correctly
   - Verify teamRakeWindow incremented
   - Verify developer share correct

2. **Rank Promotion Flow:**
   - Create Agent with 2 directs at 999 hands each, 1 direct at 1000 hands
   - Verify NOT promoted yet
   - Play hand with 3rd direct to reach 1000
   - Verify auto-promotion to Agent

3. **Weekly Distribution Flow:**
   - Accumulate rake over simulated week
   - Trigger distribution
   - Verify Masters paid correctly
   - Verify teamRakeWindow reset
   - Verify pool balance reset

### Manual Test Script

```bash
# 1. Create test users
POST /auth/signup { username: "alice", ... }
POST /auth/signup { username: "bob", referredBy: "alice" }
POST /auth/signup { username: "charlie", referredBy: "bob" }

# 2. Set ranks manually (for quick testing)
POST /admin/rank/set { userId: "alice", newRank: "MASTER" }
POST /admin/rank/set { userId: "bob", newRank: "BROKER" }
POST /admin/rank/set { userId: "charlie", newRank: "AGENT" }

# 3. Play hands (via game flow)
# ... (simulate poker hands with charlie)

# 4. Check balances
GET /api/user/alice/balance
GET /api/user/bob/balance
GET /api/user/charlie/balance

# 5. Check Global Pool
GET /admin/global-pool/preview

# 6. Trigger distribution
POST /admin/global-pool/distribute
```

---

## 13 — Migration Plan

### Phase 1: Database Schema (Week 1)
- [ ] Create Prisma migration for User model changes
- [ ] Add referralRank, referralRankPercent, teamRakeWindow fields
- [ ] Create GlobalPoolDistribution model
- [ ] Expand Transaction metadata field
- [ ] Run migration on dev/staging

### Phase 2: Core Logic (Week 2)
- [ ] Implement `calculateReferralOverrides()` in gameManager
- [ ] Implement override payment flow (credit balances, create transactions)
- [ ] Implement teamRakeWindow increment logic
- [ ] Remove old hostShare logic from RakeDistribution
- [ ] Update constants.ts with new rank/distribution values

### Phase 3: Rank System (Week 3)
- [ ] Create rankManager.ts
- [ ] Implement auto-promotion logic
- [ ] Add rank check triggers (hand completion, referral events)
- [ ] Create admin API endpoints for manual rank control
- [ ] Add rank display to user profile/dashboard

### Phase 4: Global Pool (Week 4)
- [ ] Implement weekly distribution in distributionManager
- [ ] Set up cron job (Monday 00:00 UTC)
- [ ] Create home page widget (GlobalPoolStats.tsx)
- [ ] Add Master dashboard showing team rake + pool share
- [ ] Test distribution flow end-to-end

### Phase 5: Testing & Rollout (Week 5)
- [ ] Write unit tests (12 test cases above)
- [ ] Write integration tests (3 scenarios above)
- [ ] Manual QA with test users
- [ ] Deploy to staging, run for 1 week
- [ ] Fix bugs, adjust if needed
- [ ] Deploy to production

### Phase 6: Monitoring & Optimization (Ongoing)
- [ ] Set up alerts for distribution failures
- [ ] Monitor for suspicious patterns (collusion)
- [ ] Track key metrics (avg override %, Master count, pool growth)
- [ ] Gather user feedback on rank system
- [ ] Iterate on requirements if needed

---

## 14 — Key Metrics to Track

### Platform Health
- **Total Rake Collected** (daily/weekly/monthly)
- **Distribution Breakdown** (referrals vs jackpot vs global pool vs developer)
- **Developer Share %** (should average ~30-50% depending on rank distribution)

### Referral System
- **Users by Rank** (Free / Agent / Broker / Partner / Master counts)
- **Avg Referral Depth** (how deep chains go)
- **Total Override Payouts** (weekly/monthly)
- **Top Earners** (leaderboard)

### Global Pool
- **Pool Growth Rate** ($ per day)
- **Distribution Amounts** (weekly totals)
- **Master Count Trend** (are more users reaching Master?)
- **Team Rake Distribution** (is it concentrated or spread?)

### User Engagement
- **Promotion Velocity** (avg time to reach each rank)
- **Referral Activity** (signups per user)
- **Retention by Rank** (do ranked users play more?)

---

## 15 — FAQ

### Q: Can a user earn from multiple sources in one hand?
**A:** Yes, if a Master plays poker themselves, they earn:
- Their direct rake override (if they're in someone's chain)
- Their share of the Global Pool (distributed weekly)

### Q: What if a user's referrer is deleted/banned?
**A:** The chain skips the deleted user and continues upward. Team attribution and overrides flow to the next valid ancestor.

### Q: Can a user have multiple referrers?
**A:** No, each user has ONE direct referrer (set on signup, immutable).

### Q: How do I become Master rank quickly?
**A:** Invite 3 users who each build strong teams. Help them reach Partner rank by coaching/supporting their growth.

### Q: What happens if Global Pool has $0 on distribution day?
**A:** No distribution occurs, system waits until next week. Masters' teamRakeWindow continues accumulating.

### Q: Can I change my referrer after signup?
**A:** No, referral relationships are permanent (prevents gaming the system).

### Q: Do I earn commissions from my own poker play?
**A:** No, you cannot earn from your own play. You earn $0 when you play. You only earn commissions when your downline plays poker.

### Q: What's the difference between direct upline (Level 1) and indirect uplines (Level 2+)?
**A:** Your **direct upline** (the person who referred you) gets their **FULL rank %** when you play. For example, if they're a Master (60%), they get the full 60%. Everyone above them (indirect uplines) uses the **override model** and only gets the difference between their rank and the highest rank below them.

### Q: If I'm Master and my direct referral is also Master, what do I earn when they play?
**A:** You earn the **full 60%** because you're their direct upline (Level 1). Direct uplines always get their full rank percentage, regardless of the player's rank.

### Q: What if I refer a user who becomes Master before me?
**A:** You still earn overrides on their activity (based on your rank). But they'll likely out-earn you from their own team's growth.

---

## 16 — Final Approval & Changelog

### Approval Status
✅ **APPROVED** by CEO on December 12, 2025

### Key Decisions Confirmed
- ✅ Hybrid Override model (insurance-style commissions)
- ✅ 5-tier rank system (Free → Agent → Broker → Partner → Master)
- ✅ 60% max referral, 5% Global Pool, 5% Jackpot, 30% Developer
- ✅ Weekly Global Pool distribution (Monday 00:00 UTC)
- ✅ Auto-promotion enabled
- ✅ Each referral must have 1,000 hands individually (not cumulative)
- ✅ Home page display for Global Pool stats
- ✅ Remove all host-based commission logic
- ✅ Admin can manually override ranks at any time

### Changelog
- **v1.1** (Dec 12, 2025): Updated to Hybrid Override Model - Direct upline (Level 1) gets FULL rank %, indirect uplines (Level 2+) use override difference. Players cannot earn from own play.
- **v1.0** (Dec 12, 2025): Initial Override specification approved
- **v0.x** (Previous): Waterfall referral model (deprecated)

---

## 17 — Summary Checklist

Before implementing, ensure you understand:

- [ ] Rake calculation by VIP level (5% → 3%, capped per hand)
- [ ] **Hybrid Override Model:** Players earn $0 from own play, direct upline gets FULL rank %, indirect uplines get override difference
- [ ] Direct upline (Level 1) always gets their full rank % (e.g., Master gets full 60%)
- [ ] Indirect uplines (Level 2+) get override: their % minus highest % below them
- [ ] Rank auto-promotion requirements (3 directs at specific rank/hands)
- [ ] Global Pool accumulation (5% per hand) and distribution (weekly, by teamRakeWindow)
- [ ] TeamRakeWindow vs TeamRakeAllTime (window resets weekly, allTime never resets)
- [ ] Developer gets remainder (30% minimum when Master exists, up to 90% with no referrers)
- [ ] Admin can override ranks manually (for partnerships/promotions)
- [ ] No host fees, no separate commission schemes - 100% referral-based

---

**This guide is the single source of truth. All code, tests, and documentation must align with this specification.**

If you need clarification or want to propose changes, update this document first, then implement.

🎰 **Happy Building!**
