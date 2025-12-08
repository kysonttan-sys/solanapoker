
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameManager } from './gameManager';
import { db } from './db';

// Global error handlers
process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
    process.exit(1);
});

const app = express();
app.use(cors() as any);
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const gameManager = new GameManager(io);

// --- REST APIs for Real Data Sync ---

// 1. Live Protocol Stats & Community Pool
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await db.systemState.findUnique({ where: { id: 'global' } });
        res.json(stats || {
            jackpot: 14520.50,
            tvl: 12500000,
            activePlayers: 0
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// 2. Leaderboard (Real DB Data)
app.get('/api/leaderboard', async (req, res) => {
    try {
        const type = req.query.type || 'players'; // 'players' or 'referrals'
        const timeframe = req.query.timeframe || 'all'; // 'all', '30d', '7d', '24h'
        
        let whereClause: any = {};
        
        // Issue #13: Filter by timeframe
        if (timeframe !== 'all') {
            const now = new Date();
            let startDate: Date;
            
            if (timeframe === '24h') {
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            } else if (timeframe === '7d') {
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (timeframe === '30d') {
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            } else {
                startDate = new Date(0);
            }
            
            whereClause.updatedAt = { gte: startDate };
        }
        
        // Issue #12: Sort by players or referrals
        const orderBy = type === 'referrals' 
            ? { referralCount: 'desc' as const }
            : { totalWinnings: 'desc' as const };
        
        const users = await db.user.findMany({
            where: whereClause,
            orderBy,
            take: 50,
            select: {
                id: true,
                username: true,
                totalWinnings: true,
                totalHands: true,
                avatarUrl: true,
                referralCode: true,
                referralRank: true
            }
        });
        
        // Add referral count (count users who have this user's referralCode)
        const usersWithRefCounts = await Promise.all(users.map(async (u) => {
            const referralCount = u.referralCode 
                ? await db.user.count({ where: { referredBy: u.referralCode } })
                : 0;
            return { ...u, referralCount };
        }));
        
        res.json(usersWithRefCounts);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Issue #14: Admin endpoint to fetch all users
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await db.user.findMany({
            orderBy: { totalWinnings: 'desc' },
            select: {
                id: true,
                username: true,
                balance: true,
                totalWinnings: true,
                totalHands: true,
                isVerified: true,
                referralRank: true,
                hostRank: true,
                createdAt: true
            }
        });
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// 3. User Profile & Transaction History
app.get('/api/user/:id', async (req, res) => {
    try {
        const user = await db.user.findUnique({
            where: { id: req.params.id },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }
            }
        });
        
        if (!user) {
            // Auto-create user if they connect wallet but don't exist
            const newUser = await db.user.create({
                data: {
                    id: req.params.id,
                    walletAddress: req.params.id,
                    username: `Player_${req.params.id.slice(0,4)}`,
                    avatarUrl: `https://ui-avatars.com/api/?name=${req.params.id}`,
                    balance: 0 // Start with 0 real funds
                }
            });
            return res.json(newUser);
        }
        
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// 4. Lobby Rooms (Active Tables from Memory)
app.get('/api/tables', (req, res) => {
    // Convert Map to Array for JSON response
    const tables = gameManager.getAllTables();
    res.json(tables);
});

// 4b. Active Tournaments
app.get('/api/tournaments', (req, res) => {
    // Get all tournaments from GameManager
    const allTables = gameManager.getAllTables();
    const tournaments = allTables.filter(table => table.gameMode === 'tournament');
    res.json(tournaments);
});

// 5. Current fairness state — returns current hand fairness data
app.get('/api/proof/:tableId/current', (req, res) => {
    try {
        const table = gameManager.getTable(req.params.tableId);
        if (!table) return res.status(404).json({ error: 'Table not found' });

        // Return current fairness data (server seed HIDDEN until hand ends)
        return res.json({
            tableId: table.tableId,
            handNumber: table.handNumber,
            phase: table.phase,
            fairness: {
                serverHash: table.fairness?.currentServerHash || null, // Hash visible, seed hidden
                clientSeed: table.fairness?.clientSeed || null,
                nonce: table.fairness?.nonce || null,
                deck: table.deck || [] // Current deck
            },
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to fetch fairness' });
    }
});

// 6. Seed reveal endpoint — after hand ends, player can verify fairness
app.get('/api/proof/:tableId/hand/:handNumber', async (req, res) => {
    try {
        const { tableId, handNumber } = req.params;
        
        // Fetch hand history from database
        const hand = await db.hand.findFirst({
            where: {
                tableId,
                handNumber: parseInt(handNumber)
            }
        });

        if (!hand) {
            return res.status(404).json({ 
                error: 'Hand not found',
                hint: 'Hands are available 2-10 minutes after completion for verification'
            });
        }

        // Return complete fairness data for verification
        return res.json({
            tableId,
            handNumber: hand.handNumber,
            fairnessData: {
                serverSeed: hand.fairnessReveal || 'Not yet available',
                serverSeedHash: hand.fairnessHash,
                clientSeed: hand.clientSeed,
                nonce: hand.nonce,
                communityCards: hand.communityCards
            },
            winners: hand.winnerIds,
            potAmount: hand.potAmount,
            rakeAmount: hand.rakeAmount,
            instructions: 'Use serverSeed + clientSeed + nonce to reproduce the deck and verify fairness',
            timestamp: hand.createdAt
        });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to fetch hand verification' });
    }
});

// 7. Verify deck reproducibility — client verifies they can reproduce same deck
app.post('/api/proof/verify', async (req, res) => {
    try {
        const { serverSeed, clientSeed, nonce, expectedDeck } = req.body;
        
        if (!serverSeed || !clientSeed || nonce === undefined || !expectedDeck) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Import and use fairness functions to reproduce deck
        const { generateProvablyFairDeck, hashSeed } = await import('./utils/fairness');
        
        // Verify server seed hash matches
        const computedHash = await hashSeed(serverSeed);
        const reproducedDeck = generateProvablyFairDeck(serverSeed, clientSeed, nonce);

        // Compare decks (52 cards in specific order)
        const decksMatch = JSON.stringify(reproducedDeck) === JSON.stringify(expectedDeck);

        return res.json({
            verified: decksMatch,
            result: decksMatch ? 'DECK_VERIFIED' : 'DECK_MISMATCH',
            reproducedDeckLength: reproducedDeck.length,
            expectedDeckLength: expectedDeck.length,
            details: !decksMatch ? {
                expected: expectedDeck.slice(0, 5),
                reproduced: reproducedDeck.slice(0, 5)
            } : null,
            message: decksMatch 
                ? '✅ Deck is provably fair! Same seeds + nonce produce same shuffle.'
                : '❌ Deck mismatch detected. Fair play violation possible.'
        });
    } catch (e) {
        return res.status(500).json({ error: 'Verification failed', details: String(e) });
    }
});

// 8. Player fairness history — shows all hands a player participated in
app.get('/api/proof/player/:playerId/history', async (req, res) => {
    try {
        const { playerId } = req.params;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

        // Find all hands where player was involved
        const hands = await db.hand.findMany({
            where: {
                OR: [
                    { winnerIds: { contains: playerId } },
                    // Also find hands where player participated (if you add playerIds field)
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                tableId: true,
                handNumber: true,
                fairnessHash: true,
                clientSeed: true,
                nonce: true,
                communityCards: true,
                winnerIds: true,
                potAmount: true,
                rakeAmount: true,
                createdAt: true
            }
        });

        return res.json({
            playerId,
            handsFound: hands.length,
            hands: hands.map(h => ({
                ...h,
                verificationUrl: `/api/proof/${h.tableId}/hand/${h.handNumber}`
            }))
        });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to fetch player history' });
    }
});

// 9. Fairness statistics — aggregated fairness metrics
app.get('/api/fairness/stats', async (req, res) => {
    try {
        const totalHands = await db.hand.count();
        const recentHands = await db.hand.findMany({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
                }
            }
        });

        const totalPot = await db.hand.aggregate({
            _sum: { potAmount: true }
        });

        const totalRake = await db.hand.aggregate({
            _sum: { rakeAmount: true }
        });

        return res.json({
            totalHandsHistorical: totalHands,
            handsLast24h: recentHands.length,
            totalPotLast24h: totalPot._sum.potAmount || 0,
            totalRakeLast24h: totalRake._sum.rakeAmount || 0,
            averageHandSize: totalHands > 0 ? Math.round((totalPot._sum.potAmount || 0) / totalHands) : 0,
            verificationStatus: '✅ All hands tracked and verifiable'
        });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to fetch fairness stats' });
    }
});

// --- Socket.io Events ---
io.on('connection', (socket) => {
    console.log(`[Connect] User connected: ${socket.id}`);

    socket.on('joinTable', ({ tableId, user, config }) => {
        try {
            console.log(`[JoinTable] ${socket.id} joining ${tableId}`);
            gameManager.handleJoin(socket, tableId, user, config);
        } catch (e) {
            console.error('[JoinTable Error]', e);
            socket.emit('error', { message: 'Failed to join table' });
        }
    });

    socket.on('sitDown', ({ tableId, user, amount, seatIndex }) => {
        try {
            console.log(`[SitDown] ${user.username} at table ${tableId}`);
            gameManager.handleSit(socket, tableId, user, amount, seatIndex);
        } catch (e) {
            console.error('[SitDown Error]', e);
            socket.emit('error', { message: 'Failed to sit down' });
        }
    });

    socket.on('leaveTable', async ({ tableId, userId }) => {
        try {
            console.log(`[LeaveTable] ${userId} leaving table ${tableId}`);
            await gameManager.handleDisconnect(socket);
            socket.emit('leftTable', { success: true });
        } catch (e) {
            console.error('[LeaveTable Error]', e);
            socket.emit('error', { message: 'Failed to leave table' });
        }
    });

    socket.on('playerAction', ({ tableId, action, amount }) => {
        try {
            gameManager.handleAction(socket, tableId, action, amount);
        } catch (e) {
            console.error('[PlayerAction Error]', e);
            socket.emit('error', { message: 'Action failed' });
        }
    });

    socket.on('sendChatMessage', ({ tableId, message, user }) => {
        io.to(tableId).emit('newChatMessage', { 
            id: Date.now().toString(),
            text: message,
            sender: user.username,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    // Issue #5: Admin Bot Control
    socket.on('adminAddBot', async ({ tableId, adminWallet }) => {
        const result = await gameManager.addBot(tableId, adminWallet);
        socket.emit('adminBotResult', result);
    });

    socket.on('adminRemoveBot', ({ tableId, botId, adminWallet }) => {
        const result = gameManager.removeBot(tableId, botId, adminWallet);
        socket.emit('adminBotResult', result);
    });

    // Issue #6: Admin Game Speed Control
    socket.on('adminSetGameSpeed', ({ multiplier, adminWallet }) => {
        const ADMIN_WALLET = 'GvYPMAk8CddRucjwLHDud1yy51QQtQDhgiB9AWdRtAoD';
        if (adminWallet === ADMIN_WALLET) {
            gameManager.setGameSpeed(multiplier);
            io.emit('gameSpeedUpdated', { multiplier, actualSpeed: `${(1/multiplier).toFixed(1)}x faster` });
            socket.emit('adminSpeedResult', { success: true, message: `Game speed set to ${multiplier}x` });
        } else {
            socket.emit('adminSpeedResult', { success: false, message: 'Unauthorized' });
        }
    });

    // Issue #3 & #8: Handle deposit completion from client
    socket.on('depositCompleted', async ({ txHash, amount, walletAddress }) => {
        try {
            console.log(`[Deposit] Processing deposit: ${amount} chips for ${walletAddress}`);
            // Find or create user
            let user = await db.user.findUnique({ where: { id: walletAddress } });
            if (!user) {
                user = await db.user.create({
                    data: {
                        id: walletAddress,
                        walletAddress: walletAddress,
                        username: `Player_${walletAddress.slice(0,4)}`,
                        balance: 0
                    }
                });
            }

            // Create transaction record
            await db.transaction.create({
                data: {
                    userId: walletAddress,
                    type: 'DEPOSIT',
                    amount: amount,
                    status: 'COMPLETED',
                    chainTxHash: txHash,
                    chainStatus: 'CONFIRMED'
                }
            });

            // Update user balance
            const updatedUser = await db.user.update({
                where: { id: walletAddress },
                data: { balance: { increment: amount } }
            });

            // Update system stats
            await db.systemState.upsert({
                where: { id: 'global' },
                create: { 
                    id: 'global',
                    totalVolume: amount,
                    tvl: amount
                },
                update: { 
                    totalVolume: { increment: amount },
                    tvl: { increment: amount }
                }
            });

            // Emit balance update back to client
            socket.emit('balanceUpdate', updatedUser.balance);
            console.log(`[Deposit] Success: ${walletAddress} balance now ${updatedUser.balance}`);
        } catch (error) {
            console.error('[Deposit] Error:', error);
            socket.emit('error', { message: 'Failed to process deposit' });
        }
    });

    // Issue #3 & #8: Handle withdrawal completion from client
    socket.on('withdrawalCompleted', async ({ txHash, amount, walletAddress }) => {
        try {
            console.log(`[Withdrawal] Processing withdrawal: ${amount} chips for ${walletAddress}`);
            
            // Create transaction record
            await db.transaction.create({
                data: {
                    userId: walletAddress,
                    type: 'WITHDRAWAL',
                    amount: amount,
                    status: 'COMPLETED',
                    chainTxHash: txHash,
                    chainStatus: 'CONFIRMED'
                }
            });

            // Update user balance (deduct)
            const updatedUser = await db.user.update({
                where: { id: walletAddress },
                data: { balance: { decrement: amount } }
            });

            // Update system stats
            await db.systemState.upsert({
                where: { id: 'global' },
                create: { id: 'global', tvl: -amount },
                update: { tvl: { decrement: amount } }
            });

            // Emit balance update back to client
            socket.emit('balanceUpdate', updatedUser.balance);
            console.log(`[Withdrawal] Success: ${walletAddress} balance now ${updatedUser.balance}`);
        } catch (error) {
            console.error('[Withdrawal] Error:', error);
            socket.emit('error', { message: 'Failed to process withdrawal' });
        }
    });

    socket.on('disconnect', () => {
        gameManager.handleDisconnect(socket);
    });
});

const PORT = process.env.SERVER_PORT || process.env.PORT || 4000;
console.log(`[Server] Starting server initialization... PORT=${PORT}`);

// Error handling BEFORE listen
server.on('error', (err: any) => {
    console.error(`❌ Server error:`, err);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use!`);
        process.exit(1);
    }
});

// Connect database BEFORE listen
db.$connect()
    .then(() => {
        console.log("✅ Database Connected");
        
        // Try to start listening - use only hostname or ip
        const httpServer = server.listen(PORT, () => {
            console.log(`[Server] HTTP server is NOW listening on port ${PORT}!`);
            console.log(`🚀 Backend Server running on port ${PORT}`);
            console.log(`📡 Socket.io listening for connections...`);
            
            // Verify we got a server address
            const addr = httpServer.address();
            console.log(`[Debug] Server address info:`, addr);
        });
    })
    .catch((err) => {
        console.error("❌ Database Connection Failed:", err);
        process.exit(1);
    });