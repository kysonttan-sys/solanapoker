# SOLPOKER X - AI Agent Guidelines

## Architecture Overview

**SOLPOKER X** is a decentralized poker platform on Solana with a **monorepo structure** comprising:
- **Frontend**: React 19 + Vite (TypeScript) at `port 3000`
- **Backend**: Express + Socket.io (Node.js) at `port 4000`
- **Database**: SQLite via Prisma ORM (stored in `server/prisma/dev.db`)
- **Wallet Integration**: Solana wallet adapters (Phantom, Solflare, WalletConnect) on **Devnet only**

### Critical Data Flow
1. **Wallet Connection**: Users authenticate via `WalletContextProvider.tsx` (Phantom/Solflare/WalletConnect on Devnet)
2. **Game State**: Real-time synced via Socket.io events (`gameStateUpdate`, `balanceUpdate`)
3. **Database Sync**: User balance and transactions persisted to Prisma after each action
4. **Provably Fair**: Deck generation uses server seed + client seed + nonce (HMAC-SHA256) in `utils/fairness.ts`

## Development Workflows

### Initial Setup
```bash
# Terminal 1: Backend
npm run server:install
npm run server:start          # Runs ts-node-dev on port 4000

# Terminal 2: Frontend  
npm install
npm run dev                   # Runs Vite on port 3000
```

### Database Operations
```bash
npm run db:setup              # Push schema changes
npm run db:seed              # Populate test data
```

### Common Development Tasks
- **Component edits**: Auto-reloaded via Vite HMR
- **Backend logic changes**: Auto-restarted via ts-node-dev (respawn mode)
- **Schema changes**: Edit `server/prisma/schema.prisma` then `npm run db:setup`

## Key Project Patterns

### Socket.io Communication
Located in `server/src/gameManager.ts`. Events use **table-scoped rooms** with broadcast pattern:
- **Client → Server**: `socket.emit('joinTable', { tableId, user, config })`, `socket.emit('sitDown', ...)`, `socket.emit('playerAction', ...)`
- **Server → All players**: `this.io.to(tableId).emit('gameStateUpdate', gameState)`
- **Individual responses**: `socket.emit('error', { message })` or `socket.emit('balanceUpdate', balance)`
- **Spectator mode**: Unauthenticated players can observe with `user.id === 'spectator'`

**Critical**: Always broadcast state after mutations. GameRoom listens to `socket.on('gameStateUpdate')` to maintain client sync. After DB transactions (wins/losses), emit `balanceUpdate` immediately.

### Game State Management (`utils/pokerGameLogic.ts` + `server/src/utils/pokerGameLogic.ts`)
- `PokerEngine` class provides **pure functions**: `initializeGame()`, `playerAction()`, `evaluateWinner()`, `updatePlayerSocket()`
- Shared `GameState` interface defines phase (`pre-flop|flop|turn|river|showdown`), pot, players array, dealer position, nonce
- **Duplicated logic**: Client-side logic in `utils/` for UI optimism/rendering; server-side in `server/src/utils/` as source of truth (single canonical version)
- Hand evaluation via `evaluateHand()` from `handEvaluator.ts` (using standard 5-card poker hand rankings)
- **Immutable pattern**: All mutations return new `GameState` object; never mutate in-place

### User/Balance Flow
1. **First join**: `db.user.findUnique()` or auto-create with 10,000 welcome bonus in `gameManager.handleJoin()`
2. **Sit down**: Deduct buy-in via `db.transaction()` → validate sufficient balance → deduct → store stack in `PlayerState.balance` (game state)
3. **Win hand**: Update `db.user.balance` (+ or -), create `Transaction` record for audit trail
4. **Emit**: Send `balanceUpdate` event to player immediately after DB commit
5. **Reconnection**: `updatePlayerSocket()` preserves player state; spectators see current game state

### Fairness System
- **Server seed**: Generated server-side (hidden until hand ends)
- **Client seed**: Generated client-side in GameRoom component (`generateSeed()`)
- **Nonce**: Increments per hand
- **Deck generation**: `generateProvablyFairDeck(serverSeed, clientSeed, nonce)` produces deterministic shuffle
- See `utils/fairness.ts` for SHA-256/HMAC implementation

## File Organization

### Frontend (`/`)
- **`pages/`**: Page-level components (GameRoom, Lobby, Leaderboard, Profile, Admin, etc.)
- **`components/poker/`**: Core UI: Table, Seat, Card, GameControls
- **`components/ui/`**: Reusable UI: Button, Modal, CaptchaModal
- **`components/`**: Global modals (BuyInModal, CreateGameModal, ConnectWalletModal, FairnessModal)
- **`utils/`**: Game logic (pokerGameLogic, handEvaluator, fairness), wallet integration (solanaContract)
- **`hooks/useSocket.ts`**: Socket.io client hook connecting to `http://localhost:4000`

