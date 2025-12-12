 # 🎰 Rake Distribution Guide — Combined & Concise

 This document consolidates the full rake distribution specification, implementation notes, examples, and testing instructions so you can show AI or teammates how the system works.

 ## 1 — Concise Summary

 - Base Rake: 3–5% of pot depending on VIP level (capped per-hand).
 - VIP Levels (rake / cap):
   - Fish (0): 5% / $5
  ---

  # 🎯 Rake Distribution — One‑Page Final Logic (AI‑ready)

  Purpose: single‑page specification of how rake is calculated and distributed. Contains the final, confirmed rules you approved (waterfall referral logic, partner weighting by rake, audit fields, and safety guards).

  1) Base Rake (per hand)
  - Rake rates depend on VIP level (by `totalHands`): Fish 0 / Grinder 1k / Shark 5k / High Roller 20k / Legend 100k.
  - Rake percents: [5%, 4.5%, 4%, 3.5%, 3%], each level has a per‑hand cap (see code `VIP_LEVELS`).

  2) Protocol split (applies to the computed total rake)
  - Host share: hostTier% (30% → 40%)
  - Referrer payouts: waterfall / difference method (see section 4)
  - Jackpot: 5% (accumulates to monthly jackpot)
  - Global Partner Pool: 5% (accumulates and distributes by teamRake)
  - Developer: remainder = rake − (host + referrals + jackpot + globalPool)

  3) Global Partner Pool weighting
  - Use `teamRakeWindow` (recommended): for every hand, increment `teamRakeWindow` by the rake amount for each ancestor in the referral chain.
  - When pool balance >= threshold (e.g., $100) distribute proportionally by `teamRakeWindow` and reset `teamRakeWindow` to 0 for each partner.

  4) Waterfall referral logic (confirmed)
  - Direct referrer receives their full rank percent (e.g., Agent 10%, Broker 15%, Partner 20%).
  - For uplines, pay only the difference between their rank percent and the highest percent already paid below them.
  - Walk the referral chain upward (unlimited) until no further difference to pay or chain ends. Defensive guard: `maxDepth = 100` to avoid cycles.
  - If every rank in the chain is 0% → no referral payments; developer keeps remainder.

  Algorithm (per hand):
  1. Compute `rake` (apply VIP rate + cap). For side pots, compute per side pot.
  2. Compute hostShare, jackpotShare (5%), globalPoolShare (5%).
  3. Build referrer chain starting at direct referrer. Set `highestPaid = 0`.
  4. For each referrer in chain:
     - `payPercent = max(0, referrerPercent − highestPaid)`
     - `payAmount = (payPercent / 100) * rake`
     - credit `payAmount` to referrer, log transaction with `level` and `recipientRank`
     - `highestPaid = max(highestPaid, referrerPercent)`
  5. `developerShare = rake − (hostShare + jackpotShare + globalPoolShare + sum(referrerPayments))` (clamped ≥ 0)

  5) Data model & audit (minimum requirements)
  - Add to `User` (Prisma): `teamRakeWindow Float @default(0)` (windowed counter reset after each Global Pool distribution).
  - Record every level payment as a `transaction` with metadata:
    - `type`: `RAKE_REFERRER` or `RAKE_REFERRER_OVERRIDE`
    - `level`: integer (1 = direct)
    - `recipientRank`: referrer's rank at payment time
    - `sourceHandId`: hand identifier
    - `amount`, `createdAt`
  - Keep `RakeDistribution.referrerShare` as aggregate; per-level `transaction` rows provide the audit trail.

  6) Edge cases & defensive rules
  - Side pots: compute rake per side pot separately and run the waterfall per pot/winner.
  - Rounding: use `safeMoney()` (4 decimal places) consistently across all calculations.
  - Max chain depth: `maxDepth = 100`.
  - Fraud mitigations (optional): only count teamRakeWindow from accounts with >= X hands, delayed vesting, or min payout thresholds.

  7) Examples (short)
  - Bob direct referrer = 15%, Alice upline = 20% ⇒ Bob 15%, Alice (20−15)=5% ⇒ total 20%.
  - Direct referrer Alice = 20% ⇒ Alice gets full 20% (no uplines paid).
  - No ranks in chain ⇒ no referral payouts; developer keeps remainder.

  8) Implementation pointers (where code lives)
  - `server/src/utils/pokerGameLogic.ts` — `calculateRake`, VIP caps.
  - `server/src/gameManager.ts` — per‑hand flow: compute rake, run waterfall, credit balances, increment `teamRakeWindow`.
  - `server/src/distributionManager.ts` — `distributeGlobalPool()` should use `teamRakeWindow` and reset it after distribution.
  - `constants.ts` — VIP/Host/Referral tiers and percents.

  9) Next steps (recommended)
  - Apply a small Prisma migration to add `teamRakeWindow`.
  - Implement waterfall logic and per‑level `transaction` logging in `gameManager.handleWinners()`.
  - Update `distributionManager.distributeGlobalPool()` to use `teamRakeWindow` and reset windows after distribution.
  - Add unit tests for: Alice/Bob/Agent waterfall flows, side‑pot rake distribution, and global pool distribution reconciliations.

  ---

  This single page is intended to be shown to AI or team members as the authoritative, final specification for rake and referral distribution. If you approve, I will prepare the Prisma migration and the code patch implementing these rules.


 - Use `distributionManager.manualDistributeGlobalPool()` and `manualDistributeJackpot()` for testing.
 - To simulate a hand and inspect `RakeDistribution` and user balances, run the server in dev and execute a controlled hand via the GameManager (or write a small script that invokes `PokerEngine` + `gameManager.handleWinners()` flow).

 ## 9 — Recommendations & Next Steps

 - If you want multi-level referral overrides (as in your example), decide on:
   - Override percentages per level (e.g., level-2 = 5%, level-3 = 5%) and funding source (developer remainder or capped referral pool).
   - Audit schema changes (add `referralPayments` table / expand `RakeDistribution` to capture multi-level breakdown).
 - Consider tracking per-user `teamRakeGenerated` so Global Partner Pool distributions are proportional to actual team rake (not `totalWinnings`).
 - Add a `postinstall` script to `server/package.json` to ensure `npx prisma generate` runs on deployment.

