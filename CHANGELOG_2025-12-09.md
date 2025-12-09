# Changelog - December 9, 2025

## Overview
Major updates to Profile page, Admin panel, and Fairness Verification system.

---

## 🎯 Profile Page Enhancements

### Overview Stats - Real Data Integration
- Connected Profile Overview stats to database instead of mock data
- Added `/api/user/:id/stats?timeframe=` endpoint supporting: `1W`, `1M`, `3M`, `YTD`, `ALL`
- Stats now show real: Total Winnings, Win Rate, Hands Played, Best Hand
- Fixed "ALL" timeframe showing fake stats - now shows zeros when no data

### Transaction & Game History
- Added `/api/user/:id/history` endpoint returning wallet transactions and game sessions
- Profile History tab now displays real transaction records from database
- Game Sessions display actual played games with results

### Profile Photo & Cover Image
- Added `coverUrl` field to Prisma User schema
- Profile photos and cover images now save to database as base64
- Added `PUT /api/user/:id/profile` endpoint for saving profile changes
- Fixed photo upload - changed from blob URLs to base64 encoding (max 2MB)
- Added image type validation (jpeg, png, gif, webp)

### Photo Position Adjustment
- Added drag-to-reposition for cover photos (`coverPosition` state)
- Added drag-to-reposition for avatar photos (`avatarPosition` state)
- Cover repositions vertically, avatar repositions both X and Y

### Hand Analysis Section
- Updated to show real playing statistics from API
- Displays VPIP, PFR, Aggression Factor, 3-Bet %, bestHand
- Shows "No data" gracefully when player has no game history

---

## 🔒 Fairness Verification System

### Fixed Core Issues
- **Fixed fairness data saving** - Changed from `previousServerSeed` to `currentServerSeed` in `gameManager.ts`
- **Fixed client-side deck generation** - Rewrote `fairnessVerificationClient.ts` to match server's exact HMAC algorithm:
  - Same HMAC key (serverSeed as hex bytes)
  - Same message format (`clientSeed:nonce:counter`)
  - Same byte stream generation
  - Same 64-bit integer calculation for Fisher-Yates shuffle

### New API Endpoints
- `POST /api/fairness/test-hand` - Creates a test hand for verification demo
- `GET /api/proof/:tableId/hands` - Lists all hands for a table
- Enhanced `GET /api/proof/:tableId/hand/:handNumber` with full fairness data

### UI Improvements
- Added "🧪 Create Test Hand" button for easy testing
- Added verification log display showing step-by-step checks
- Added reproduced deck sample display (first 10 cards)
- Better error handling and user feedback
- Test hand auto-fills table ID and hand number

---

## 📁 Files Modified

### Frontend
- `pages/Profile.tsx` - Stats fetching, photo upload, position adjustment
- `pages/FairnessVerification.tsx` - Test hand button, improved results display
- `utils/fairnessVerificationClient.ts` - Fixed HMAC algorithm to match server
- `types.ts` - Added `coverUrl` to User interface

### Backend
- `server/src/server.ts` - New API endpoints for stats, history, profile update, fairness testing
- `server/src/gameManager.ts` - Fixed fairness data saving (current vs previous)
- `server/prisma/schema.prisma` - Added `coverUrl` field to User model

---

## 🔧 Technical Notes

### Provably Fair Algorithm
The deck shuffle uses HMAC-SHA256 with:
1. Server seed (32-byte hex) as HMAC key
2. Message: `{clientSeed}:{nonce}:{counter}` for byte stream
3. 8 bytes per shuffle index (64-bit unsigned integers)
4. Fisher-Yates shuffle algorithm

### Database Changes
Run to apply schema changes:
```bash
cd server
npx prisma generate
npx prisma db push
```

---

## ✅ Testing Checklist

- [x] Profile Overview shows real stats for all timeframes
- [x] Profile History shows real transactions
- [x] Profile photos upload and save to database
- [x] Cover/Avatar position adjustment works
- [x] Hand Analysis shows real or "No data"
- [x] Fairness test hand creation works
- [x] Fairness verification passes all checks
- [x] Export proof functionality works
