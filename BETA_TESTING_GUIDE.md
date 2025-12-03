# 🧪 SOLPOKER X - Beta Testing Guide

## 📋 Setup Instructions

### Prerequisites
- ✅ Node.js 18+ installed
- ✅ Wallet (Phantom, Solflare, or WalletConnect)
- ✅ Solana Devnet account with SOL

### Quick Start (2 Terminals)

#### Terminal 1: Backend Server
```bash
cd server
npm install
npm run db:setup    # One-time: setup database
npm run db:seed     # One-time: populate test data
npm run dev         # Starts on http://localhost:3001
```

#### Terminal 2: Frontend
```bash
npm install
npm run dev         # Starts on http://localhost:3000 (or next available port)
```

---

## 🎮 Beta Testing Checklist

### Phase 1: Connection & Authentication (5 mins)
- [ ] Open frontend at http://localhost:3000 (or 3001/3002 if ports in use)
- [ ] See "Connect Wallet" button in navbar
- [ ] Click "Connect Wallet" → Select Phantom/Solflare
- [ ] Approve connection in wallet
- [ ] ✅ Verify wallet address shows in navbar
- [ ] ✅ Check network indicator shows "Devnet Live (1 SOL = 100k USDT)"

**Expected:** Wallet connects and your Devnet SOL balance converts to game chips (1 SOL = 100,000 USDT)

---

### Phase 2: Navigation & UI (5 mins)
- [ ] Navigate to **Home** → See available games and tournaments
- [ ] Navigate to **Lobby** → See list of active tables
- [ ] Navigate to **Leaderboard** → See top players (should see seeded players)
- [ ] Navigate to **Profile** → See your player stats
- [ ] Check footer links work (Terms, Privacy, Rules, FAQ, etc.)

**Expected:** All pages load without errors, responsive on mobile

---

### Phase 3: Game Creation (10 mins)

#### Test Case 1: Create Cash Game
1. Click **"Create Game"** button
2. Select **"Cash Game"** type
3. Fill in:
   - Table Name: "Test Table"
   - Seats: 6
   - Small Blind: 1 USDT
   - Big Blind: 2 USDT
   - Min Buy-in: 50 USDT
   - Max Buy-in: 1000 USDT
4. Click **"Create Table"**

**Expected:** 
- ✅ Game created and visible in Lobby
- ✅ Table appears in available games list
- ✅ Table shows correct blind levels and seat count

#### Test Case 2: Create Tournament
1. Click **"Create Game"** → Select **"Tournament"**
2. Fill in tournament details:
   - Buy-in: 10 USDT
   - Max Players: 8
   - Speed: Regular
3. Click **"Create"**

**Expected:**
- ✅ Tournament created
- ✅ Shows in tournament list with correct status

---

### Phase 4: Joining & Sitting Down (15 mins)

#### Test Case 3: Join Table as Spectator
1. From Lobby, click **"View"** on any active table
2. ✅ Verify you can see the table without buying in
3. ✅ See player positions, community cards area
4. ✅ See chat box at bottom

**Expected:** Table loads, you see game state but can't act

#### Test Case 4: Buy In & Sit Down
1. Click **"Buy In"** button
2. Enter amount: **100 USDT**
3. Select a seat (e.g., Seat 1)
4. Click **"Sit Down"**

**Expected:**
- ✅ Modal closes
- ✅ Your player appears on the table at chosen seat
- ✅ Your balance decreases by 100 (visible in navbar or profile)
- ✅ Database transaction recorded (can check in `/admin`)

---

### Phase 5: Game Play Testing (20 mins)

#### Test Case 5: Pre-Flop Action
1. Wait for hand to start (dealer button rotates)
2. When it's your turn:
   - [ ] **Fold** action available
   - [ ] **Check** action (if not forced bet)
   - [ ] **Raise** action with slider
   - [ ] **Call** action shows correct amount
3. Try each action at least once

**Expected:**
- ✅ Your action updates game state
- ✅ Pot updates correctly
- ✅ Turn passes to next player
- ✅ Chat shows your action: "Player folded", "Player called 2"

#### Test Case 6: Street Progression
1. Call/check through pre-flop
2. ✅ Verify **Flop** shows 3 community cards
3. ✅ Continue actions
4. ✅ Verify **Turn** shows 4th card
5. ✅ Verify **River** shows 5th card

**Expected:** Cards reveal correctly, betting rounds proceed smoothly