## Final Decisions — Confirmed

The following choices are now finalized and should be implemented exactly as written below. These reflect your requirements and the recommended safe defaults.

- Waterfall referral payouts: use the waterfall/difference method so the total referral payout for any hand never exceeds the highest upline percent (max 20%). Direct referrers receive their full rank percent; uplines receive only the difference to the next higher rank.
- Attribution to uplines: attribute rake to every ancestor in the referral chain (each ancestor's `teamRakeWindow` is incremented by the rake amount for that hand). This ensures Partners are credited for their entire subtree's rake.
- Global Partner Pool metric: use `teamRakeWindow` (windowed counter) to accumulate team rake between distributions. Reset the window counter for each partner after a Global Pool distribution to give deterministic, auditable windows.
- Rounding & money precision: use the existing `safeMoney()` behavior (4 decimal rounding/truncation to cents as used elsewhere) for all rake and payout calculations to ensure consistent accounting.
- Chain depth / safety guard: allow unlimited chain traversal in normal operation but enforce a defensive safety guard of `maxDepth = 100` to avoid infinite loops in case of corrupted or cyclic referral data.
- Developer fallback: if the entire referral chain contains no ranks (all 0%), no referral payments are made and developer remainder remains unchanged.

These decisions will be used to update the implementation and the database schema (add `teamRakeWindow` to the `User` model) once you approve applying code changes.

 ---

 This combined guide should be a single reference you can show to AI or teammates. Tell me if you want me to:
 - Add the multi-level override implementation (I can implement and test), or
 - Add a one-page investor/ops summary, or
 - Create a small simulation script that demonstrates the Alice/Bob/Agent scenario with sample numbers.
