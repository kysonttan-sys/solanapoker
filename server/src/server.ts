
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
        const users = await db.user.findMany({
            orderBy: { totalWinnings: 'desc' },
            take: 50,
            select: {
                id: true,
                username: true,
                totalWinnings: true,
                totalHands: true,
                avatarUrl: true
            }
        });
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
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

// 5. Proof endpoint — returns provably-fair data for a table
app.get('/api/proof/:tableId', (req, res) => {
    try {
        const table = gameManager.getTable(req.params.tableId);
        if (!table) return res.status(404).json({ error: 'Table not found' });

        // Return the relevant fairness record and the deck used for the current/last hand
        return res.json({
            tableId: table.tableId,
            handNumber: table.handNumber,
            fairness: table.fairness,
            deck: table.deck || [],
            lastHand: table.lastHand || null
        });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to fetch proof' });
    }
});

// --- Socket.io Events ---
io.on('connection', (socket) => {
    console.log(`[Connect] User connected: ${socket.id}`);

    socket.on('joinTable', ({ tableId, user, config }) => {
        gameManager.handleJoin(socket, tableId, user, config);
    });

    socket.on('sitDown', ({ tableId, user, amount, seatIndex }) => {
        gameManager.handleSit(socket, tableId, user, amount, seatIndex);
    });

    socket.on('playerAction', ({ tableId, action, amount }) => {
        gameManager.handleAction(socket, tableId, action, amount);
    });

    socket.on('sendChatMessage', ({ tableId, message, user }) => {
        io.to(tableId).emit('newChatMessage', { 
            id: Date.now().toString(),
            text: message,
            sender: user.username,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
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