### Backend (`/server/src/`)
- **`gameManager.ts`**: Socket event handlers + table lifecycle (joins, sits, actions, broadcasts, reconnection logic)
- **`utils/pokerGameLogic.ts`**: PokerEngine class (game phase transitions, hand evaluation, all game mutations)
- **`utils/fairness.ts`**: Server seed generation + HMAC-SHA256 hashing for deck reproducibility
- **`db.ts`**: Prisma client initialization + type-safe queries
- **`server.ts`**: Express app + Socket.io setup + REST endpoints (`/api/stats`, `/api/leaderboard`, `/api/tables`)
- **`seed.ts`**: Database seeding for test data

## Type System

### Shared Types (`types.ts`)
- **`User`**: Wallet-based identity (id = walletAddress) with balance, preferences, referral/host ranks, ecosystem stats (staking, referrals)
- **`PokerTable`**: Configured table instance (blind sizes, seat count, buy-in range, gameMode: 'cash|tournament|fun')
- **`GameState`** (frontend) vs backend: Same core interface (defined in both `utils/pokerGameLogic.ts`), must stay synchronized
- **`PlayerState`**: Position-based seat info (cards hidden for non-acting players), currentBet, totalBet, status, handResult (after showdown)

### Backend-Specific (`server/src/utils/pokerGameLogic.ts`)
- **`FairnessState`**: Server seed (hidden until hand ends), currentServerHash, clientSeed, nonce (increments per hand), previousSeed tracking
- **Pure functions pattern**: All mutations return new `GameState`; never modify in-place (functional style)

## Common Pitfalls & Solutions

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Stale game state on client | Client not listening to broadcasts or handler unmounts | Ensure `socket.on('gameStateUpdate', setGameState)` in GameRoom with proper cleanup on unmount |
| Balance discrepancies | Client balance not synced after server transaction | Always emit `balanceUpdate` after `db.user.balance` update + commit transaction atomically |
| Deck reproducibility fails | Nonce not incrementing or seed not persisted between hands | Verify `FairnessState.nonce` increments, seeds stored in GameState before each shuffle |
| Phantom wallet not detecting | App not using Devnet RPC | Verify `WalletAdapterNetwork.Devnet` + `clusterApiUrl(network)` in WalletContextProvider |
| Port conflicts | Multiple npm/vite/Express processes running on 3000 or 4000 | Windows: `netstat -ano \| findstr :4000` or `netstat -ano \| findstr :3000`; kill process and restart |
| Player stuck in all-in | Game logic not handling all-in → side pot → showdown flow | Verify `playerAction()` transitions phase correctly when all players all-in or folded |

## Testing Patterns

- **Socket.io mocking**: Use `socket-io-client` in tests; mock GameManager for unit tests
- **Game logic**: Test `PokerEngine` functions in isolation (pure functions)
- **Fairness**: Verify deck determinism: same (serverSeed, clientSeed, nonce) → same deck
- **DB transactions**: Use Prisma's `$transaction()` to ensure atomicity (see `gameManager.ts:handleSit`)

## External Dependencies

- **Solana**: `@solana/wallet-adapter-react`, `@solana/web3.js` for wallet integration (Devnet only)
- **Real-time**: Socket.io (v4.7.4 frontend, v4.8.1 backend) with WebSocket transport
- **UI**: Lucide React icons, Recharts for leaderboard/stats visualization
- **Database**: Prisma (v5.10.2) with SQLite backend
- **Router**: React Router v7 for SPA navigation (HashRouter for compatibility)

## Deployment Notes

- **Frontend**: Vite build outputs to `dist/`; served as static assets (use environment variables for production URLs)
- **Backend**: Node.js with ts-node-dev in dev; compile with `npm run build` then `npm start` for production
- **Database**: Commit `server/prisma/schema.prisma` to version control; `.db` file is .gitignored (local-only)
- **Wallet**: Reconfigure `ADMIN_WALLET_ADDRESS` in `constants.ts` and network in `WalletContextProvider.tsx` for production
- **Socket.io**: Ensure backend CORS allows frontend origin; in production set specific origin (not wildcard)

## Development Debugging Tips

- **Debug Socket.io**: Add `socket.onAny((event, ...args) => console.log('SOCKET EVENT:', event, args))` in GameRoom
- **Game state inconsistency**: Check both `utils/pokerGameLogic.ts` (client) and `server/src/utils/pokerGameLogic.ts` match (they're duplicated)
- **Fairness verification**: Logs in `generateProvablyFairDeck()` show deck generation steps; nonce always increments
- **DB issues**: Check `server/prisma/schema.prisma` schema after edits, run `npm run db:push` to apply
- **Wallet connection**: Clear browser localStorage/sessionStorage if wallet state is stuck

---

**When adding features, preserve: (1) Socket.io broadcast pattern for state sync, (2) Prisma transaction atomicity for balance updates, (3) Fairness nonce increments, (4) Immutable game state mutations.**
