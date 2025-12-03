# SOLPOKER X - AI Agent Guidelines

## Architecture Overview

**SOLPOKER X** is a decentralized poker platform on Solana with a **monorepo structure** comprising:
- **Frontend**: React 19 + Vite (TypeScript) at `port 3000`
- **Backend**: Express + Socket.io (Node.js) at `port 4000`
- **Database**: SQLite via Prisma ORM (stored in `server/prisma/dev.db`)

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
- **Client → Server**: `socket.emit('joinTable', { tableId, user, config })`, `socket.emit('sitDown', ...)`
- **Server → All players**: `this.io.to(tableId).emit('gameStateUpdate', gameState)`
- **Individual responses**: `socket.emit('error', { message })` or `socket.emit('balanceUpdate', balance)`

**Critical**: Always broadcast state after mutations. Use `this.broadcastState(tableId)` to sync all connected clients.

### Game State Management (`utils/pokerGameLogic.ts` + `server/src/utils/pokerGameLogic.ts`)
- `PokerEngine` class provides pure functions: `initializeGame()`, `playerAction()`, `evaluateWinner()`
- Shared `GameState` interface defines phase (`pre-flop|flop|turn|river|showdown`), pot, players array
- **Duplicated logic**: Client-side logic in `utils/` for UI optimism; server-side in `server/src/utils/` as source of truth
- Hand evaluation via `evaluateHand()` from `handEvaluator.ts` (using standard poker rankings)

### User/Balance Flow
1. **First join**: `db.user.findUnique()` or auto-create with 10,000 welcome bonus (in `gameManager.ts`)
2. **Sit down**: Deduct buy-in via `db.transaction()` → check balance sufficiency → store in game state
3. **Win hand**: Update `db.user.balance` and create `Transaction` record
4. **Emit**: Send `balanceUpdate` event to player immediately

### Fairness System
- **Server seed**: Generated server-side (hidden until hand ends)
- **Client seed**: Generated client-side in GameRoom component (`generateSeed()`)
- **Nonce**: Increments per hand
- **Deck generation**: `generateProvablyFairDeck(serverSeed, clientSeed, nonce)` produces deterministic shuffle
- See `utils/fairness.ts` for SHA-256/HMAC implementation

## File Organization

### Frontend (`/`)
- **`pages/`**: Page-level components (GameRoom, Lobby, Leaderboard, etc.)
- **`components/poker/`**: Core UI: Table, Seat, Card, GameControls
- **`components/ui/`**: Reusable UI: Button, Modal, CaptchaModal
- **`utils/`**: Game logic (pokerGameLogic, handEvaluator, fairness), wallet integration (solanaContract)
- **`hooks/useSocket.ts`**: Socket.io client hook

### Backend (`/server/src/`)
- **`gameManager.ts`**: Socket event handlers + table lifecycle (handles joins, sits, actions, broadcasts)
- **`utils/pokerGameLogic.ts`**: PokerEngine class (game phase transitions, hand evaluation)
- **`utils/fairness.ts`**: Server seed generation + hashing
- **`db.ts`**: Prisma client initialization
- **`server.ts`**: Express app + Socket.io setup + REST endpoints (`/api/stats`, `/api/leaderboard`)

## Type System

### Shared Types (`types.ts`)
- **`User`**: Wallet-based identity with balance, preferences, referral/host ranks, ecosystem stats
- **`PokerTable`**: Configured table instance (blind sizes, seat count, buy-in range)
- **`GameState`** (frontend) vs backend version: Same interface, keep synchronized
- **`PlayerState`**: Position-based seat info (cards hidden for non-actors), bet amount, status

### Backend-Specific (`server/src/utils/pokerGameLogic.ts`)
- `FairnessState`: Server seed, hash, client seed, nonce tracking
- Game mutations always return new `GameState` (immutable pattern)

## Common Pitfalls & Solutions

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Stale game state | Client not listening to broadcasts | Ensure `socket.on('gameStateUpdate', setGameState)` in GameRoom |
| Balance discrepancies | Client-side balance not synced after server transaction | Use `socket.on('balanceUpdate')` + sync DB immediately |
| Deck reproducibility fails | Nonce not incrementing or seed not persisted | Check `FairnessState` in game state before shuffle |
| Phantom wallet not detecting | App not using Devnet | Verify `WalletAdapterNetwork.Devnet` in WalletContextProvider |
| Port conflicts | Multiple npm processes running | Use `npx lsof -i :4000` (macOS) or `netstat -ano` (Windows) |

## Testing Patterns

- **Socket.io mocking**: Use `socket-io-client` in tests; mock GameManager for unit tests
- **Game logic**: Test `PokerEngine` functions in isolation (pure functions)
- **Fairness**: Verify deck determinism: same (serverSeed, clientSeed, nonce) → same deck
- **DB transactions**: Use Prisma's `$transaction()` to ensure atomicity (see `gameManager.ts:handleSit`)

## External Dependencies

- **Solana**: `@solana/wallet-adapter-react`, `@solana/web3.js` for wallet integration (Devnet only)
- **UI**: Lucide icons, Recharts for data visualization
- **Real-time**: Socket.io (v4.7.4) with WebSocket transport forced
- **Database**: Prisma client (v5.10.2) with SQLite backend

## Deployment Notes

- **Frontend**: Vite build outputs to `dist/`; served as static assets
- **Backend**: Node.js with ts-node in dev; build with `npm run build` for production
- **Database**: Commit `schema.prisma` to version control; `.db` file is local-only
- **Wallet**: Reconfigure `ADMIN_WALLET_ADDRESS` in `constants.ts` for production

---

**For clarity on any patterns or decisions, reference the corresponding file path above. When adding features, preserve the Socket.io broadcast pattern and Prisma transaction atomicity.**