#### Test Case 7: Showdown & Hand Resolution
1. Continue to end of hand (showdown)
2. ✅ Verify winning hand is evaluated
3. ✅ See winner announcement in chat
4. ✅ See pot awarded to winner
5. ✅ Check balance updates (winner's balance increased)

**Expected:**
- ✅ Hand winner determined correctly
- ✅ Pot split properly if tie
- ✅ Database updated with win/loss
- ✅ New hand deals automatically after 5 sec delay

---

### Phase 6: Multi-Table Testing (10 mins)

#### Test Case 8: Join Multiple Tables
1. Open second browser tab/window
2. Connect same wallet (or different for multi-player test)
3. Join same table in second tab
4. ✅ See both players on table in both views
5. ✅ Actions sync in real-time across tabs

**Expected:**
- ✅ Multiple concurrent tables work
- ✅ Real-time synchronization via Socket.io
- ✅ No cross-table interference

---

### Phase 7: User Profile & Statistics (5 mins)

#### Test Case 9: Profile Updates
1. Click on your profile
2. ✅ Verify stats show:
   - Total Hands Played
   - Total Winnings
   - Current Balance
   - VIP Rank (if applicable)
3. Play another hand
4. ✅ Verify stats update after hand ends

**Expected:**
- ✅ Stats accurate after gameplay
- ✅ Balance reflects buy-ins and winnings
- ✅ Profile updates in real-time

---

### Phase 8: Wallet & Balance Management (10 mins)

#### Test Case 10: Balance Updates
1. Note current balance in navbar
2. Buy into a game for 50 USDT
3. ✅ Balance decreases by 50
4. Win a hand or cash out
5. ✅ Balance increases correctly

**Expected:**
- ✅ All transactions reflected immediately
- ✅ No balance discrepancies
- ✅ Database shows correct transaction history

#### Test Case 11: Insufficient Funds
1. Try to buy in for more than your balance
2. ✅ See error message: "Insufficient funds"
3. ✅ Transaction rejected

**Expected:** Proper validation prevents over-betting

---

### Phase 9: Chat Functionality (5 mins)

#### Test Case 12: Table Chat
1. While in game, type message in chat box
2. ✅ Message appears with your username and timestamp
3. ✅ Message visible to other players
4. Try another player's machine if available

**Expected:**
- ✅ Chat messages broadcast to table
- ✅ No message loss or duplicates
- ✅ Timestamps accurate

---

### Phase 10: Error Handling (10 mins)

#### Test Case 13: Network Disruption
1. During active game, disconnect internet
2. ✅ See loading state or disconnect message
3. Reconnect
4. ✅ Game state recovers (reconnection logic)

**Expected:**
- ✅ Graceful error messages
- ✅ Auto-reconnect attempts
- ✅ No data loss

#### Test Case 14: Edge Cases
- [ ] Try to join full table (6/6 seats) → Error shown
- [ ] Try negative bet amount → Rejected
- [ ] Try to act out of turn → Ignored
- [ ] Disconnect mid-hand → Stack returned, status shows "sitting-out"

**Expected:** All edge cases handled gracefully

---

## 🐛 Bug Report Template

When you find issues, please document:

```
### Bug: [A clear, concise title of the issue]
**Severity:** Critical | High | Medium | Low

**Steps to Reproduce:**
1. ...
2. ...
3. ...

**Expected Behavior:**
...

**Actual Behavior:**
...

**Screenshots:** (if applicable)
...

**Device:** Desktop | Mobile | Tablet
**Browser:** Chrome | Firefox | Safari
**Network:** Devnet
```

---

## 📊 Testing Coverage Checklist

> Mark with an 'X' as you complete each section.

| Feature Area | Status | Notes |
|---|---|---|
| **Connection & UI** | | |
| Wallet Connection | [ ] | |
| Navigation & UI | [ ] | |
| **Gameplay** | | |
| Game Creation (Cash & Tourney) | [ ] | |
| Joining & Seating | [ ] | |
| Core Game Actions (Bet, Fold, etc.) | [ ] | |
| Hand Progression & Showdown | [ ] | |
| **Features & Data** | | |
| Multi-Table Sync | [ ] | |
| Profile & Stat Updates | [ ] | |
| Balance Management | [<] | |
| Chat Functionality | [ ] | |
| **Robustness** | | |
| Error Handling & Edge Cases | [ ] | |
| Mobile Responsiveness | [ ] | |


## 🔍 Performance Testing (Optional)

### Load Testing
- [ ] Join table with 6 players
- [ ] Monitor network tab for message frequency
- [ ] Check CPU/memory usage
- [ ] Expected: <100ms latency between actions

### Stress Testing
- [ ] Open 3+ concurrent games
- [ ] Rapid betting actions
- [ ] Monitor for crashes or memory leaks

---

## 📝 Admin Tools

### Access Admin Panel
1. Connect as wallet admin (if configured)
2. Navigate to `/admin`
3. View:
   - Active tables and tournaments
   - Player sessions
   - Transaction history
   - System stats

---

## ✅ Sign-Off

When complete, verify:
- ✅ All critical tests passed
- ✅ No critical bugs found
- ✅ All balances accurate
- ✅ Real-time sync working

**Beta Test Status:** Ready / Needs Fixes / Critical Issues

---

## 📞 Support Contacts

If you encounter issues, please follow these steps before reporting:
1. Check the browser's developer console for errors (`F12` or `Cmd+Option+I` → Console tab).
2. Check the backend server terminal for any error logs.
3. Review the `/faq` page for answers to common questions.
4. If the issue persists, file a bug report using the template above.


**Happy Testing! 🎮**
